#!/usr/bin/env python3
"""Seed the national attorney acquisition source registry."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import get_conn, _cursor
from source_registry import all_sources


def main():
    inserted = 0
    updated = 0

    with get_conn() as conn:
        cur = _cursor(conn)

        for source in all_sources():
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
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, %s, %s, %s)
                ON CONFLICT (source_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    source_type = EXCLUDED.source_type,
                    source_family = EXCLUDED.source_family,
                    coverage_scope = EXCLUDED.coverage_scope,
                    jurisdiction_code = EXCLUDED.jurisdiction_code,
                    priority_tier = EXCLUDED.priority_tier,
                    base_url = EXCLUDED.base_url,
                    crawl_method = EXCLUDED.crawl_method,
                    parser_name = EXCLUDED.parser_name,
                    refresh_frequency_days = EXCLUDED.refresh_frequency_days,
                    rate_limit_rpm = EXCLUDED.rate_limit_rpm,
                    robots_respected = EXCLUDED.robots_respected,
                    updated_at = now()
                """,
                (
                    source["source_id"],
                    source["name"],
                    source["source_type"],
                    source["source_family"],
                    source["coverage_scope"],
                    source.get("jurisdiction_code"),
                    source["priority_tier"],
                    source.get("base_url"),
                    source["crawl_method"],
                    source["parser_name"],
                    source["refresh_frequency_days"],
                    source["rate_limit_rpm"],
                    source["robots_respected"],
                ),
            )
            if cur.rowcount == 1:
                inserted += 1
            else:
                updated += 1

    print(f"Seeded national source registry. inserted={inserted} updated={updated}")
    print("Includes: state bars, enrichment directories, firm website resolution, and specialization boards.")


if __name__ == "__main__":
    main()
