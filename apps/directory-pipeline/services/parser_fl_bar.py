"""Parser for Florida Bar directory search results."""

import re

from bs4 import BeautifulSoup

from db import get_conn, _cursor
from services.parser_common import clean_text, mark_record_failed, persist_attorneys_from_record

BAR_RE = re.compile(r"Bar #\s*(\d+)", re.I)
PHONE_RE = re.compile(r"(?:Office|Cell):\s*([0-9().\- ]{7,})", re.I)
CITY_STATE_ZIP_RE = re.compile(r"^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$")


def _looks_like_contact_line(value: str) -> bool:
    lower = value.lower()
    return lower.startswith("office:") or lower.startswith("cell:") or lower.startswith("fax:") or "@" in value


def _looks_like_status_line(value: str) -> bool:
    lower = value.lower()
    return (
        "eligible to practice" in lower
        or "not eligible to practice" in lower
        or "good standing" in lower
        or "retired" in lower
        or "delinquent" in lower
        or "suspended" in lower
        or "disciplinary" in lower
    )


def parse_fl_bar_search_page(html: str, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html or "", "html.parser")
    attorneys = []
    seen = set()

    for item in soup.select("li.profile-compact"):
        lines = [clean_text(line) for line in item.get_text("\n", strip=True).splitlines()]
        lines = [line for line in lines if line]
        if not lines:
            continue

        profile_link = item.find("a", href=lambda href: href and "profile/?num=" in href)
        profile_url = clean_text(profile_link.get("href")) if profile_link else None

        text_blob = " ".join(lines)
        bar_match = BAR_RE.search(text_blob)
        bar_number = clean_text(bar_match.group(1)) if bar_match else None
        if bar_number in seen:
            continue
        if bar_number:
            seen.add(bar_number)

        try:
            bar_index = next(index for index, line in enumerate(lines) if "Bar #" in line)
        except StopIteration:
            bar_index = 1 if len(lines) > 1 else 0

        full_name = clean_text(" ".join(lines[:bar_index])) or clean_text(lines[0])
        tail = lines[bar_index + 1 :]

        status_lines = []
        while tail and _looks_like_status_line(tail[0]):
            status_lines.append(tail.pop(0))

        firm_name = None
        if tail and not _looks_like_contact_line(tail[0]) and not CITY_STATE_ZIP_RE.match(tail[0]):
            firm_name = tail.pop(0)

        address_parts = []
        city = state = zip_code = None
        while tail and not _looks_like_contact_line(tail[0]) and not tail[0].startswith("Board Certifications"):
            current = tail.pop(0)
            city_match = CITY_STATE_ZIP_RE.match(current)
            if city_match:
                city = clean_text(city_match.group(1))
                state = clean_text(city_match.group(2))
                zip_code = clean_text(city_match.group(3))
            else:
                address_parts.append(current)

        certifications = []
        if "Board Certifications:" in tail:
            marker_index = tail.index("Board Certifications:")
            certifications = [clean_text(value) for value in tail[marker_index + 1 :] if clean_text(value)]

        attorneys.append(
            {
                "full_name": full_name,
                "bar_number": bar_number,
                "license_status": clean_text(" / ".join(status_lines)),
                "firm_name": clean_text(firm_name),
                "address_1": clean_text(", ".join(address_parts)) if address_parts else None,
                "city": city,
                "state": state,
                "zip": zip_code,
                "phone": clean_text(PHONE_RE.search(text_blob).group(1)) if PHONE_RE.search(text_blob) else None,
                "certifications": certifications,
                "profile_url": profile_url,
                "source_url": source_url,
                "external_key": profile_url or bar_number or full_name,
            }
        )

    return attorneys


def run_parser_fl_bar(batch_size: int = 20):
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT id, source_id, source_url, raw_html
            FROM raw_records
            WHERE status = 'stored'
              AND source_id = 'bar_fl_licensing'
              AND raw_html IS NOT NULL
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        )
        records = cur.fetchall()

    if not records:
        print("No Florida Bar raw records to parse.")
        return 0

    parsed_total = 0
    for record in records:
        try:
            attorneys = parse_fl_bar_search_page(record["raw_html"] or "", record["source_url"])
            parsed_total += persist_attorneys_from_record(record["id"], record["source_id"], "FL", attorneys)
            print(f"  Parsed Florida record {record['id'][:12]}: {len(attorneys)} attorneys")
        except Exception as error:
            mark_record_failed(record["id"], error)
            print(f"  Florida parse error {record['id'][:12]}: {error}")

    return parsed_total
