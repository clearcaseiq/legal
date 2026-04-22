#!/usr/bin/env python3
"""
Seed fetch jobs for California State Bar attorney directory.
Run after schema is applied and database is ready.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
create_id = lambda: str(uuid.uuid4())[:12]
from db import get_conn, _cursor
from config import CA_BAR_SEARCH


CA_CITIES = [
    "Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento",
    "Oakland", "Fresno", "Long Beach", "Bakersfield", "Anaheim",
    "Santa Ana", "Riverside", "Stockton", "Irvine", "Chula Vista",
    "Fremont", "San Bernardino", "Modesto", "Fontana", "Santa Clarita",
    "Moreno Valley", "Glendale", "Huntington Beach", "Santa Rosa", "Oceanside",
    "Garden Grove", "Rancho Cucamonga", "Santa Clara", "Ontario", "Elk Grove",
    "Corona", "Pomona", "Salinas", "Pasadena", "Torrance",
    "Hayward", "Escondido", "Sunnyvale", "Palmdale", "Orange",
    "Fullerton", "Thousand Oaks", "Visalia", "Roseville", "Concord",
    "Simi Valley", "Santa Maria", "El Monte", "Berkeley", "Downey",
    "Costa Mesa", "Inglewood", "Carlsbad", "San Buenaventura", "Fairfield",
    "West Covina", "Murrieta", "Richmond", "Norwalk", "Antioch",
    "Temecula", "Burbank", "Daly City", "Rialto", "Santa Maria",
]

# Also search by last name initial to catch attorneys in smaller cities
ALPHABET = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def main():
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            INSERT INTO sources (source_id, name, source_type, base_url, crawl_method, parser_name, active, refresh_frequency_days, rate_limit_rpm)
            VALUES ('ca_bar_licensing', 'California State Bar Licensee Search', 'licensing', %s, 'search_pagination', 'parser_ca_bar', true, 30, 20)
            ON CONFLICT (source_id) DO UPDATE SET updated_at = now()
            """,
            (CA_BAR_SEARCH,),
        )

        source_id = "ca_bar_licensing"
        added = 0

        # City-based search jobs
        for city in CA_CITIES:
            url = f"{CA_BAR_SEARCH}/QuickSearch?FreeText={city.replace(' ', '+')}"
            job_id = create_id()
            try:
                cur.execute(
                    """
                    INSERT INTO fetch_jobs (job_id, source_id, url, http_method, request_body, priority, status, next_attempt_at)
                    VALUES (%s, %s, %s, 'GET', '', 5, 'pending', now())
                    ON CONFLICT (source_id, url, http_method, request_body) DO NOTHING
                    """,
                    (job_id, source_id, url),
                )
                if cur.rowcount > 0:
                    added += 1
            except Exception as e:
                if "unique" not in str(e).lower():
                    print(f"  Skip {city}: {e}")

        # Letter-based search (last name A-Z)
        for letter in ALPHABET:
            url = f"{CA_BAR_SEARCH}/QuickSearch?FreeText={letter}"
            job_id = create_id()
            try:
                cur.execute(
                    """
                    INSERT INTO fetch_jobs (job_id, source_id, url, http_method, request_body, priority, status, next_attempt_at)
                    VALUES (%s, %s, %s, 'GET', '', 6, 'pending', now())
                    ON CONFLICT (source_id, url, http_method, request_body) DO NOTHING
                    """,
                    (job_id, source_id, url),
                )
                if cur.rowcount > 0:
                    added += 1
            except Exception as e:
                if "unique" not in str(e).lower():
                    print(f"  Skip {letter}: {e}")

    print(f"Seeded {added} fetch jobs for California State Bar.")
    print("Run: python -m scripts.run_fetcher")


if __name__ == "__main__":
    main()
