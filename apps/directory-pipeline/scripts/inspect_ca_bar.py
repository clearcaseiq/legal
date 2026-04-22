#!/usr/bin/env python3
"""Inspect CA Bar HTML structure."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from bs4 import BeautifulSoup

url = "https://apps.calbar.ca.gov/attorney/LicenseeSearch/QuickSearch?FreeText=Smith"
r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
soup = BeautifulSoup(r.text, "html.parser")

# Find table
table = soup.find("table", id="grid") or soup.find("table", {"class": lambda c: c and "grid" in str(c).lower()}) or soup.find("table")
if table:
    rows = table.find_all("tr")
    print(f"Table rows: {len(rows)}")
    if rows:
        # Header
        ths = rows[0].find_all(["th", "td"])
        print("Columns:", [t.get_text(strip=True) for t in ths])
        # First data row
        if len(rows) > 1:
            tds = rows[1].find_all("td")
            print("First row cells:", [t.get_text(strip=True)[:40] for t in tds])

# Detail links
links = soup.find_all("a", href=lambda h: h and "Detail" in h)
print(f"\nDetail links: {len(links)}")
for a in links[:3]:
    print(f"  {a.get('href')} -> {a.get_text(strip=True)[:50]}")
