"""
Create slim, product-ready lookup tables from the enriched trauma-core
benchmarks.

These outputs keep only the fields most useful for application logic and model
features, while enforcing a minimum support threshold so tiny code/specialty
groups do not leak into downstream scoring.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


LOOKUP_COLUMNS = [
    "specialty_bucket",
    "pi_category",
    "hcpcs_code",
    "hcpcs_description",
    "provider_month_rows",
    "median_paid_per_line",
    "p90_paid_per_line",
    "weighted_paid_per_line",
    "median_paid_per_patient",
    "p90_paid_per_patient",
    "weighted_paid_per_patient",
]

MONTHLY_LOOKUP_COLUMNS = [
    "claim_from_month",
    *LOOKUP_COLUMNS,
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--overall-input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks-overall-enriched.csv",
        help="Overall enriched benchmark CSV",
    )
    parser.add_argument(
        "--monthly-input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks-monthly-enriched.csv",
        help="Monthly enriched benchmark CSV",
    )
    parser.add_argument(
        "--overall-output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-product-ready-lookup-overall.csv",
        help="Output path for product-ready overall lookup",
    )
    parser.add_argument(
        "--monthly-output",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-product-ready-lookup-monthly.csv",
        help="Output path for product-ready monthly lookup",
    )
    parser.add_argument(
        "--stats-out",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-product-ready-lookup.stats.json",
        help="Stats JSON output path",
    )
    parser.add_argument(
        "--min-provider-month-rows",
        type=int,
        default=100,
        help="Minimum provider_month_rows required to keep a benchmark row",
    )
    return parser.parse_args()


def add_support_band(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["support_band"] = pd.cut(
        out["provider_month_rows"],
        bins=[0, 249, 999, 4999, float("inf")],
        labels=["low", "medium", "high", "very_high"],
        right=True,
    ).astype(str)
    return out


def add_lookup_priority(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["lookup_priority"] = (
        out["provider_month_rows"].rank(method="dense", ascending=False).astype(int)
    )
    return out


def main() -> int:
    args = parse_args()

    overall_input = Path(args.overall_input)
    monthly_input = Path(args.monthly_input)
    overall_output = Path(args.overall_output)
    monthly_output = Path(args.monthly_output)
    stats_output = Path(args.stats_out)

    overall_output.parent.mkdir(parents=True, exist_ok=True)
    monthly_output.parent.mkdir(parents=True, exist_ok=True)
    stats_output.parent.mkdir(parents=True, exist_ok=True)

    overall = pd.read_csv(overall_input)
    monthly = pd.read_csv(monthly_input)

    overall_filtered = overall.loc[
        overall["provider_month_rows"] >= args.min_provider_month_rows,
        LOOKUP_COLUMNS,
    ].copy()
    monthly_filtered = monthly.loc[
        monthly["provider_month_rows"] >= args.min_provider_month_rows,
        MONTHLY_LOOKUP_COLUMNS,
    ].copy()

    overall_filtered = add_support_band(add_lookup_priority(overall_filtered))
    monthly_filtered = add_support_band(add_lookup_priority(monthly_filtered))

    overall_filtered = overall_filtered.sort_values(
        ["lookup_priority", "specialty_bucket", "pi_category", "hcpcs_code"]
    ).reset_index(drop=True)
    monthly_filtered = monthly_filtered.sort_values(
        ["claim_from_month", "lookup_priority", "specialty_bucket", "pi_category", "hcpcs_code"]
    ).reset_index(drop=True)

    overall_filtered.to_csv(overall_output, index=False)
    monthly_filtered.to_csv(monthly_output, index=False)

    summary = {
        "min_provider_month_rows": int(args.min_provider_month_rows),
        "overall_input_rows": int(len(overall)),
        "monthly_input_rows": int(len(monthly)),
        "overall_output_rows": int(len(overall_filtered)),
        "monthly_output_rows": int(len(monthly_filtered)),
        "overall_output": str(overall_output),
        "monthly_output": str(monthly_output),
    }
    stats_output.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
