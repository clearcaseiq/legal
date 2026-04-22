#!/usr/bin/env python3
"""
Dry run: Fetch CA Bar pages without database. Saves to ./raw_samples/.
Use this to test the pipeline before setting up PostgreSQL.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from config import CA_BAR_SEARCH, RATE_LIMIT_DELAY_SECONDS, USER_AGENT
import time

CITIES = ["Los Angeles", "San Francisco", "Smith"]  # Small sample

def main():
    out_dir = Path(__file__).resolve().parent.parent / "raw_samples"
    out_dir.mkdir(exist_ok=True)
    print(f"Saving to {out_dir}")

    for city in CITIES:
        url = f"{CA_BAR_SEARCH}/QuickSearch?FreeText={city.replace(' ', '+')}"
        print(f"Fetching: {url}")
        time.sleep(RATE_LIMIT_DELAY_SECONDS)
        r = httpx.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
        safe = city.replace(" ", "_").replace(",", "")
        path = out_dir / f"{safe}.html"
        path.write_text(r.text, encoding="utf-8")
        print(f"  Saved {len(r.text)} chars -> {path.name}")

    print("\nParsing sample...")
    from services.parser_ca_bar import parse_ca_bar_search_page
    sample = (out_dir / "Smith.html").read_text(encoding="utf-8")
    attys = parse_ca_bar_search_page(sample, "")
    print(f"  Extracted {len(attys)} attorneys from Smith search")
    for a in attys[:5]:
        print(f"    - {a['full_name']} (bar: {a['bar_number']})")

if __name__ == "__main__":
    main()
