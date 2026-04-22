#!/usr/bin/env python3
"""
Run supported source parsers and materialize attorneys from raw records.
Usage: python scripts/run_parser.py [batch_size] [source_id...]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.parser_registry import run_registered_parsers


def main():
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    source_ids = sys.argv[2:] if len(sys.argv) > 2 else None
    print(f"Running registered parsers (batch={batch_size})...")
    n = run_registered_parsers(batch_size=batch_size, source_ids=source_ids)
    print(f"Parsed {n} attorney records.")


if __name__ == "__main__":
    main()
