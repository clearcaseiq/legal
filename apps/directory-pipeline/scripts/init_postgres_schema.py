#!/usr/bin/env python3
"""
Create the directory_pipeline database (if missing) and apply schema.sql.

Requires DIRECTORY_PIPELINE_DATABASE_URL=postgresql://user:pass@host:port/dbname
Uses psql -f for schema.sql so PL/pgSQL $$ blocks apply correctly.

Does not drop existing data. If tables already exist, psql may error — use a fresh DB
or drop/recreate the database first.
"""
from __future__ import annotations

import os
import shlex
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlparse, urlunparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import DATABASE_URL


def _maintenance_dsn(target: str) -> str:
    """Same server/credentials, but connect to maintenance DB `postgres`."""
    p = urlparse(target)
    return urlunparse(
        (
            p.scheme,
            p.netloc,
            "/postgres",
            p.params,
            p.query,
            p.fragment,
        )
    )


def _normalized_dsn(target: str) -> str:
    """Drop URI query params unsupported by psycopg2/psql workflows."""
    parsed = urlparse(target)
    query = [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True) if key != "schema"]
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, "&".join(f"{k}={v}" for k, v in query), parsed.fragment))


def _psql_command(target: str, schema_path: Path) -> tuple[list[str], dict]:
    """Build a psql invocation from a PostgreSQL URL."""
    parsed = urlparse(_normalized_dsn(target))
    dbname = (parsed.path or "").lstrip("/") or "postgres"
    cmd = [
        os.environ.get("PSQL_EXE") or "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        parsed.hostname or "localhost",
        "-p",
        str(parsed.port or 5432),
        "-U",
        parsed.username or "",
        "-d",
        dbname,
        "-f",
        str(schema_path),
    ]
    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = parsed.password
    return cmd, env


def ensure_database(admin_url: str, dbname: str) -> None:
    import psycopg2
    from psycopg2 import sql as psql
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    conn = psycopg2.connect(admin_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
    if cur.fetchone() is None:
        cur.execute(
            psql.SQL("CREATE DATABASE {} WITH TEMPLATE template0 ENCODING 'UTF8'").format(
                psql.Identifier(dbname)
            )
        )
        print(f"Created database {dbname!r}.")
    else:
        print(f"Database {dbname!r} already exists.")
    cur.close()
    conn.close()


def main() -> None:
    target = (os.environ.get("DIRECTORY_PIPELINE_DATABASE_URL") or DATABASE_URL or "").strip()
    if not target.lower().startswith("postgresql"):
        print(
            "Set DIRECTORY_PIPELINE_DATABASE_URL to a PostgreSQL URL, e.g.\n"
            "  DIRECTORY_PIPELINE_DATABASE_URL=postgresql://user:pass@localhost:5432/directory_pipeline",
            file=sys.stderr,
        )
        sys.exit(2)

    parsed = urlparse(target)
    dbname = (parsed.path or "").lstrip("/") or "directory_pipeline"
    if not dbname:
        print("Database name missing from URL path.", file=sys.stderr)
        sys.exit(2)

    admin = _maintenance_dsn(target)
    ensure_database(admin, dbname)

    root = Path(__file__).resolve().parent.parent
    schema_path = root / "schema.sql"
    if not schema_path.is_file():
        print(f"Missing {schema_path}", file=sys.stderr)
        sys.exit(2)

    import shutil

    psql = os.environ.get("PSQL_EXE") or shutil.which("psql")
    if not psql and os.path.isfile(r"C:\Program Files\PostgreSQL\16\bin\psql.exe"):
        psql = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if not psql:
        print("Install psql (PostgreSQL client) or set PSQL_EXE to psql.exe path.", file=sys.stderr)
        sys.exit(2)

    cmd, env = _psql_command(target, schema_path)
    cmd[0] = psql
    print("Applying schema:", schema_path)
    print("psql command:", shlex.join(cmd))
    r = subprocess.run(cmd, capture_output=False, env=env)
    if r.returncode != 0:
        sys.exit(r.returncode)
    print("Schema applied.")


if __name__ == "__main__":
    main()
