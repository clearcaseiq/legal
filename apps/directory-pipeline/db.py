"""Database connection and helpers. PostgreSQL only."""
from contextlib import contextmanager
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from config import DATABASE_URL


def _normalize_postgres_dsn(dsn: str) -> str:
    """Remove Prisma-style query params unsupported by psycopg2."""
    parts = urlsplit(dsn)
    query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key != "schema"]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def _require_postgres_dsn() -> str:
    dsn = (DATABASE_URL or "").strip()
    if not dsn.lower().startswith("postgresql"):
        raise RuntimeError(
            "The directory pipeline requires PostgreSQL. Set DIRECTORY_PIPELINE_DATABASE_URL to a "
            "postgresql:// URL in apps/directory-pipeline/.env; it takes precedence over a global "
            f"DATABASE_URL. Got: {dsn or '(unset)'}"
        )
    return dsn


@contextmanager
def get_conn():
    conn = None
    try:
        import psycopg2

        conn = psycopg2.connect(_normalize_postgres_dsn(_require_postgres_dsn()))
        conn.set_client_encoding("UTF8")
        yield conn
        conn.commit()
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()


def _cursor(conn):
    from psycopg2.extras import RealDictCursor

    return conn.cursor(cursor_factory=RealDictCursor)
