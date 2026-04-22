"""Shared parser persistence helpers for state bar sources."""

import hashlib
import json
import re
import uuid

from db import get_conn, _cursor

create_id = lambda: str(uuid.uuid4())[:12]

WHITESPACE_RE = re.compile(r"\s+")


def clean_text(value):
    if value is None:
        return None
    cleaned = WHITESPACE_RE.sub(" ", str(value)).strip()
    return cleaned or None


def split_full_name(full_name: str | None) -> tuple[str | None, str | None]:
    name = clean_text(full_name)
    if not name:
        return None, None
    if "," in name:
        last_name, first_name = [clean_text(part) for part in name.split(",", 1)]
        return first_name, last_name
    parts = name.split(" ")
    if len(parts) == 1:
        return parts[0], None
    return " ".join(parts[:-1]), parts[-1]


def make_attorney_id(state_code: str, bar_number: str | None = None, external_key: str | None = None) -> str:
    prefix = (state_code or "us").lower()
    if bar_number:
        safe = re.sub(r"[^a-zA-Z0-9]+", "", str(bar_number))
        if safe:
            return f"{prefix}_{safe}"
    if external_key:
        digest = hashlib.sha1(str(external_key).encode("utf-8")).hexdigest()[:16]
        return f"{prefix}_{digest}"
    return f"{prefix}_{create_id()}"


def _serialize_list(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value)


def _upsert_license(cur, attorney_id: str, state_code: str, attorney: dict, source_id: str, raw_record_id: str):
    bar_number = clean_text(attorney.get("bar_number"))
    if not bar_number:
        return

    cur.execute(
        """
        SELECT license_id
        FROM attorney_licenses
        WHERE attorney_id = %s
          AND jurisdiction_code = %s
          AND bar_number = %s
        LIMIT 1
        """,
        (attorney_id, state_code, bar_number),
    )
    existing = cur.fetchone()

    if existing:
        cur.execute(
            """
            UPDATE attorney_licenses
            SET license_status = COALESCE(%s, license_status),
                admission_date = COALESCE(%s, admission_date),
                source_id = COALESCE(%s, source_id),
                source_url = COALESCE(%s, source_url),
                raw_record_id = COALESCE(%s, raw_record_id),
                updated_at = now()
            WHERE license_id = %s
            """,
            (
                clean_text(attorney.get("license_status")),
                clean_text(attorney.get("admission_date")),
                source_id,
                clean_text(attorney.get("profile_url")) or clean_text(attorney.get("source_url")),
                raw_record_id,
                existing["license_id"],
            ),
        )
        return

    cur.execute(
        """
        INSERT INTO attorney_licenses (
            license_id,
            attorney_id,
            jurisdiction_code,
            bar_number,
            license_status,
            admission_date,
            is_primary,
            source_id,
            source_url,
            raw_record_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, true, %s, %s, %s)
        """,
        (
            create_id(),
            attorney_id,
            state_code,
            bar_number,
            clean_text(attorney.get("license_status")),
            clean_text(attorney.get("admission_date")),
            source_id,
            clean_text(attorney.get("profile_url")) or clean_text(attorney.get("source_url")),
            raw_record_id,
        ),
    )


