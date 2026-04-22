#!/usr/bin/env python3
"""Enqueue enrichment jobs for directory, firm website, and specialization stages."""

import sys
from pathlib import Path
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import get_conn, _cursor


def create_id():
    return str(uuid.uuid4())[:12]


JOB_MATRIX = [
    {
        "job_type": "directory_profile_search",
        "where_sql": "1=1",
        "source_url_sql": "COALESCE(a.website, '')",
    },
    {
        "job_type": "firm_website_scan",
        "where_sql": "(a.website IS NOT NULL OR a.firm_name IS NOT NULL)",
        "source_url_sql": "COALESCE(a.website, '')",
    },
    {
        "job_type": "specialty_certification_lookup",
        "where_sql": "(a.bar_state IS NOT NULL OR EXISTS (SELECT 1 FROM attorney_licenses al WHERE al.attorney_id = a.attorney_id))",
        "source_url_sql": "''",
    },
]


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 250
    total_added = 0

    with get_conn() as conn:
        cur = _cursor(conn)

        for spec in JOB_MATRIX:
            cur.execute(
                f"""
                SELECT a.attorney_id, {spec["source_url_sql"]} AS source_url
                  FROM attorneys a
                 WHERE {spec["where_sql"]}
                   AND NOT EXISTS (
                     SELECT 1
                       FROM enrichment_jobs ej
                      WHERE ej.attorney_id = a.attorney_id
                        AND ej.job_type = %s
                        AND ej.status IN ('pending', 'running')
                   )
                 ORDER BY a.updated_at DESC, a.created_at DESC
                 LIMIT %s
                """,
                (spec["job_type"], limit),
            )
            rows = cur.fetchall()

            for row in rows:
                cur.execute(
                    """
                    INSERT INTO enrichment_jobs (job_id, attorney_id, job_type, status, source_url)
                    VALUES (%s, %s, %s, 'pending', %s)
                    """,
                    (create_id(), row["attorney_id"], spec["job_type"], row.get("source_url") or None),
                )
                total_added += 1

            print(f"Queued {len(rows)} jobs for {spec['job_type']}.")

    print(f"Total enrichment jobs queued: {total_added}")


if __name__ == "__main__":
    main()
