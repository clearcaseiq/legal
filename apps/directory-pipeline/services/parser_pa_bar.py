"""Parser for Pennsylvania attorney lookup API responses."""

import json

from db import get_conn, _cursor
from services.parser_common import clean_text, mark_record_failed, persist_attorneys_from_record


def parse_pa_bar_response(raw_json: str, source_url: str) -> list[dict]:
    payload = json.loads(raw_json or "{}")
    result = payload.get("result") or {}
    items = result.get("items") or []

    attorneys = []
    for item in items:
        first_name = clean_text(item.get("firstName"))
        middle_name = clean_text(item.get("middleName"))
        last_name = clean_text(item.get("lastName"))
        suffix = clean_text(item.get("suffix"))
        full_name = " ".join(part for part in [first_name, middle_name, last_name, suffix] if part)
        if not full_name:
            full_name = clean_text(item.get("name"))

        address_parts = [clean_text(item.get("line1")), clean_text(item.get("line2")), clean_text(item.get("line3"))]
        attorneys.append(
            {
                "full_name": full_name,
                "first_name": first_name,
                "last_name": last_name,
                "license_status": clean_text(item.get("status")),
                "address_1": clean_text(", ".join(part for part in address_parts if part)) or None,
                "city": clean_text(item.get("city")),
                "state": clean_text(item.get("state")),
                "zip": clean_text(item.get("postalCode")),
                "phone": clean_text(item.get("phone") or item.get("otherPhone")),
                "email": clean_text(item.get("email")),
                "firm_name": clean_text(item.get("employer")),
                "bio_summary": clean_text(item.get("comment")),
                "source_url": source_url,
                "external_key": clean_text(item.get("attorneyId") or item.get("id") or item.get("factoryUrl")),
            }
        )

    return attorneys


def run_parser_pa_bar(batch_size: int = 20):
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT id, source_id, source_url, raw_json
            FROM raw_records
            WHERE status = 'stored'
              AND source_id = 'bar_pa_licensing'
              AND raw_json IS NOT NULL
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        )
        records = cur.fetchall()

    if not records:
        print("No Pennsylvania raw records to parse.")
        return 0

    parsed_total = 0
    for record in records:
        try:
            attorneys = parse_pa_bar_response(record["raw_json"] or "", record["source_url"])
            parsed_total += persist_attorneys_from_record(record["id"], record["source_id"], "PA", attorneys)
            print(f"  Parsed Pennsylvania record {record['id'][:12]}: {len(attorneys)} attorneys")
        except Exception as error:
            mark_record_failed(record["id"], error)
            print(f"  Pennsylvania parse error {record['id'][:12]}: {error}")

    return parsed_total
