"""
Join HCPCS descriptions onto the trauma-core benchmark tables and generate a set
of ready-made review exports for product and analytics work.

Outputs:
1. Enriched overall benchmark CSV
2. Enriched monthly benchmark CSV
3. Top HCPCS by weighted paid per line
4. Top HCPCS by median paid per patient
5. Top HCPCS by total paid
6. Monthly trend table by PI category
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--hcpcs-lookup",
        default=r"C:\Business\Legal\Injury Intelligence\Data\HCPCS_CODE_VALUE.parquet",
        help="HCPCS lookup parquet path",
    )
    parser.add_argument(
        "--overall-input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks-overall.csv",
        help="Overall benchmark input CSV",
    )
    parser.add_argument(
        "--monthly-input",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare\trauma-core-benchmarks-monthly.csv",
        help="Monthly benchmark input CSV",
    )
    parser.add_argument(
        "--output-dir",
        default=r"C:\Business\Legal\Injury Intelligence\Data\Medicare",
        help="Directory for enriched and review exports",
    )
    parser.add_argument(
        "--min-provider-month-rows",
        type=int,
        default=100,
        help="Minimum provider_month_rows for top-HCPCS review tables",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=200,
        help="Number of rows to keep in each top review export",
    )
    return parser.parse_args()


def load_hcpcs_lookup(path: str) -> pd.DataFrame:
    lookup = pd.read_parquet(path)
    lookup = lookup.rename(
        columns={
            "HCPCS_CODE": "hcpcs_code",
            "HCPCS Description": "hcpcs_description",
        }
    )[["hcpcs_code", "hcpcs_description"]]
    lookup["hcpcs_code"] = lookup["hcpcs_code"].astype(str).str.strip().str.upper()
    lookup["hcpcs_description"] = lookup["hcpcs_description"].astype(str).str.strip()

    # Keep the shortest available description per code as a stable label.
    lookup = (
        lookup.sort_values(["hcpcs_code", "hcpcs_description"], key=lambda s: s.str.len())
        .drop_duplicates(subset=["hcpcs_code"], keep="first")
        .reset_index(drop=True)
    )
    return lookup


def add_hcpcs_descriptions(df: pd.DataFrame, lookup: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["hcpcs_code"] = out["hcpcs_code"].astype(str).str.strip().str.upper()
    out = out.merge(lookup, how="left", on="hcpcs_code")
    cols = out.columns.tolist()
    insert_after = cols.index("hcpcs_code") + 1
    reordered = cols[:insert_after] + ["hcpcs_description"] + [c for c in cols[insert_after:] if c != "hcpcs_description"]
    return out[reordered]


def build_top_exports(overall: pd.DataFrame, top_n: int, min_rows: int) -> dict[str, pd.DataFrame]:
    filtered = overall.loc[overall["provider_month_rows"] >= min_rows].copy()

    top_weighted_line = filtered.sort_values(
        ["weighted_paid_per_line", "provider_month_rows"],
        ascending=[False, False],
    ).head(top_n)

    top_median_patient = filtered.sort_values(
        ["median_paid_per_patient", "provider_month_rows"],
        ascending=[False, False],
    ).head(top_n)

    top_total_paid = filtered.sort_values(
        ["total_paid_sum", "provider_month_rows"],
        ascending=[False, False],
    ).head(top_n)

    return {
        "trauma-core-top-hcpcs-weighted-paid-per-line.csv": top_weighted_line,
        "trauma-core-top-hcpcs-median-paid-per-patient.csv": top_median_patient,
        "trauma-core-top-hcpcs-total-paid.csv": top_total_paid,
    }


def build_monthly_trends(monthly: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        monthly.groupby(["claim_from_month", "pi_category"], as_index=False)
        .agg(
            provider_month_rows=("provider_month_rows", "sum"),
            total_paid_sum=("total_paid_sum", "sum"),
            total_claim_lines_sum=("total_claim_lines_sum", "sum"),
            total_patients_sum=("total_patients_sum", "sum"),
        )
        .sort_values(["claim_from_month", "pi_category"])
    )

    grouped["weighted_paid_per_line"] = grouped["total_paid_sum"] / grouped["total_claim_lines_sum"]
    grouped["weighted_paid_per_patient"] = grouped["total_paid_sum"] / grouped["total_patients_sum"]
    return grouped


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    lookup = load_hcpcs_lookup(args.hcpcs_lookup)
    overall = pd.read_csv(args.overall_input)
    monthly = pd.read_csv(args.monthly_input)

    overall_enriched = add_hcpcs_descriptions(overall, lookup)
    monthly_enriched = add_hcpcs_descriptions(monthly, lookup)

    overall_enriched_path = output_dir / "trauma-core-benchmarks-overall-enriched.csv"
    monthly_enriched_path = output_dir / "trauma-core-benchmarks-monthly-enriched.csv"
    overall_enriched.to_csv(overall_enriched_path, index=False)
    monthly_enriched.to_csv(monthly_enriched_path, index=False)

    for filename, df in build_top_exports(
        overall_enriched,
        top_n=args.top_n,
        min_rows=args.min_provider_month_rows,
    ).items():
        df.to_csv(output_dir / filename, index=False)

    monthly_trends = build_monthly_trends(monthly_enriched)
    monthly_trends_path = output_dir / "trauma-core-monthly-trends-by-pi-category.csv"
    monthly_trends.to_csv(monthly_trends_path, index=False)

    summary = {
        "hcpcs_lookup_rows": int(len(lookup)),
        "overall_rows": int(len(overall_enriched)),
        "monthly_rows": int(len(monthly_enriched)),
        "overall_enriched_path": str(overall_enriched_path),
        "monthly_enriched_path": str(monthly_enriched_path),
        "top_n": int(args.top_n),
        "min_provider_month_rows": int(args.min_provider_month_rows),
        "review_exports": [
            "trauma-core-top-hcpcs-weighted-paid-per-line.csv",
            "trauma-core-top-hcpcs-median-paid-per-patient.csv",
            "trauma-core-top-hcpcs-total-paid.csv",
            "trauma-core-monthly-trends-by-pi-category.csv",
        ],
    }
    summary_path = output_dir / "trauma-core-benchmark-review-exports.stats.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
