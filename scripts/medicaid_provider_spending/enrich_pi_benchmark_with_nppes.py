"""
Enrich the PI benchmark Medicaid spend extract with NPPES provider details and
keep only providers whose specialty/taxonomy is useful for plaintiff-side
personal injury workflows.

This script is designed to run after filter_pi_benchmark.py.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


PI_TAXONOMY_CODES = {
    "111N00000X": "chiropractic",
    "163W00000X": "registered_nurse",
    "207P00000X": "emergency_medicine",
    "207Q00000X": "family_medicine",
    "207R00000X": "internal_medicine",
    "207T00000X": "neurological_surgery",
    "207X00000X": "orthopaedic_surgery",
    "207XX0004X": "orthopaedic_surgery",
    "207XX0801X": "orthopaedic_surgery",
    "207XX0802X": "orthopaedic_surgery",
    "207XX0005X": "orthopaedic_sports_medicine",
    "207XP3100X": "podiatry",
    "207XS0114X": "spinal_cord_injury_medicine",
    "207YS0012X": "pain_medicine",
    "208100000X": "physical_medicine_rehab",
    "2085B0100X": "body_imaging_radiology",
    "2085N0904X": "neuroradiology",
    "2085R0202X": "diagnostic_radiology",
    "2085U0001X": "diagnostic_ultrasound",
    "2085X0203X": "diagnostic_radiology",
    "208C00000X": "colon_rectal_surgery",
    "208D00000X": "general_practice",
    "208G00000X": "thoracic_surgery",
    "208M00000X": "hospitalist",
    "208VP0014X": "interventional_pain_medicine",
    "208VP0000X": "pain_medicine",
    "225100000X": "physical_therapy",
    "2251C2600X": "physical_therapy",
    "225400000X": "rehabilitation_practitioner",
    "2278E0002X": "emergency_medical_technician",
    "2278P1004X": "paramedic",
    "332B00000X": "durable_medical_equipment",
    "341600000X": "ambulance",
    "343800000X": "transportation",
    "363AM0700X": "medical_physician_assistant",
    "367500000X": "nurse_anesthetist",
}

PI_SPECIALTY_KEYWORDS = {
    "emergency medicine": "emergency_medicine",
    "radiology": "radiology",
    "diagnostic radiology": "diagnostic_radiology",
    "neuroradiology": "neuroradiology",
    "orthopaedic surgery": "orthopaedic_surgery",
    "orthopedic surgery": "orthopaedic_surgery",
    "physical medicine": "physical_medicine_rehab",
    "rehabilitation": "physical_medicine_rehab",
    "pain medicine": "pain_medicine",
    "interventional pain": "interventional_pain_medicine",
    "neurological surgery": "neurological_surgery",
    "neurosurgery": "neurological_surgery",
    "physical therapist": "physical_therapy",
    "physical therapy": "physical_therapy",
    "chiropractor": "chiropractic",
    "ambulance": "ambulance",
    "emergency medical technician": "emergency_medical_technician",
    "paramedic": "paramedic",
    "durable medical equipment": "durable_medical_equipment",
    "orthotic": "durable_medical_equipment",
    "prosthetic": "durable_medical_equipment",
    "sports medicine": "orthopaedic_sports_medicine",
    "spinal cord injury": "spinal_cord_injury_medicine",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--benchmark-input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark.csv",
        help="Filtered PI benchmark CSV from filter_pi_benchmark.py",
    )
    parser.add_argument(
        "--nppes-input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\NPPES_Data_Dissemination_February_2026_V2\npidata_pfile_20050523-20260208.csv",
        help="NPPES core npidata CSV",
    )
    parser.add_argument(
        "--output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark-nppes.csv",
        help="Output CSV path for NPPES-enriched PI benchmark rows",
    )
    parser.add_argument(
        "--stats-out",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark-nppes.stats.json",
        help="JSON stats output path",
    )
    parser.add_argument(
        "--keep-unmatched",
        action="store_true",
        help="Keep benchmark rows even if the provider NPI is not found in NPPES",
    )
    parser.add_argument(
        "--max-benchmark-rows",
        type=int,
        default=None,
        help="Optional limit for testing against the first N benchmark rows",
    )
    return parser.parse_args()


def normalize(text: str | None) -> str:
    return (text or "").strip()


def pick_provider_name(row: dict[str, str]) -> str:
    org_name = normalize(row.get("Provider Organization Name (Legal Business Name)"))
    if org_name:
        return org_name

    parts = [
        normalize(row.get("Provider Name Prefix Text")),
        normalize(row.get("Provider First Name")),
        normalize(row.get("Provider Middle Name")),
        normalize(row.get("Provider Last Name (Legal Name)")),
        normalize(row.get("Provider Name Suffix Text")),
        normalize(row.get("Provider Credential Text")),
    ]
    return " ".join(part for part in parts if part)


def extract_taxonomy_values(row: dict[str, str]) -> tuple[list[str], list[str], str | None]:
    codes: list[str] = []
    groups: list[str] = []
    primary_bucket: str | None = None

    for idx in range(1, 16):
        code = normalize(row.get(f"Healthcare Provider Taxonomy Code_{idx}"))
        if code:
            codes.append(code)
            bucket = PI_TAXONOMY_CODES.get(code)
            if row.get(f"Healthcare Provider Primary Taxonomy Switch_{idx}") == "Y" and bucket:
                primary_bucket = bucket

        group = normalize(row.get(f"Healthcare Provider Taxonomy Group_{idx}"))
        if group:
            groups.append(group)

    return codes, groups, primary_bucket


def infer_specialty_bucket(codes: list[str], groups: list[str], primary_bucket: str | None) -> tuple[str | None, str]:
    if primary_bucket:
        return primary_bucket, "primary_taxonomy_code"

    for code in codes:
        bucket = PI_TAXONOMY_CODES.get(code)
        if bucket:
            return bucket, "taxonomy_code"

    searchable = " | ".join(groups).lower()
    for keyword, bucket in PI_SPECIALTY_KEYWORDS.items():
        if keyword in searchable:
            return bucket, "taxonomy_group_keyword"

    return None, "none"


def load_needed_npis(benchmark_path: Path, max_rows: int | None) -> tuple[set[str], Counter[str]]:
    needed_npis: set[str] = set()
    stats: Counter[str] = Counter()

    with benchmark_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if max_rows is not None and stats["benchmark_rows_read"] >= max_rows:
                break
            stats["benchmark_rows_read"] += 1
            provider_npi = normalize(row.get("provider_npi"))
            if provider_npi:
                needed_npis.add(provider_npi)
            else:
                stats["benchmark_rows_missing_provider_npi"] += 1

    return needed_npis, stats


def load_nppes_map(nppes_path: Path, needed_npis: set[str]) -> tuple[dict[str, dict[str, str]], Counter[str]]:
    matches: dict[str, dict[str, str]] = {}
    stats: Counter[str] = Counter()

    with nppes_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stats["nppes_rows_scanned"] += 1
            npi = normalize(row.get("NPI"))
            if not npi or npi not in needed_npis:
                continue

            codes, groups, primary_bucket = extract_taxonomy_values(row)
            bucket, source = infer_specialty_bucket(codes, groups, primary_bucket)
            if not bucket:
                stats["nppes_matches_not_pi_relevant"] += 1
                continue

            matches[npi] = {
                "nppes_entity_type_code": normalize(row.get("Entity Type Code")),
                "nppes_provider_name": pick_provider_name(row),
                "nppes_practice_city": normalize(row.get("Provider Business Practice Location Address City Name")),
                "nppes_practice_state": normalize(row.get("Provider Business Practice Location Address State Name")),
                "nppes_practice_zip": normalize(row.get("Provider Business Practice Location Address Postal Code")),
                "nppes_primary_taxonomy_bucket": bucket,
                "nppes_taxonomy_match_source": source,
                "nppes_taxonomy_codes": "|".join(codes),
                "nppes_taxonomy_groups": " | ".join(groups),
            }
            stats["nppes_pi_matches"] += 1

    return matches, stats


def main() -> int:
    args = parse_args()
    benchmark_path = Path(args.benchmark_input)
    nppes_path = Path(args.nppes_input)
    output_path = Path(args.output)
    stats_path = Path(args.stats_out)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.parent.mkdir(parents=True, exist_ok=True)

    needed_npis, benchmark_scan_stats = load_needed_npis(benchmark_path, args.max_benchmark_rows)
    nppes_map, nppes_stats = load_nppes_map(nppes_path, needed_npis)

    kept_by_bucket: Counter[str] = Counter()
    dropped_reasons: Counter[str] = Counter()
    final_stats: Counter[str] = Counter()

    out_fields = [
        "provider_npi",
        "provider_npi_source",
        "BILLING_PROVIDER_NPI_NUM",
        "SERVICING_PROVIDER_NPI_NUM",
        "HCPCS_CODE",
        "pi_category",
        "CLAIM_FROM_MONTH",
        "TOTAL_PATIENTS",
        "TOTAL_CLAIM_LINES",
        "TOTAL_PAID",
        "paid_per_line",
        "paid_per_patient",
        "nppes_entity_type_code",
        "nppes_provider_name",
        "nppes_practice_city",
        "nppes_practice_state",
        "nppes_practice_zip",
        "nppes_primary_taxonomy_bucket",
        "nppes_taxonomy_match_source",
        "nppes_taxonomy_codes",
        "nppes_taxonomy_groups",
    ]

    with benchmark_path.open("r", encoding="utf-8", newline="") as source_file, output_path.open(
        "w", encoding="utf-8", newline=""
    ) as out_file:
        reader = csv.DictReader(source_file)
        writer = csv.DictWriter(out_file, fieldnames=out_fields)
        writer.writeheader()

        for row in reader:
            if args.max_benchmark_rows is not None and final_stats["benchmark_rows_processed"] >= args.max_benchmark_rows:
                break
            final_stats["benchmark_rows_processed"] += 1

            provider_npi = normalize(row.get("provider_npi"))
            nppes = nppes_map.get(provider_npi)

            if not nppes:
                if not args.keep_unmatched:
                    dropped_reasons["no_pi_relevant_nppes_match"] += 1
                    continue
                nppes = {
                    "nppes_entity_type_code": "",
                    "nppes_provider_name": "",
                    "nppes_practice_city": "",
                    "nppes_practice_state": "",
                    "nppes_practice_zip": "",
                    "nppes_primary_taxonomy_bucket": "",
                    "nppes_taxonomy_match_source": "",
                    "nppes_taxonomy_codes": "",
                    "nppes_taxonomy_groups": "",
                }

            enriched = dict(row)
            enriched.update(nppes)
            writer.writerow(enriched)

            final_stats["rows_kept"] += 1
            bucket = nppes.get("nppes_primary_taxonomy_bucket") or "unmatched"
            kept_by_bucket[bucket] += 1

    summary = {
        "benchmark_input": str(benchmark_path),
        "nppes_input": str(nppes_path),
        "output_path": str(output_path),
        "rows_requested_from_benchmark": benchmark_scan_stats["benchmark_rows_read"],
        "unique_provider_npis_needed": len(needed_npis),
        "nppes_rows_scanned": nppes_stats["nppes_rows_scanned"],
        "nppes_pi_matches": nppes_stats["nppes_pi_matches"],
        "nppes_matches_not_pi_relevant": nppes_stats["nppes_matches_not_pi_relevant"],
        "rows_kept": final_stats["rows_kept"],
        "benchmark_rows_processed": final_stats["benchmark_rows_processed"],
        "kept_by_taxonomy_bucket": dict(kept_by_bucket),
        "dropped_reasons": dict(dropped_reasons),
        "included_taxonomy_codes": PI_TAXONOMY_CODES,
        "included_taxonomy_keywords": PI_SPECIALTY_KEYWORDS,
        "keep_unmatched": args.keep_unmatched,
    }
    stats_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
