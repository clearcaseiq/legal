#!/usr/bin/env python3
"""Seed California attorney detail-page fetch jobs from existing parsed search results."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import _cursor, get_conn

SOURCE_ID = "ca_bar_licensing"


def _detail_job_id(detail_url: str) -> str:
    return f"ca_{hashlib.sha1(detail_url.encode('utf-8')).hexdigest()[:10]}"


def main(limit: int | None = None) -> None:
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT pr.parsed_json
            FROM parse_results pr
            JOIN raw_records rr ON rr.id = pr.raw_record_id
            WHERE rr.source_id = %s
            ORDER BY pr.created_at ASC
            """,
            (SOURCE_ID,),
        )
        rows = cur.fetchall()

    detail_urls: list[str] = []
    seen = set()
    for row in rows:
        payload = row["parsed_json"]
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                continue
        profile_url = (payload or {}).get("profile_url")
        if not profile_url or "/attorney/Licensee/Detail/" not in profile_url:
            continue
        if profile_url in seen:
            continue
        seen.add(profile_url)
        detail_urls.append(profile_url)
        if limit and len(detail_urls) >= limit:
            break

    added = 0
    with get_conn() as conn:
        cur = _cursor(conn)
        for detail_url in detail_urls:
            cur.execute(
                """
                INSERT INTO fetch_jobs (job_id, source_id, url, http_method, request_body, priority, status, next_attempt_at)
                VALUES (%s, %s, %s, 'GET', '', 7, 'pending', now())
                ON CONFLICT (source_id, url, http_method, request_body) DO NOTHING
                """,
                (_detail_job_id(detail_url), SOURCE_ID, detail_url),
            )
            if cur.rowcount > 0:
                added += 1

    print(f"Queued {added} California detail fetch jobs.")


if __name__ == "__main__":
    arg = int(sys.argv[1]) if len(sys.argv) > 1 else None
    main(limit=arg)