def _upsert_certifications(cur, attorney_id: str, attorney: dict, source_id: str, state_code: str):
    certifications = attorney.get("certifications") or []
    for certification in certifications:
        name = clean_text(certification)
        if not name:
            continue
        cur.execute(
            """
            SELECT certification_id
            FROM attorney_certifications
            WHERE attorney_id = %s
              AND certification_name = %s
              AND issuing_body = %s
            LIMIT 1
            """,
            (attorney_id, name, source_id),
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                """
                UPDATE attorney_certifications
                SET updated_at = now()
                WHERE certification_id = %s
                """,
                (existing["certification_id"],),
            )
            continue

        cur.execute(
            """
            INSERT INTO attorney_certifications (
                certification_id,
                attorney_id,
                certification_name,
                issuing_body,
                jurisdiction_code,
                source_id,
                source_url,
                confidence
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                create_id(),
                attorney_id,
                name,
                source_id,
                state_code,
                source_id,
                clean_text(attorney.get("profile_url")) or clean_text(attorney.get("source_url")),
                0.9,
            ),
        )


def persist_attorneys_from_record(raw_record_id: str, source_id: str, state_code: str, attorneys: list[dict]) -> int:
    if not attorneys:
        with get_conn() as conn:
            cur = _cursor(conn)
            cur.execute("UPDATE raw_records SET status = 'parsed' WHERE id = %s", (raw_record_id,))
        return 0

    parsed_count = 0
    with get_conn() as conn:
        cur = _cursor(conn)

        for attorney in attorneys:
            full_name = clean_text(attorney.get("full_name")) or "Unknown"
            first_name = clean_text(attorney.get("first_name"))
            last_name = clean_text(attorney.get("last_name"))
            if not first_name and not last_name:
                first_name, last_name = split_full_name(full_name)

            attorney_id = attorney.get("attorney_id") or make_attorney_id(
                state_code,
                bar_number=attorney.get("bar_number"),
                external_key=attorney.get("external_key") or attorney.get("profile_url") or full_name,
            )

            cur.execute(
                """
                INSERT INTO attorneys (
                    attorney_id,
                    first_name,
                    last_name,
                    full_name,
                    bar_number,
                    bar_state,
                    license_status,
                    admission_date,
                    firm_name,
                    phone,
                    email,
                    website,
                    address_1,
                    address_2,
                    city,
                    state,
                    zip,
                    case_type_tags,
                    bio_summary,
                    profile_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'draft')
                ON CONFLICT (attorney_id) DO UPDATE SET
                    first_name = COALESCE(EXCLUDED.first_name, attorneys.first_name),
                    last_name = COALESCE(EXCLUDED.last_name, attorneys.last_name),
                    full_name = COALESCE(EXCLUDED.full_name, attorneys.full_name),
                    bar_number = COALESCE(EXCLUDED.bar_number, attorneys.bar_number),
                    bar_state = COALESCE(EXCLUDED.bar_state, attorneys.bar_state),
                    license_status = COALESCE(EXCLUDED.license_status, attorneys.license_status),
                    admission_date = COALESCE(EXCLUDED.admission_date, attorneys.admission_date),
                    firm_name = COALESCE(EXCLUDED.firm_name, attorneys.firm_name),
                    phone = COALESCE(EXCLUDED.phone, attorneys.phone),
                    email = COALESCE(EXCLUDED.email, attorneys.email),
                    website = COALESCE(EXCLUDED.website, attorneys.website),
                    address_1 = COALESCE(EXCLUDED.address_1, attorneys.address_1),
                    address_2 = COALESCE(EXCLUDED.address_2, attorneys.address_2),
                    city = COALESCE(EXCLUDED.city, attorneys.city),
                    state = COALESCE(EXCLUDED.state, attorneys.state),
                    zip = COALESCE(EXCLUDED.zip, attorneys.zip),
                    case_type_tags = COALESCE(EXCLUDED.case_type_tags, attorneys.case_type_tags),
                    bio_summary = COALESCE(EXCLUDED.bio_summary, attorneys.bio_summary),
                    updated_at = now()
                """,
                (
                    attorney_id,
                    first_name,
                    last_name,
                    full_name,
                    clean_text(attorney.get("bar_number")),
                    state_code,
                    clean_text(attorney.get("license_status")),
                    clean_text(attorney.get("admission_date")),
                    clean_text(attorney.get("firm_name")),
                    clean_text(attorney.get("phone")),
                    clean_text(attorney.get("email")),
                    clean_text(attorney.get("website")),
                    clean_text(attorney.get("address_1")),
                    clean_text(attorney.get("address_2")),
                    clean_text(attorney.get("city")),
                    clean_text(attorney.get("state")),
                    clean_text(attorney.get("zip")),
                    _serialize_list(attorney.get("practice_areas")),
                    clean_text(attorney.get("bio_summary")),
                ),
            )

            cur.execute(
                """
                INSERT INTO raw_record_attorney_links (raw_record_id, attorney_id, link_type)
                VALUES (%s, %s, 'created')
                ON CONFLICT (raw_record_id, attorney_id) DO NOTHING
                """,
                (raw_record_id, attorney_id),
            )

            cur.execute(
                """
                INSERT INTO parse_results (id, raw_record_id, attorney_id, parsed_json, parse_status)
                VALUES (%s, %s, %s, %s, 'success')
                """,
                (create_id(), raw_record_id, attorney_id, json.dumps(attorney)),
            )

            _upsert_license(cur, attorney_id, state_code, attorney, source_id, raw_record_id)
            _upsert_certifications(cur, attorney_id, attorney, source_id, state_code)
            parsed_count += 1

        cur.execute("UPDATE raw_records SET status = 'parsed' WHERE id = %s", (raw_record_id,))

    return parsed_count


def mark_record_failed(raw_record_id: str, error: Exception | str):
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            "UPDATE raw_records SET status = 'failed', parse_error = %s WHERE id = %s",
            (clean_text(error), raw_record_id),
        )
