"""
Take the NPPES-enriched PI benchmark CSV and keep only trauma-focused provider
specialty buckets that are most useful for plaintiff-side personal injury
medical cost benchmarking.

This script is intentionally a fast post-processing pass over the existing
NPPES-enriched output so we do not need to rerun the expensive national NPPES
join just to tighten specialty selection.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


STRICT_TRAUMA_BUCKETS = {
    "ambulance",
    "body_imaging_radiology",
    "chiropractic",
    "diagnostic_radiology",
    "durable_medical_equipment",
    "emergency_medical_technician",
    "emergency_medicine",
    "interventional_pain_medicine",
    "neurological_surgery",
    "neuroradiology",
    "orthopaedic_sports_medicine",
    "orthopaedic_surgery",
    "pain_medicine",
    "paramedic",
    "physical_medicine_rehab",
    "physical_therapy",
    "spinal_cord_injury_medicine",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark-nppes.csv",
        help="Path to the NPPES-enriched PI benchmark CSV",
    )
    parser.add_argument(
        "--output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark-nppes-strict.csv",
        help="Path for the strict trauma-focused output CSV",
    )
    parser.add_argument(
        "--stats-out",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark-nppes-strict.stats.json",
        help="Path for the strict-filter stats JSON",
    )
    parser.add_argument(
        "--keep-buckets",
        default=",".join(sorted(STRICT_TRAUMA_BUCKETS)),
        help="Comma-separated taxonomy buckets to keep",
    )
    parser.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Optional row cap for testing",
    )
    return parser.parse_args()


def normalize(text: str | None) -> str:
    return (text or "").strip()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    stats_path = Path(args.stats_out)

    keep_buckets = {normalize(v) for v in args.keep_buckets.split(",") if normalize(v)}

    output_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.parent.mkdir(parents=True, exist_ok=True)

    totals: Counter[str] = Counter()
    kept_by_bucket: Counter[str] = Counter()
    dropped_by_bucket: Counter[str] = Counter()
    dropped_by_pi_category: Counter[str] = Counter()

    with input_path.open("r", encoding="utf-8", newline="") as source_file, output_path.open(
        "w", encoding="utf-8", newline=""
    ) as out_file:
        reader = csv.DictReader(source_file)
        if reader.fieldnames is None:
            raise ValueError("Input CSV is missing headers")

        writer = csv.DictWriter(out_file, fieldnames=reader.fieldnames)
        writer.writeheader()

        for row in reader:
            if args.max_rows is not None and totals["rows_read"] >= args.max_rows:
                break

            totals["rows_read"] += 1
            bucket = normalize(row.get("nppes_primary_taxonomy_bucket")) or "missing_bucket"
            pi_category = normalize(row.get("pi_category")) or "missing_pi_category"

            if bucket not in keep_buckets:
                totals["rows_dropped"] += 1
                dropped_by_bucket[bucket] += 1
                dropped_by_pi_category[pi_category] += 1
                continue

            writer.writerow(row)
            totals["rows_kept"] += 1
            kept_by_bucket[bucket] += 1

    summary = {
        "input_path": str(input_path),
        "output_path": str(output_path),
        "rows_read": totals["rows_read"],
        "rows_kept": totals["rows_kept"],
        "rows_dropped": totals["rows_dropped"],
        "keep_buckets": sorted(keep_buckets),
        "kept_by_bucket": dict(kept_by_bucket),
        "dropped_by_bucket": dict(dropped_by_bucket),
        "dropped_by_pi_category": dict(dropped_by_pi_category),
    }
    stats_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
