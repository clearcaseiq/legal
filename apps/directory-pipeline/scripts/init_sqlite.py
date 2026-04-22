#!/usr/bin/env python3
"""Initialize SQLite database with schema."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sqlite3
import os

def main():
    root = Path(__file__).resolve().parent.parent
    schema_path = root / "schema_sqlite.sql"
    db_path = root / "directory_pipeline.db"
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(db_path)
    conn.executescript(schema_path.read_text())
    conn.close()
    print(f"Initialized SQLite database: {db_path}")

if __name__ == "__main__":
    main()
