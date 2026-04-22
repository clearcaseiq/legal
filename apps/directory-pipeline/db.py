"""Database connection and helpers. Supports PostgreSQL or SQLite."""
import os
from contextlib import contextmanager
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from config import DATABASE_URL

USE_SQLITE = not (DATABASE_URL or "").strip().lower().startswith("postgresql")


def _normalize_postgres_dsn(dsn: str) -> str:
    """Remove Prisma-style query params unsupported by psycopg2."""
    parts = urlsplit(dsn)
    query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key != "schema"]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


@contextmanager
def get_conn():
    conn = None
    try:
        if (DATABASE_URL or "").strip().lower().startswith("postgresql"):
            import psycopg2
            conn = psycopg2.connect(_normalize_postgres_dsn(DATABASE_URL))
            conn.set_client_encoding("UTF8")
            yield conn
            conn.commit()
        else:
            import sqlite3
            root = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.join(root, "directory_pipeline.db")
            conn = sqlite3.connect(db_path)
            conn.row_factory = lambda c, r: dict(zip([col[0] for col in c.description], r))
            yield conn
            conn.commit()
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()


class _SqliteCursorWrapper:
    """Wraps sqlite3 cursor to convert %s -> ? and now() -> datetime('now')."""
    def __init__(self, cursor):
        self._cur = cursor

    def execute(self, query, params=None):
        q = query.replace("%s", "?")
        q = q.replace("now()", "datetime('now')")
        q = q.replace("FOR UPDATE SKIP LOCKED", "")
        return self._cur.execute(q, params or ())

    def fetchall(self):
        return self._cur.fetchall()

    def fetchone(self):
        return self._cur.fetchone()

    @property
    def rowcount(self):
        return self._cur.rowcount


def _cursor(conn):
    """Return a cursor. For SQLite, wrap to convert %s -> ? in queries."""
    if USE_SQLITE:
        return _SqliteCursorWrapper(conn.cursor())
    from psycopg2.extras import RealDictCursor
    return conn.cursor(cursor_factory=RealDictCursor)
