#!/usr/bin/env python3
"""Validate and preview an approved New York licensed dataset before ingestion."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.licensed_import_utils import build_canonical_row, load_field_map, validate_canonical_row, read_rows


def build_validation_report(dataset_path: Path, field_map_path: Path | None = None, preview: int = 5):
    field_map = load_field_map(field_map_path) if field_map_path else {}
    dataset_name = dataset_path.stem
    rows = read_rows(dataset_path)

    normalized_preview = []
    issue_count = 0
    warning_count = 0
    rows_with_issues = []

    for index, row in enumerate(rows, start=1):
        canonical = build_canonical_row(dict(row), field_map, dataset_name, index, default_state="NY")
        result = validate_canonical_row(canonical)
        issue_count += len(result["issues"])
        warning_count += len(result["warnings"])

        if result["issues"]:
            rows_with_issues.append(
                {
                    "row_number": index,
                    "issues": result["issues"],
                    "warnings": result["warnings"],
                    "canonical": canonical,
                }
            )

        if len(normalized_preview) < max(0, preview):
            normalized_preview.append(
                {
                    "row_number": index,
                    "canonical": canonical,
                    "issues": result["issues"],
                    "warnings": result["warnings"],
                }
            )

    return {
        "dataset_path": str(dataset_path),
        "row_count": len(rows),
        "rows_with_issues": len(rows_with_issues),
        "issue_count": issue_count,
        "warning_count": warning_count,
        "preview": normalized_preview,
        "issue_samples": rows_with_issues[:10],
    }


def main():
    parser = argparse.ArgumentParser(description="Validate a New York licensed import dataset without writing to the database.")
    parser.add_argument("dataset_path", help="Path to approved CSV, JSON, or JSONL export.")
    parser.add_argument("--field-map", help="Optional JSON field-map file.")
    parser.add_argument("--preview", type=int, default=5, help="Number of normalized sample rows to print.")
    parser.add_argument("--write-report", help="Optional path to write a JSON validation report.")
    args = parser.parse_args()

    dataset_path = Path(args.dataset_path).resolve()
    if not dataset_path.exists():
        raise FileNotFoundError(dataset_path)

    field_map_path = Path(args.field_map).resolve() if args.field_map else None
    report = build_validation_report(dataset_path, field_map_path=field_map_path, preview=args.preview)

    print(json.dumps(report, indent=2))

    if args.write_report:
        output_path = Path(args.write_report).resolve()
        output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Wrote validation report to {output_path}")


if __name__ == "__main__":
    main()
