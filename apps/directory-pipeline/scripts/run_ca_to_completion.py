#!/usr/bin/env python3
"""
Drain California State Bar QuickSearch fetch jobs and parse all stored raw HTML.

Writes a JSON checkpoint when both the fetch queue for `ca_bar_licensing` is empty
and there are no remaining `raw_records` with status `stored` for that source.

Usage:
  # PostgreSQL (recommended for production runs)
  set DIRECTORY_PIPELINE_DATABASE_URL=postgresql://user:pass@localhost:5432/directory_pipeline
  python scripts/init_postgres_schema.py
  python scripts/run_ca_to_completion.py --seed --postgres-only

  # SQLite (local smoke test)
  python scripts/init_sqlite.py
  python scripts/run_ca_to_completion.py --seed

Environment: DIRECTORY_PIPELINE_DATABASE_URL (preferred) or DATABASE_URL (or default SQLite file).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import DATABASE_URL
from db import USE_SQLITE, _cursor, get_conn
from services.fetcher import run_fetcher
from services.parser_ca_bar import run_parser_ca_bar

SOURCE_ID = "ca_bar_licensing"
CHECKPOINT_DIR = Path(__file__).resolve().parent.parent / "checkpoints"


def _scalar(conn, sql: str, params: tuple = ()) -> int:
    cur = _cursor(conn)
    cur.execute(sql, params)
    row = cur.fetchone()
    if row is None:
        return 0
    if isinstance(row, dict):
        return int(next(iter(row.values())))
    return int(row[0])


def collect_ca_stats() -> dict:
    with get_conn() as conn:
        pending = _scalar(
            conn,
            "SELECT COUNT(*) FROM fetch_jobs WHERE source_id = %s AND status = 'pending'",
            (SOURCE_ID,),
        )
        running = _scalar(
            conn,
            "SELECT COUNT(*) FROM fetch_jobs WHERE source_id = %s AND status = 'running'",
            (SOURCE_ID,),
        )
        completed = _scalar(
            conn,
            "SELECT COUNT(*) FROM fetch_jobs WHERE source_id = %s AND status = 'completed'",
            (SOURCE_ID,),
        )
        failed = _scalar(
            conn,
            "SELECT COUNT(*) FROM fetch_jobs WHERE source_id = %s AND status = 'failed'",
            (SOURCE_ID,),
        )
        raw_stored = _scalar(
            conn,
            "SELECT COUNT(*) FROM raw_records WHERE source_id = %s AND status = 'stored'",
            (SOURCE_ID,),
        )
        raw_parsed = _scalar(
            conn,
            "SELECT COUNT(*) FROM raw_records WHERE source_id = %s AND status = 'parsed'",
            (SOURCE_ID,),
        )
        raw_failed = _scalar(
            conn,
            "SELECT COUNT(*) FROM raw_records WHERE source_id = %s AND status = 'failed'",
            (SOURCE_ID,),
        )
        attorneys_ca = _scalar(
            conn,
            "SELECT COUNT(*) FROM attorneys WHERE bar_state = 'CA'",
        )
        parse_results = _scalar(
            conn,
            """
            SELECT COUNT(*) FROM parse_results pr
            JOIN raw_records rr ON rr.id = pr.raw_record_id
            WHERE rr.source_id = %s
            """,
            (SOURCE_ID,),
        )

    return {
        "source_id": SOURCE_ID,
        "fetch_jobs_pending": pending,
        "fetch_jobs_running": running,
        "fetch_jobs_completed": completed,
        "fetch_jobs_failed": failed,
        "raw_records_stored": raw_stored,
        "raw_records_parsed": raw_parsed,
        "raw_records_failed": raw_failed,
        "attorneys_bar_state_ca": attorneys_ca,
        "parse_results_for_source": parse_results,
    }


def write_checkpoint(stats: dict, rounds: int) -> Path:
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    payload = {
        "checkpoint_type": "ca_bar_quicksearch_scrape_drained",
        "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "database": "sqlite" if USE_SQLITE else "postgresql",
        "database_url_hint": (DATABASE_URL or "")[:24] + "…" if len(DATABASE_URL or "") > 24 else (DATABASE_URL or ""),
        "rounds_executed": rounds,
        "coverage_note": (
            "Seeded QuickSearch URLs (major cities + A–Z) are a best-effort partition; "
            "they are not a proof of 100% State Bar roster coverage without gap analysis."
        ),
        "stats": stats,
    }
    latest = CHECKPOINT_DIR / "ca_roster_checkpoint.json"
    stamped = CHECKPOINT_DIR / f"ca_roster_checkpoint_{ts}.json"
    for path in (latest, stamped):
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return latest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run CA bar fetch+parse until queue and backlog are drained.")
    parser.add_argument("--seed", action="store_true", help="Run scripts.seed_ca_jobs first (idempotent).")
    parser.add_argument(
        "--postgres-only",
        action="store_true",
        help="Exit unless DIRECTORY_PIPELINE_DATABASE_URL resolves to PostgreSQL (refuses SQLite).",
    )
    parser.add_argument("--fetch-batch", type=int, default=25, metavar="N")
    parser.add_argument("--parse-batch", type=int, default=50, metavar="N")
    parser.add_argument("--max-rounds", type=int, default=2000, metavar="N")
    args = parser.parse_args()

    require_pg = args.postgres_only or os.getenv("DIRECTORY_PIPELINE_REQUIRE_POSTGRES", "").strip() in (
        "1",
        "true",
        "yes",
    )
    if require_pg and USE_SQLITE:
        print(
            "PostgreSQL required: set DIRECTORY_PIPELINE_DATABASE_URL=postgresql://user:pass@host:port/dbname\n"
            "Your shell may set DATABASE_URL=sqlite; DIRECTORY_PIPELINE_DATABASE_URL takes precedence when set.\n"
            "Example: apps/directory-pipeline/.env with DIRECTORY_PIPELINE_DATABASE_URL=...",
            file=sys.stderr,
        )
        sys.exit(2)

    if args.seed:
        import runpy

        print("=== Seeding CA jobs ===")
        runpy.run_path(str(Path(__file__).resolve().parent / "seed_ca_jobs.py"), run_name="__main__")

    rounds = 0
    while rounds < args.max_rounds:
        rounds += 1
        n_fetch = run_fetcher(batch_size=args.fetch_batch)
        n_parse = run_parser_ca_bar(batch_size=args.parse_batch)
        stats = collect_ca_stats()
        print(
            f"Round {rounds}: fetch={n_fetch} parse_attorney_rows={n_parse} | "
            f"pending_jobs={stats['fetch_jobs_pending']} raw_stored={stats['raw_records_stored']} "
            f"attorneys_CA={stats['attorneys_bar_state_ca']}"
        )
        if n_fetch == 0 and n_parse == 0:
            if stats["fetch_jobs_pending"] == 0 and stats["raw_records_stored"] == 0:
                path = write_checkpoint(stats, rounds)
                print(f"CA scrape drained. Checkpoint written: {path}")
                return
            # Idle but inconsistent — e.g. stuck running jobs
            if stats["fetch_jobs_running"] > 0:
                print("Warning: no work this round but fetch jobs still marked running.", file=sys.stderr)
            if stats["raw_records_stored"] > 0:
                print("Warning: no parse progress but raw_records still stored.", file=sys.stderr)

    print("Stopped: max rounds reached without a clean drain.", file=sys.stderr)
    stats = collect_ca_stats()
    write_checkpoint(stats, rounds)
    sys.exit(1)


if __name__ == "__main__":
    main()
