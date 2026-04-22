"""Parser for Texas Bar search result pages."""

import re
from urllib.parse import parse_qs, urljoin, urlsplit

from bs4 import BeautifulSoup

from db import get_conn, _cursor
from services.parser_common import clean_text, mark_record_failed, persist_attorneys_from_record

LOCATION_RE = re.compile(r"Primary Practice Location:\s*(.*?)(?:Practice Areas:|Full profile|$)", re.I)
PRACTICE_RE = re.compile(r"Practice Areas:\s*(.*?)(?:Full profile|$)", re.I)


def parse_tx_bar_search_page(html: str, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html or "", "html.parser")
    attorneys = []
    seen = set()

    for card in soup.select("article.lawyer"):
        profile_link = card.find("a", href=lambda href: href and "MemberDirectoryDetail.cfm" in href)
        profile_url = urljoin("https://www.texasbar.com", profile_link.get("href")) if profile_link else None
        full_text = clean_text(card.get_text(" ", strip=True)) or ""
        if not full_text:
            continue

        name_part = full_text.split("Primary Practice Location:", 1)[0].replace("Full profile", "").strip()
        full_name = clean_text(name_part)
        if not full_name:
            continue

        contact_id = None
        if profile_url:
            query = parse_qs(urlsplit(profile_url).query)
            contact_id = clean_text((query.get("ContactID") or [None])[0])

        if contact_id and contact_id in seen:
            continue
        if contact_id:
            seen.add(contact_id)

        location_text = clean_text(LOCATION_RE.search(full_text).group(1)) if LOCATION_RE.search(full_text) else None
        practice_text = clean_text(PRACTICE_RE.search(full_text).group(1)) if PRACTICE_RE.search(full_text) else None

        city = state = None
        if location_text and "," in location_text:
            city, state = [clean_text(part) for part in location_text.split(",", 1)]

        practice_areas = [clean_text(part) for part in (practice_text or "").split(",") if clean_text(part)]

        attorneys.append(
            {
                "full_name": full_name,
                "city": city,
                "state": state or "TX",
                "practice_areas": practice_areas,
                "bio_summary": location_text,
                "profile_url": profile_url,
                "source_url": source_url,
                "external_key": contact_id or profile_url or full_name,
            }
        )

    return attorneys


def run_parser_tx_bar(batch_size: int = 20):
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT id, source_id, source_url, raw_html
            FROM raw_records
            WHERE status = 'stored'
              AND source_id = 'bar_tx_licensing'
              AND raw_html IS NOT NULL
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        )
        records = cur.fetchall()

    if not records:
        print("No Texas Bar raw records to parse.")
        return 0

    parsed_total = 0
    for record in records:
        try:
            attorneys = parse_tx_bar_search_page(record["raw_html"] or "", record["source_url"])
            parsed_total += persist_attorneys_from_record(record["id"], record["source_id"], "TX", attorneys)
            print(f"  Parsed Texas record {record['id'][:12]}: {len(attorneys)} attorneys")
        except Exception as error:
            mark_record_failed(record["id"], error)
            print(f"  Texas parse error {record['id'][:12]}: {error}")

    return parsed_total
