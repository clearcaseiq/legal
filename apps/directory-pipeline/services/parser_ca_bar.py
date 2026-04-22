"""Parser for California State Bar search and detail pages."""
import datetime as dt
import hashlib
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from db import _cursor, get_conn
from services.parser_common import clean_text, mark_record_failed, persist_attorneys_from_record

CA_BAR_BASE = "https://apps.calbar.ca.gov"
DETAIL_URL_RE = re.compile(r"/attorney/Licensee/Detail/\d{5,8}")
DETAIL_BLOCK_RE = re.compile(r"/attorney/Licensee/Detail/(\d{5,8})")
NOT_AVAILABLE = {"not available", "none reported", "none", ""}


def _extract_block(html: str, start_marker: str, end_marker: str) -> str:
    if not html:
        return ""
    start = html.find(start_marker)
    if start == -1:
        return ""
    end = html.find(end_marker, start)
    if end == -1:
        end = len(html)
    return html[start:end]


def _fragment_text(fragment: str) -> str | None:
    return clean_text(BeautifulSoup(fragment or "", "html.parser").get_text(" ", strip=True))


def _clean_optional(value: str | None) -> str | None:
    cleaned = clean_text(value)
    if not cleaned:
        return None
    return None if cleaned.lower() in NOT_AVAILABLE else cleaned


def _extract_labeled_html(block: str, label: str, terminator: str | None = "</p>") -> str | None:
    if not block:
        return None
    pattern = rf"{re.escape(label)}\s*(.*?){re.escape(terminator) if terminator else '$'}"
    match = re.search(pattern, block, re.I | re.S)
    if not match:
        return None
    return _fragment_text(match.group(1))


def _parse_mmddyyyy(value: str | None) -> str | None:
    cleaned = clean_text(value)
    if not cleaned:
        return None
    try:
        return dt.datetime.strptime(cleaned, "%m/%d/%Y").date().isoformat()
    except ValueError:
        return cleaned


def _split_address(address_line: str | None) -> dict:
    value = _clean_optional(address_line)
    if not value:
        return {}

    parts = [clean_text(part) for part in value.split(",") if clean_text(part)]
    first_street_index = next((idx for idx, part in enumerate(parts) if re.match(r"^\d", part or "")), None)
    firm_name = None
    street_parts = parts[:]
    if first_street_index and first_street_index > 0:
        firm_name = clean_text(" ".join(parts[:first_street_index]))
        street_parts = parts[first_street_index:]

    city = state = zip_code = None
    address_1 = clean_text(", ".join(street_parts)) if street_parts else None
    if len(street_parts) >= 3:
        address_1 = clean_text(", ".join(street_parts[:-2])) or street_parts[0]
        city = street_parts[-2]
        state_zip = street_parts[-1]
        state_zip_match = re.match(r"([A-Z]{2})\s+(.+)$", state_zip or "")
        if state_zip_match:
            state = state_zip_match.group(1)
            zip_code = clean_text(state_zip_match.group(2))
        else:
            state = clean_text(state_zip)

    return {
        "firm_name": _clean_optional(firm_name),
        "address_1": _clean_optional(address_1),
        "city": _clean_optional(city),
        "state": _clean_optional(state),
        "zip": _clean_optional(zip_code),
    }


def _parse_email(profile_block: str) -> str | None:
    if not profile_block:
        return None
    match = re.search(r"Email:\s*(.*?)\s*&nbsp;\|&nbsp;", profile_block, re.I | re.S)
    if not match:
        return None
    fragment = match.group(1)
    if re.search(r'id="e\d+"', fragment):
        return None
    return _clean_optional(_fragment_text(fragment))


def _parse_more_about_section(html: str) -> dict:
    block = _extract_block(html, "<!-- End: Profile Info -->", "<!-- Start: Combined Status")
    text = _fragment_text(block) or ""
    practice_match = re.search(
        r"Self-Reported Practice Areas:\s*(.*?)\s*Additional Languages Spoken:",
        text,
        re.I | re.S,
    )
    law_school_match = re.search(r"Law School:\s*(.*)$", text, re.I | re.S)
    languages_match = re.search(
        r"Additional Languages Spoken:\s*(.*?)\s*Law School:",
        text,
        re.I | re.S,
    )
    return {
        "practice_areas_text": _clean_optional(practice_match.group(1) if practice_match else None),
        "languages_text": _clean_optional(languages_match.group(1) if languages_match else None),
        "law_school": _clean_optional(law_school_match.group(1) if law_school_match else None),
    }


def _parse_admission_date(soup: BeautifulSoup) -> str | None:
    for table in soup.select("table"):
        rows = []
        for tr in table.select("tr"):
            cells = [clean_text(cell.get_text(" ", strip=True)) for cell in tr.select("th,td")]
            rows.append([cell for cell in cells if cell])
        if not rows:
            continue
        header = " | ".join(rows[0])
        if "Date" not in header or "License Status" not in header:
            continue
        for row in rows[1:]:
            if len(row) >= 2 and "Admitted to the State Bar of California" in " ".join(row[1:]):
                return _parse_mmddyyyy(row[0])
    return None


def _detail_job_id(detail_url: str) -> str:
    return f"ca_{hashlib.sha1(detail_url.encode('utf-8')).hexdigest()[:10]}"


