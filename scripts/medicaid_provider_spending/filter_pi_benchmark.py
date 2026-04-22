"""
Stream the Medicaid provider spending CSV and keep only HCPCS/CPT rows that are
useful as plaintiff-side personal injury medical cost benchmarks.

This script is intentionally streaming-only so it can handle very large source
files. It does not try to infer patient-level injury facts; it only builds a
cleaner benchmark table for likely PI-related treatment categories.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Iterable


ER_EVAL_CODES = {
    "99281",
    "99282",
    "99283",
    "99284",
    "99285",
}

OFFICE_EVAL_CODES = {
    "99202",
    "99203",
    "99204",
    "99205",
    "99211",
    "99212",
    "99213",
    "99214",
    "99215",
}

THERAPY_CODES = {
    "97110",
    "97112",
    "97116",
    "97140",
    "97530",
    "97535",
}

CHIRO_CODES = {
    "98940",
    "98941",
    "98942",
}

AMBULANCE_CODES = {
    "A0380",
    "A0425",
    "A0427",
    "A0429",
    "A0431",
    "A0434",
}

PAIN_INJECTION_CODES = {
    "20552",
    "20553",
    "20610",
    "20611",
    "62322",
    "62323",
    "64483",
    "64484",
    "64493",
    "64494",
    "64495",
}

ORTHO_DME_CODES = {
    "L0450",
    "L0464",
    "L0625",
    "L0631",
    "L0650",
    "L1830",
    "L1832",
    "L1843",
    "L1902",
    "L1971",
    "L3660",
    "L3670",
    "L3908",
    "L3916",
}

# Numeric CPT imaging families that are commonly relevant to trauma / PI work.
IMAGING_RANGES = (
    (70450, 70498),  # CT head / neck
    (70551, 70553),  # MRI brain
    (71045, 71048),  # Chest x-ray
    (72020, 72159),  # Spine x-ray / CT / MRI
    (73030, 73090),  # Shoulder / humerus / elbow / forearm x-ray
    (73100, 73140),  # Wrist / hand x-ray
    (73221, 73223),  # Upper extremity MRI
    (73501, 73590),  # Hip / femur / knee / tib-fib x-ray
    (73600, 73660),  # Ankle / foot x-ray
    (73721, 73723),  # Lower extremity MRI
    (74176, 74178),  # Abdomen / pelvis CT
)

# Strong Medicaid program-noise families for PI benchmarking. Exclude these by
# default because they dominate spend volume without mapping cleanly to injury
# treatment valuation.
EXCLUDED_PREFIXES = (
    "H",
    "S",
    "T",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending.csv",
        help="Path to the source Medicaid provider spending CSV",
    )
    parser.add_argument(
        "--output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark.csv",
        help="Path for the filtered PI benchmark CSV",
    )
    parser.add_argument(
        "--stats-out",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark.stats.json",
        help="Path for a JSON stats summary",
    )
    parser.add_argument(
        "--rejects-out",
        default=None,
        help="Optional CSV path to write rejected rows with reject_reason",
    )
    parser.add_argument(
        "--min-month",
        default=None,
        help="Optional minimum CLAIM_FROM_MONTH in YYYY-MM form, e.g. 2022-01",
    )
    parser.add_argument(
        "--max-month",
        default=None,
        help="Optional maximum CLAIM_FROM_MONTH in YYYY-MM form, e.g. 2024-12",
    )
    parser.add_argument(
        "--min-patients",
        type=int,
        default=20,
        help="Require at least this many patients per provider/code/month row",
    )
    parser.add_argument(
        "--min-claim-lines",
        type=int,
        default=20,
        help="Require at least this many claim lines per provider/code/month row",
    )
    parser.add_argument(
        "--max-paid-per-line",
        type=float,
        default=10000.0,
        help="Drop rows above this paid_per_line sanity cap",
    )
    parser.add_argument(
        "--max-paid-per-patient",
        type=float,
        default=100000.0,
        help="Drop rows above this paid_per_patient sanity cap",
    )
    parser.add_argument(
        "--allow-missing-npi",
        action="store_true",
        help="Keep rows even if both provider NPI fields are blank",
    )
    parser.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Optional limit for testing on the first N source rows",
    )
    return parser.parse_args()


def numeric_in_ranges(code: str, ranges: Iterable[tuple[int, int]]) -> bool:
    if not code.isdigit():
        return False
    value = int(code)
    return any(start <= value <= end for start, end in ranges)


def is_valid_hcpcs(code: str) -> bool:
    return len(code) == 5 and code.isalnum()


def classify_pi_category(code: str) -> str | None:
    if code in ER_EVAL_CODES:
        return "er_eval"
    if code in OFFICE_EVAL_CODES:
        return "office_eval"
    if code in THERAPY_CODES or code in CHIRO_CODES:
        return "pt_ot_chiro"
    if code in AMBULANCE_CODES:
        return "ambulance"
    if code in PAIN_INJECTION_CODES:
        return "pain_injection"
    if code in ORTHO_DME_CODES:
        return "ortho_dme"
    if numeric_in_ranges(code, IMAGING_RANGES):
        return "imaging"
    return None


def month_allowed(month: str, min_month: str | None, max_month: str | None) -> bool:
    if not month:
        return False
    if min_month and month < min_month:
        return False
    if max_month and month > max_month:
        return False
    return True


def reject_reason(
    row: dict[str, str],
    *,
    min_month: str | None,
    max_month: str | None,
    min_patients: int,
    min_claim_lines: int,
    max_paid_per_line: float,
    max_paid_per_patient: float,
    allow_missing_npi: bool,
) -> tuple[str | None, str | None, float | None, float | None]:
    code = (row.get("HCPCS_CODE") or "").strip().upper()
    claim_month = (row.get("CLAIM_FROM_MONTH") or "").strip()
    billing_npi = (row.get("BILLING_PROVIDER_NPI_NUM") or "").strip()
    servicing_npi = (row.get("SERVICING_PROVIDER_NPI_NUM") or "").strip()

    if not is_valid_hcpcs(code):
        return "invalid_hcpcs", None, None, None

    if code.startswith(EXCLUDED_PREFIXES):
        return "excluded_medicaid_prefix", None, None, None

    category = classify_pi_category(code)
    if category is None:
        return "not_pi_relevant_code", None, None, None

    if not month_allowed(claim_month, min_month, max_month):
        return "outside_month_range", category, None, None

    if not allow_missing_npi and not (billing_npi or servicing_npi):
        return "missing_provider_npi", category, None, None

    try:
        total_patients = float(row.get("TOTAL_PATIENTS") or 0)
        total_claim_lines = float(row.get("TOTAL_CLAIM_LINES") or 0)
        total_paid = float(row.get("TOTAL_PAID") or 0)
    except ValueError:
        return "invalid_numeric_field", category, None, None

    if total_patients < min_patients:
        return "too_few_patients", category, None, None
    if total_claim_lines < min_claim_lines:
        return "too_few_claim_lines", category, None, None
    if total_patients <= 0 or total_claim_lines <= 0 or total_paid <= 0:
        return "non_positive_values", category, None, None

    paid_per_line = total_paid / total_claim_lines
    paid_per_patient = total_paid / total_patients

    if paid_per_line > max_paid_per_line:
        return "paid_per_line_outlier", category, paid_per_line, paid_per_patient
    if paid_per_patient > max_paid_per_patient:
        return "paid_per_patient_outlier", category, paid_per_line, paid_per_patient

    return None, category, paid_per_line, paid_per_patient


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    stats_path = Path(args.stats_out)
    rejects_path = Path(args.rejects_out) if args.rejects_out else None

    output_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.parent.mkdir(parents=True, exist_ok=True)
    if rejects_path:
        rejects_path.parent.mkdir(parents=True, exist_ok=True)

    kept_by_category: Counter[str] = Counter()
    rejected_by_reason: Counter[str] = Counter()
    stats: Counter[str] = Counter()

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
    ]

    reject_writer = None
    reject_file = None
    out_file = None

    summary: dict[str, object] = {}

    try:
        out_file = output_path.open("w", encoding="utf-8", newline="")
        writer = csv.DictWriter(out_file, fieldnames=out_fields)
        writer.writeheader()

        if rejects_path:
            reject_file = rejects_path.open("w", encoding="utf-8", newline="")
            reject_writer = csv.DictWriter(
                reject_file,
                fieldnames=[
                    "reject_reason",
                    "BILLING_PROVIDER_NPI_NUM",
                    "SERVICING_PROVIDER_NPI_NUM",
                    "HCPCS_CODE",
                    "CLAIM_FROM_MONTH",
                    "TOTAL_PATIENTS",
                    "TOTAL_CLAIM_LINES",
                    "TOTAL_PAID",
                ],
            )
            reject_writer.writeheader()

        with input_path.open("r", encoding="utf-8", newline="") as source_file:
            reader = csv.DictReader(source_file)
            for row in reader:
                if args.max_rows is not None and stats["rows_read"] >= args.max_rows:
                    break

                stats["rows_read"] += 1

                reason, category, paid_per_line, paid_per_patient = reject_reason(
                    row,
                    min_month=args.min_month,
                    max_month=args.max_month,
                    min_patients=args.min_patients,
                    min_claim_lines=args.min_claim_lines,
                    max_paid_per_line=args.max_paid_per_line,
                    max_paid_per_patient=args.max_paid_per_patient,
                    allow_missing_npi=args.allow_missing_npi,
                )

                if reason:
                    stats["rows_rejected"] += 1
                    rejected_by_reason[reason] += 1
                    if reject_writer:
                        reject_writer.writerow(
                            {
                                "reject_reason": reason,
                                "BILLING_PROVIDER_NPI_NUM": row.get("BILLING_PROVIDER_NPI_NUM"),
                                "SERVICING_PROVIDER_NPI_NUM": row.get("SERVICING_PROVIDER_NPI_NUM"),
                                "HCPCS_CODE": row.get("HCPCS_CODE"),
                                "CLAIM_FROM_MONTH": row.get("CLAIM_FROM_MONTH"),
                                "TOTAL_PATIENTS": row.get("TOTAL_PATIENTS"),
                                "TOTAL_CLAIM_LINES": row.get("TOTAL_CLAIM_LINES"),
                                "TOTAL_PAID": row.get("TOTAL_PAID"),
                            }
                        )
                    continue

                billing_npi = (row.get("BILLING_PROVIDER_NPI_NUM") or "").strip()
                servicing_npi = (row.get("SERVICING_PROVIDER_NPI_NUM") or "").strip()
                provider_npi = servicing_npi or billing_npi
                provider_npi_source = "servicing" if servicing_npi else "billing"

                writer.writerow(
                    {
                        "provider_npi": provider_npi,
                        "provider_npi_source": provider_npi_source,
                        "BILLING_PROVIDER_NPI_NUM": billing_npi,
                        "SERVICING_PROVIDER_NPI_NUM": servicing_npi,
                        "HCPCS_CODE": (row.get("HCPCS_CODE") or "").strip().upper(),
                        "pi_category": category,
                        "CLAIM_FROM_MONTH": (row.get("CLAIM_FROM_MONTH") or "").strip(),
                        "TOTAL_PATIENTS": row.get("TOTAL_PATIENTS"),
                        "TOTAL_CLAIM_LINES": row.get("TOTAL_CLAIM_LINES"),
                        "TOTAL_PAID": row.get("TOTAL_PAID"),
                        "paid_per_line": f"{paid_per_line:.6f}",
                        "paid_per_patient": f"{paid_per_patient:.6f}",
                    }
                )

                stats["rows_kept"] += 1
                kept_by_category[category] += 1

        summary = {
            "input_path": str(input_path),
            "output_path": str(output_path),
            "rejects_path": str(rejects_path) if rejects_path else None,
            "rows_read": stats["rows_read"],
            "rows_kept": stats["rows_kept"],
            "rows_rejected": stats["rows_rejected"],
            "kept_by_category": dict(kept_by_category),
            "rejected_by_reason": dict(rejected_by_reason),
            "filters": {
                "min_month": args.min_month,
                "max_month": args.max_month,
                "min_patients": args.min_patients,
                "min_claim_lines": args.min_claim_lines,
                "max_paid_per_line": args.max_paid_per_line,
                "max_paid_per_patient": args.max_paid_per_patient,
                "allow_missing_npi": args.allow_missing_npi,
                "included_exact_codes": {
                    "er_eval": sorted(ER_EVAL_CODES),
                    "office_eval": sorted(OFFICE_EVAL_CODES),
                    "therapy": sorted(THERAPY_CODES),
                    "chiro": sorted(CHIRO_CODES),
                    "ambulance": sorted(AMBULANCE_CODES),
                    "pain_injection": sorted(PAIN_INJECTION_CODES),
                    "ortho_dme": sorted(ORTHO_DME_CODES),
                },
                "included_numeric_ranges": {
                    "imaging": [f"{start}-{end}" for start, end in IMAGING_RANGES],
                },
                "excluded_prefixes": list(EXCLUDED_PREFIXES),
            },
        }
        stats_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    finally:
        if out_file:
            out_file.close()
        if reject_file:
            reject_file.close()

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
