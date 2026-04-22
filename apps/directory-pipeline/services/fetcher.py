import hashlib
import json
import time
import httpx
import uuid
create_id = lambda: str(uuid.uuid4())[:12]

from config import RATE_LIMIT_DELAY_SECONDS, USER_AGENT
from db import get_conn, _cursor


def fetch_url(url: str, source_id: str, source_name: str, http_method: str = "GET", request_body: str | None = None) -> dict | None:
    """
    Fetch a URL and return response. Does NOT store - caller stores.
    Returns {"html": str | None, "raw_json": str | None, "status": int} or None.
    """
    try:
        with httpx.Client(
            follow_redirects=True,
            timeout=30,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
        ) as client:
            method = (http_method or "GET").upper()
            payload = json.loads(request_body) if request_body else None
            if method == "POST":
                resp = client.post(url, data=payload)
            else:
                resp = client.get(url)

            content_type = (resp.headers.get("content-type") or "").lower()
            raw_json = resp.text if "application/json" in content_type else None
            html = None if raw_json is not None else resp.text
            return {"html": html, "raw_json": raw_json, "status": resp.status_code}
    except Exception as e:
        return {"error": str(e), "status": None}


def store_raw_record(
    source_id: str,
    source_name: str,
    url: str,
    html: str | None = None,
    raw_json: str | None = None,
    fetch_job_id: str = None,
) -> str:
    """Store fetched raw content. Returns record id."""
    record_id = create_id()
    content = raw_json if raw_json is not None else html or ""
    checksum = hashlib.sha256(content.encode("utf-8")).hexdigest()

    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            INSERT INTO raw_records (id, source_id, source_name, source_url, fetch_job_id, raw_html, raw_json, status, checksum)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'stored', %s)
            """,
            (record_id, source_id, source_name, url, fetch_job_id, html, raw_json, checksum),
        )
    return record_id


def run_fetcher(batch_size: int = 10):
    """
    Process pending fetch jobs. Fetches, stores raw content, marks job complete.
    """
    with get_conn() as conn:
        cur = _cursor(conn)
        cur.execute(
            """
            SELECT fj.job_id, fj.source_id, fj.url, fj.http_method, fj.request_body, s.name as source_name
            FROM fetch_jobs fj
            JOIN sources s ON s.source_id = fj.source_id
            WHERE fj.status = 'pending' AND fj.attempts < fj.max_attempts
            ORDER BY fj.priority ASC, fj.created_at ASC
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        )
        jobs = cur.fetchall()

    if not jobs:
        print("No pending fetch jobs.")
        return 0

    processed = 0
    for job in jobs:
        job_id = job["job_id"]
        source_id = job["source_id"]
        url = job["url"]
        http_method = job.get("http_method") or "GET"
        request_body = job.get("request_body")
        source_name = job["source_name"]

        # Mark running
        with get_conn() as conn:
            cur = _cursor(conn)
            cur.execute(
                "UPDATE fetch_jobs SET status = 'running', attempts = attempts + 1, last_attempt_at = now() WHERE job_id = %s",
                (job_id,),
            )

        # Rate limit
        time.sleep(RATE_LIMIT_DELAY_SECONDS)

        result = fetch_url(url, source_id, source_name, http_method=http_method, request_body=request_body)

        if result and ("html" in result or "raw_json" in result):
            record_id = store_raw_record(
                source_id,
                source_name,
                url,
                html=result.get("html"),
                raw_json=result.get("raw_json"),
                fetch_job_id=job_id,
            )
            status = "completed"
            error_msg = None
            resp_code = result.get("status")
            print(f"  Fetched [{http_method}]: {url[:60]}... -> record {record_id[:12]}")
        else:
            status = "failed"
            error_msg = result.get("error", "Unknown error") if result else "No response"
            resp_code = result.get("status") if result else None
            print(f"  Failed [{http_method}]: {url[:60]}... - {error_msg}")

        with get_conn() as conn:
            cur = _cursor(conn)
            cur.execute(
                """
                UPDATE fetch_jobs SET status = %s, error_message = %s, response_code = %s, next_attempt_at = NULL
                WHERE job_id = %s
                """,
                (status, error_msg, resp_code, job_id),
            )

        processed += 1

    return processed
