"""
Aggregate the very-strict trauma-core Medicaid PI benchmark file into reusable
benchmark tables by HCPCS code, specialty bucket, PI category, and month.

Outputs:
1. Monthly benchmark CSV
2. Overall (all months combined) benchmark CSV
3. JSON stats summary

Important: these are provider-month aggregate benchmarks, not patient-level
medical bills. Quantiles are computed across provider-month rows.
"""
from __future__ import annotations

import argparse
import csv
import json
from array import array
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class GroupStats:
    row_count: int = 0
    total_paid_sum: float = 0.0
    total_claim_lines_sum: float = 0.0
    total_patients_sum: float = 0.0
    paid_per_line_sum: float = 0.0
    paid_per_patient_sum: float = 0.0
    paid_per_line_values: array = field(default_factory=lambda: array("d"))
    paid_per_patient_values: array = field(default_factory=lambda: array("d"))

    def add(self, total_paid: float, total_claim_lines: float, total_patients: float, paid_per_line: float, paid_per_patient: float) -> None:
        self.row_count += 1
        self.total_paid_sum += total_paid
        self.total_claim_lines_sum += total_claim_lines
        self.total_patients_sum += total_patients
        self.paid_per_line_sum += paid_per_line
        self.paid_per_patient_sum += paid_per_patient
        self.paid_per_line_values.append(paid_per_line)
        self.paid_per_patient_values.append(paid_per_patient)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\medicaid-provider-spending-pi-benchmark-nppes-very-strict-trauma-core.csv",
        help="Path to the very-strict trauma-core CSV",
    )
    parser.add_argument(
        "--monthly-output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks-monthly.csv",
        help="Output CSV path for monthly benchmarks",
    )
    parser.add_argument(
        "--overall-output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks-overall.csv",
        help="Output CSV path for all-month benchmarks",
    )
    parser.add_argument(
        "--stats-out",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks.stats.json",
        help="JSON stats summary path",
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


def percentile_from_sorted(values: array, pct: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return float(values[0])
    rank = pct * (len(values) - 1)
    lower = int(rank)
    upper = min(lower + 1, len(values) - 1)
    weight = rank - lower
    return float(values[lower] * (1 - weight) + values[upper] * weight)


def summarize_group(stats: GroupStats) -> dict[str, float | int]:
    stats.paid_per_line_values = array("d", sorted(stats.paid_per_line_values))
    stats.paid_per_patient_values = array("d", sorted(stats.paid_per_patient_values))

    weighted_paid_per_line = (
        stats.total_paid_sum / stats.total_claim_lines_sum if stats.total_claim_lines_sum else 0.0
    )
    weighted_paid_per_patient = (
        stats.total_paid_sum / stats.total_patients_sum if stats.total_patients_sum else 0.0
    )

    return {
        "provider_month_rows": stats.row_count,
        "total_paid_sum": round(stats.total_paid_sum, 6),
        "total_claim_lines_sum": round(stats.total_claim_lines_sum, 6),
        "total_patients_sum": round(stats.total_patients_sum, 6),
        "mean_paid_per_line": round(stats.paid_per_line_sum / stats.row_count, 6),
        "median_paid_per_line": round(percentile_from_sorted(stats.paid_per_line_values, 0.50), 6),
        "p90_paid_per_line": round(percentile_from_sorted(stats.paid_per_line_values, 0.90), 6),
        "weighted_paid_per_line": round(weighted_paid_per_line, 6),
        "mean_paid_per_patient": round(stats.paid_per_patient_sum / stats.row_count, 6),
        "median_paid_per_patient": round(percentile_from_sorted(stats.paid_per_patient_values, 0.50), 6),
        "p90_paid_per_patient": round(percentile_from_sorted(stats.paid_per_patient_values, 0.90), 6),
        "weighted_paid_per_patient": round(weighted_paid_per_patient, 6),
    }


def write_rollup_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    monthly_output = Path(args.monthly_output)
    overall_output = Path(args.overall_output)
    stats_path = Path(args.stats_out)

    monthly_output.parent.mkdir(parents=True, exist_ok=True)
    overall_output.parent.mkdir(parents=True, exist_ok=True)
    stats_path.parent.mkdir(parents=True, exist_ok=True)

    monthly_groups: dict[tuple[str, str, str, str], GroupStats] = {}
    overall_groups: dict[tuple[str, str, str], GroupStats] = {}

    counters: Counter[str] = Counter()
    rows_by_bucket: Counter[str] = Counter()
    rows_by_pi_category: Counter[str] = Counter()

    with input_path.open("r", encoding="utf-8", newline="") as source_file:
        reader = csv.DictReader(source_file)
        for row in reader:
            if args.max_rows is not None and counters["rows_read"] >= args.max_rows:
                break

            counters["rows_read"] += 1

            claim_month = normalize(row.get("CLAIM_FROM_MONTH"))
            bucket = normalize(row.get("nppes_primary_taxonomy_bucket"))
            pi_category = normalize(row.get("pi_category"))
            hcpcs_code = normalize(row.get("HCPCS_CODE"))

            try:
                total_paid = float(row.get("TOTAL_PAID") or 0)
                total_claim_lines = float(row.get("TOTAL_CLAIM_LINES") or 0)
                total_patients = float(row.get("TOTAL_PATIENTS") or 0)
                paid_per_line = float(row.get("paid_per_line") or 0)
                paid_per_patient = float(row.get("paid_per_patient") or 0)
            except ValueError:
                counters["rows_with_invalid_numeric_fields"] += 1
                continue

            monthly_key = (claim_month, bucket, pi_category, hcpcs_code)
            overall_key = (bucket, pi_category, hcpcs_code)

            monthly_groups.setdefault(monthly_key, GroupStats()).add(
                total_paid, total_claim_lines, total_patients, paid_per_line, paid_per_patient
            )
            overall_groups.setdefault(overall_key, GroupStats()).add(
                total_paid, total_claim_lines, total_patients, paid_per_line, paid_per_patient
            )

            rows_by_bucket[bucket] += 1
            rows_by_pi_category[pi_category] += 1

    monthly_rows: list[dict[str, object]] = []
    for (claim_month, bucket, pi_category, hcpcs_code), stats in sorted(monthly_groups.items()):
        rec = {
            "claim_from_month": claim_month,
            "specialty_bucket": bucket,
            "pi_category": pi_category,
            "hcpcs_code": hcpcs_code,
        }
        rec.update(summarize_group(stats))
        monthly_rows.append(rec)

    overall_rows: list[dict[str, object]] = []
    for (bucket, pi_category, hcpcs_code), stats in sorted(overall_groups.items()):
        rec = {
            "specialty_bucket": bucket,
            "pi_category": pi_category,
            "hcpcs_code": hcpcs_code,
        }
        rec.update(summarize_group(stats))
        overall_rows.append(rec)

    metric_fields = [
        "provider_month_rows",
        "total_paid_sum",
        "total_claim_lines_sum",
        "total_patients_sum",
        "mean_paid_per_line",
        "median_paid_per_line",
        "p90_paid_per_line",
        "weighted_paid_per_line",
        "mean_paid_per_patient",
        "median_paid_per_patient",
        "p90_paid_per_patient",
        "weighted_paid_per_patient",
    ]

    write_rollup_csv(
        monthly_output,
        monthly_rows,
        ["claim_from_month", "specialty_bucket", "pi_category", "hcpcs_code", *metric_fields],
    )
    write_rollup_csv(
        overall_output,
        overall_rows,
        ["specialty_bucket", "pi_category", "hcpcs_code", *metric_fields],
    )

    summary = {
        "input_path": str(input_path),
        "monthly_output": str(monthly_output),
        "overall_output": str(overall_output),
        "rows_read": counters["rows_read"],
        "rows_with_invalid_numeric_fields": counters["rows_with_invalid_numeric_fields"],
        "monthly_group_count": len(monthly_rows),
        "overall_group_count": len(overall_rows),
        "rows_by_bucket": dict(rows_by_bucket),
        "rows_by_pi_category": dict(rows_by_pi_category),
    }
    stats_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
