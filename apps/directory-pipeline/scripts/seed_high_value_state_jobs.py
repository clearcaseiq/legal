#!/usr/bin/env python3
"""Seed fetch jobs for the first operational high-value state bar sources."""

import argparse
import json
import string
import sys
import uuid
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db import get_conn, _cursor
from source_registry import all_sources

create_id = lambda: str(uuid.uuid4())[:12]
BIGRAMS = [f"{a}{b}" for a in string.ascii_uppercase for b in string.ascii_uppercase]

SUPPORTED_STATES = {
    "FL": "bar_fl_licensing",
    "PA": "bar_pa_licensing",
    "TX": "bar_tx_licensing",
}


def build_fl_jobs(max_pages: int):
    base = "https://www.floridabar.org/directories/find-mbr/"
    for prefix in BIGRAMS:
        for page in range(1, max_pages + 1):
            query = urlencode({"lName": prefix, "pageNumber": page, "pageSize": 50})
            yield {
                "source_id": "bar_fl_licensing",
                "url": f"{base}?{query}",
                "http_method": "GET",
                "request_body": "",
                "priority": 3,
            }


def build_pa_jobs(max_pages: int):
    base = "https://www.padisciplinaryboard.org/api/attorneysearch"
    for prefix in BIGRAMS:
        for page in range(1, max_pages + 1):
            query = urlencode({"last": prefix.lower(), "page": page})
            yield {
                "source_id": "bar_pa_licensing",
                "url": f"{base}?{query}",
                "http_method": "GET",
                "request_body": "",
                "priority": 2,
            }


def build_tx_jobs(max_pages: int):
    url = "https://www.texasbar.com/AM/Template.cfm?Section=Find_A_Lawyer&Template=/CustomSource/MemberDirectory/Result_form_client.cfm"
    for prefix in BIGRAMS:
        for page in range(max_pages):
            yield {
                "source_id": "bar_tx_licensing",
                "url": url,
                "http_method": "POST",
                "request_body": json.dumps(
                    {
                        "Submitted": "1",
                        "Firstname": "",
                        "LastName": prefix,
                        "CompanyName": "",
                        "BarCardNumber": "",
                        "Name": "",
                        "InformalName": "",
                        "PPlCityName": "",
                        "Zip": "",
                        "Region": "",
                        "State": "",
                        "Country": "",
                        "MaxNumber": "25",
                        "ShowPrinter": "1",
                        "FilterName": "",
                        "ShowOnlyTypes": "",
                        "County": "",
                        "BarDistrict": "",
                        "TYLADistrict": "",
                        "SortName": "",
                        "ButtonName": "Next" if page > 0 else "None",
                        "Start": str(page * 25 + 1),
                        "Page": str(page),
                        "Next": str(page * 25 + 26),
                    }
                ),
                "priority": 3,
            }


JOB_BUILDERS = {
    "FL": build_fl_jobs,
    "PA": build_pa_jobs,
    "TX": build_tx_jobs,
}


def ensure_sources(cur, states: list[str]):
    indexed = {source["source_id"]: source for source in all_sources()}
    for state in states:
        source = indexed[SUPPORTED_STATES[state]]
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
                base_url = EXCLUDED.base_url,
                crawl_method = EXCLUDED.crawl_method,
                parser_name = EXCLUDED.parser_name,
                updated_at = now()
            """,
            (
                source["source_id"],
                source["name"],
                source["source_type"],
                source["source_family"],
                source["coverage_scope"],
                source["jurisdiction_code"],
                source["priority_tier"],
                source.get("base_url"),
                source["crawl_method"],
                source["parser_name"],
                source["refresh_frequency_days"],
                source["rate_limit_rpm"],
                source["robots_respected"],
            ),
        )


def main():
    parser = argparse.ArgumentParser(description="Seed high-value state bar fetch jobs.")
    parser.add_argument("--states", nargs="*", default=["FL", "PA", "TX"], choices=sorted(SUPPORTED_STATES.keys()))
    parser.add_argument("--max-pages", type=int, default=3, help="Pages per prefix for GET-based sources.")
    args = parser.parse_args()

    added = 0
    with get_conn() as conn:
        cur = _cursor(conn)
        ensure_sources(cur, args.states)

        for state in args.states:
            for job in JOB_BUILDERS[state](max(1, args.max_pages)):
                cur.execute(
                    """
                    INSERT INTO fetch_jobs (job_id, source_id, url, http_method, request_body, priority, status, next_attempt_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending', now())
                    ON CONFLICT (source_id, url, http_method, request_body) DO NOTHING
                    """,
                    (
                        create_id(),
                        job["source_id"],
                        job["url"],
                        job["http_method"],
                        job["request_body"],
                        job["priority"],
                    ),
                )
                if cur.rowcount > 0:
                    added += 1

    print(f"Seeded {added} fetch jobs across states: {', '.join(args.states)}")
    print("Run: python -m scripts.run_fetcher 25")
    print("Then: python -m scripts.run_parser 50")


if __name__ == "__main__":
    main()
