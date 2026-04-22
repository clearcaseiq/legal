#!/usr/bin/env python3
"""Validate, stage, and parse an approved New York licensed dataset in one command."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.import_ny_licensed_dataset import import_dataset
from scripts.validate_ny_licensed_dataset import build_validation_report
from services.parser_registry import run_registered_parsers


def run_workflow(
    dataset_path: Path,
    field_map_path: Path | None = None,
    source_label: str | None = None,
    preview: int = 5,
    allow_issues: bool = False,
    report_path: Path | None = None,
    allow_duplicates: bool = False,
):
    report = build_validation_report(dataset_path, field_map_path=field_map_path, preview=preview)
    print(json.dumps(report, indent=2))

    if report_path:
        report_path = report_path.resolve()
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Wrote validation report to {report_path}")

    if report["rows_with_issues"] and not allow_issues:
        print("Validation found blocking issues. Import aborted.")
        raise SystemExit(1)

    inserted = import_dataset(
        dataset_path,
        field_map_path=field_map_path,
        source_label=source_label,
        skip_existing=not allow_duplicates,
    )
    parsed = run_registered_parsers(batch_size=inserted, source_ids=["bar_ny_licensed_import"]) if inserted > 0 else 0
    print(f"Completed New York licensed import. staged={inserted} parsed={parsed}")
    return {"report": report, "staged": inserted, "parsed": parsed}


def main():
    parser = argparse.ArgumentParser(description="Run the full New York licensed-import workflow.")
    parser.add_argument("dataset_path", help="Path to approved CSV, JSON, or JSONL export.")
    parser.add_argument("--field-map", help="Optional JSON field-map file.")
    parser.add_argument("--source-label", help="Optional dataset label.")
    parser.add_argument("--preview", type=int, default=5, help="Rows to include in the validation preview.")
    parser.add_argument("--allow-issues", action="store_true", help="Continue even if validation finds blocking issues.")
    parser.add_argument("--report-path", help="Optional JSON report output path.")
    parser.add_argument("--allow-duplicates", action="store_true", help="Stage rows even if the same source_url was already imported.")
    args = parser.parse_args()

    dataset_path = Path(args.dataset_path).resolve()
    field_map_path = Path(args.field_map).resolve() if args.field_map else None

    report_path = Path(args.report_path).resolve() if args.report_path else None
    run_workflow(
        dataset_path,
        field_map_path=field_map_path,
        source_label=args.source_label,
        preview=args.preview,
        allow_issues=args.allow_issues,
        report_path=report_path,
        allow_duplicates=args.allow_duplicates,
    )


if __name__ == "__main__":
    main()
