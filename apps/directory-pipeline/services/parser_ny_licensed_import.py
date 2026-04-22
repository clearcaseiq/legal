"""Parser for approved New York licensed/manual import records."""

import json

from db import get_conn, _cursor
from services.parser_common import clean_text, mark_record_failed, persist_attorneys_from_record


def parse_ny_licensed_record(raw_json: str, source_url: str) -> list[dict]:
    payload = json.loads(raw_json or "{}")
    canonical = payload.get("canonical") or payload

    practice_areas = canonical.get("practice_areas")
    if isinstance(practice_areas, str):
        separators = ["|", ";", ","]
        for separator in separators:
            if separator in practice_areas:
                practice_areas = [clean_text(part) for part in practice_areas.split(separator) if clean_text(part)]
                break
        else:
            practice_areas = [clean_text(practice_areas)] if clean_text(practice_areas) else []

    certifications = canonical.get("certifications")
    if isinstance(certifications, str):
        certifications = [clean_text(part) for part in certifications.replace(";", "|").split("|") if clean_text(part)]

    attorney = {
        "full_name": clean_text(canonical.get("full_name")),
        "first_name": clean_text(canonical.get("first_name")),
        "last_name": clean_text(canonical.get("last_name")),
        "bar_number": clean_text(canonical.get("bar_number")),
        "license_status": clean_text(canonical.get("license_status")),
        "admission_date": clean_text(canonical.get("admission_date")),
        "firm_name": clean_text(canonical.get("firm_name")),
        "phone": clean_text(canonical.get("phone")),
        "email": clean_text(canonical.get("email")),
        "website": clean_text(canonical.get("website")),
        "address_1": clean_text(canonical.get("address_1")),
        "address_2": clean_text(canonical.get("address_2")),
        "city": clean_text(canonical.get("city")),
        "state": clean_text(canonical.get("state")) or "NY",
        "zip": clean_text(canonical.get("zip")),
        "practice_areas": practice_areas or [],
        "certifications": certifications or [],
        "bio_summary": clean_text(canonical.get("bio_summary")),
        "source_url": clean_text(canonical.get("source_url")) or source_url,
        "profile_url": clean_text(canonical.get("profile_url")),
        "external_key": clean_text(canonical.get("external_key")) or clean_text(canonical.get("row_id")) or clean_text(canonical.get("bar_number")),
    }

    return [attorney]


def run_parser_ny_licensed_import(batch_size: int = 20):
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT id, source_id, source_url, raw_json
            FROM raw_records
            WHERE status = 'stored'
              AND source_id = 'bar_ny_licensed_import'
              AND raw_json IS NOT NULL
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        )
        records = cur.fetchall()

    if not records:
        print("No New York licensed-import raw records to parse.")
        return 0

    parsed_total = 0
    for record in records:
        try:
            attorneys = parse_ny_licensed_record(record["raw_json"] or "", record["source_url"])
            parsed_total += persist_attorneys_from_record(record["id"], record["source_id"], "NY", attorneys)
            print(f"  Parsed New York licensed record {record['id'][:12]}: {len(attorneys)} attorneys")
        except Exception as error:
            mark_record_failed(record["id"], error)
            print(f"  New York licensed parse error {record['id'][:12]}: {error}")

    return parsed_total
