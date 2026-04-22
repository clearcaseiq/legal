#!/usr/bin/env python3
"""Stage an approved New York attorney export into raw_records for parser ingestion."""

import argparse
import json
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import get_conn, _cursor
from services.licensed_import_utils import build_canonical_row, load_field_map, read_rows
from services.fetcher import store_raw_record

SOURCE_ID = "bar_ny_licensed_import"
SOURCE_NAME = "New York Attorney Registry Licensed Import"


def ensure_source():
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            INSERT INTO sources (
                source_id,
                name,
                source_type,
                source_family,
                coverage_scope,
                jurisdiction_code,
                priority_tier,
                base_url,
                crawl_method,
                parser_name,
                active,
                refresh_frequency_days,
                rate_limit_rpm,
                robots_respected
            )
            VALUES (%s, %s, 'licensing', 'licensed_import', 'state', 'NY', 1, NULL, 'file_import', 'parser_ny_licensed_import', true, 30, 5, true)
            ON CONFLICT (source_id) DO UPDATE SET
                name = EXCLUDED.name,
                source_family = EXCLUDED.source_family,
                crawl_method = EXCLUDED.crawl_method,
                parser_name = EXCLUDED.parser_name,
                updated_at = now()
            """,
            (SOURCE_ID, SOURCE_NAME),
        )


def source_row_exists(source_url: str):
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT 1
            FROM raw_records
            WHERE source_id = %s AND source_url = %s
            LIMIT 1
            """,
            (SOURCE_ID, source_url),
        )
        return cur.fetchone() is not None


def import_dataset(dataset_path: Path, field_map_path: Path | None = None, source_label: str | None = None, skip_existing: bool = True):
    field_map = load_field_map(field_map_path) if field_map_path else {}
    dataset_name = source_label or dataset_path.stem
    rows = read_rows(dataset_path)

    ensure_source()

    inserted = 0
    skipped = 0
    for index, row in enumerate(rows, start=1):
        canonical = build_canonical_row(dict(row), field_map, dataset_name, index)
        payload = {
            "import_meta": {
                "dataset_name": dataset_name,
                "dataset_path": str(dataset_path),
                "row_number": index,
            },
            "canonical": canonical,
            "raw": row,
        }
        source_url = canonical.get("source_url") or f"licensed-import://ny/{dataset_name}/{index}"
        if skip_existing and source_row_exists(source_url):
            skipped += 1
            continue
        store_raw_record(
            SOURCE_ID,
            SOURCE_NAME,
            source_url,
            raw_json=json.dumps(payload),
        )
        inserted += 1

    print(f"Staged {inserted} New York licensed records from {dataset_path.name}")
    if skipped:
        print(f"Skipped {skipped} already staged records.")
    print("Next: python -m scripts.run_parser 200 bar_ny_licensed_import")
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Stage an approved New York attorney dataset into raw_records.")
    parser.add_argument("dataset_path", help="Path to approved CSV, JSON, or JSONL export.")
    parser.add_argument("--field-map", help="Optional JSON file mapping canonical field names to source column names.")
    parser.add_argument("--source-label", help="Optional label for this approved dataset.")
    parser.add_argument("--allow-duplicates", action="store_true", help="Stage rows even if the same source_url was already imported.")
    args = parser.parse_args()

    dataset_path = Path(args.dataset_path).resolve()
    if not dataset_path.exists():
        raise FileNotFoundError(dataset_path)

    field_map_path = Path(args.field_map).resolve() if args.field_map else None
    import_dataset(
        dataset_path,
        field_map_path=field_map_path,
        source_label=args.source_label,
        skip_existing=not args.allow_duplicates,
    )


if __name__ == "__main__":
    main()