def parse_ca_bar_search_page(html: str, source_url: str) -> list[dict]:
    """Parse CA Bar search results page."""
    soup = BeautifulSoup(html, "html.parser")
    attorneys = []
    seen = set()

    for link in soup.select('a[href*="/attorney/Licensee/Detail/"]'):
        name = clean_text(link.get_text(" ", strip=True))
        href = clean_text(link.get("href"))
        bar_match = DETAIL_BLOCK_RE.search(href or "")
        bar_num = bar_match.group(1) if bar_match else None
        if not name or len(name) < 3:
            continue
        key = bar_num or name
        if key in seen:
            continue
        seen.add(key)
        profile_url = urljoin(CA_BAR_BASE, href or "")
        attorneys.append(
            {
                "full_name": name,
                "bar_number": bar_num,
                "profile_url": profile_url,
                "source_url": source_url,
                "external_key": profile_url or name,
            }
        )

    return attorneys


def parse_ca_bar_detail_page(html: str, source_url: str) -> list[dict]:
    """Parse an individual California attorney detail page."""
    soup = BeautifulSoup(html, "html.parser")
    bar_match = DETAIL_BLOCK_RE.search(source_url or "")
    bar_number = bar_match.group(1) if bar_match else None

    header_block = _extract_block(html, "<!-- Begin: Name and status -->", "<!-- End: Name and status -->")
    header_soup = BeautifulSoup(header_block or html, "html.parser")
    header_text = clean_text(header_soup.get_text(" ", strip=True)) or ""

    name_match = re.search(r"License Status:", header_text)
    name_text = header_text[: name_match.start()] if name_match else header_text
    full_name = clean_text(re.sub(r"#\s*\d{5,8}", "", name_text))

    status_fragment = _extract_labeled_html(header_block, "License Status:", "</p>")
    license_status = _clean_optional(status_fragment)

    profile_block = _extract_block(html, "<!-- Begin: Profile Info -->", "<!-- End: Profile Info -->")
    address_line = _extract_labeled_html(profile_block, "Address:", "</p>")
    phone = _clean_optional(_extract_labeled_html(profile_block, "Phone:", "&nbsp;|&nbsp;"))
    fax = _clean_optional(_extract_labeled_html(profile_block, "Fax:", "</p>"))
    email = _parse_email(profile_block)
    website = _clean_optional(_extract_labeled_html(profile_block, "Website:", "</p>"))

    website_match = re.search(r"var memberWebsite = '([^']*)'", html)
    if website_match and _clean_optional(website_match.group(1)):
        website = _clean_optional(website_match.group(1))

    extra = _parse_more_about_section(html)
    admission_date = _parse_admission_date(soup)
    address = _split_address(address_line)

    attorney = {
        "full_name": full_name,
        "bar_number": bar_number,
        "license_status": license_status,
        "phone": phone,
        "fax": fax,
        "email": email,
        "website": website,
        "admission_date": admission_date,
        "law_school": extra.get("law_school"),
        "practice_areas_text": extra.get("practice_areas_text"),
        "languages_text": extra.get("languages_text"),
        "profile_url": source_url,
        "source_url": source_url,
        "external_key": source_url or full_name,
    }
    attorney.update(address)
    return [attorney]


def _enqueue_detail_jobs(source_id: str, attorneys: list[dict]) -> int:
    detail_urls = sorted(
        {
            clean_text(attorney.get("profile_url"))
            for attorney in attorneys
            if DETAIL_URL_RE.search(attorney.get("profile_url") or "")
        }
    )
    if not detail_urls:
        return 0

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
                (_detail_job_id(detail_url), source_id, detail_url),
            )
            if cur.rowcount > 0:
                added += 1
    return added


def run_parser_ca_bar(batch_size: int = 20):
    """Parse CA search/detail pages and persist attorney records."""
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT rr.id, rr.source_id, rr.source_name, rr.source_url, rr.raw_html
            FROM raw_records rr
            JOIN sources s ON s.source_id = rr.source_id
            WHERE rr.status = 'stored' AND rr.raw_html IS NOT NULL
              AND s.source_id = 'ca_bar_licensing'
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        )
        records = cur.fetchall()

    if not records:
        print("No raw records to parse.")
        return 0

    parsed_count = 0
    for record in records:
        raw_record_id = record["id"]
        source_id = record["source_id"]
        source_url = record["source_url"]
        html = record["raw_html"] or ""
        try:
            if DETAIL_URL_RE.search(source_url or ""):
                attorneys = parse_ca_bar_detail_page(html, source_url)
            else:
                attorneys = parse_ca_bar_search_page(html, source_url)
                detail_added = _enqueue_detail_jobs(source_id, attorneys)
                if detail_added:
                    print(f"  Queued {detail_added} CA detail jobs from {raw_record_id[:12]}")
            parsed = persist_attorneys_from_record(raw_record_id, source_id, "CA", attorneys)
            parsed_count += parsed
            print(f"  Parsed {raw_record_id[:12]}: {parsed} attorneys")
        except Exception as exc:
            mark_record_failed(raw_record_id, exc)
            print(f"  Parse error {raw_record_id}: {exc}")

    return parsed_count
