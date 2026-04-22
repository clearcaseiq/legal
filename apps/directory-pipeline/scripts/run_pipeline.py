#!/usr/bin/env python3
"""
Run the full pipeline: fetch -> parse.
Usage: python scripts/run_pipeline.py [fetch_batch] [parser_batch]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.fetcher import run_fetcher
from services.parser_registry import run_registered_parsers


def main():
    fetch_batch = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    parser_batch = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    print("=== Fetch phase ===")
    n_fetch = run_fetcher(batch_size=fetch_batch)
    print(f"Fetched {n_fetch} pages.\n")

    print("=== Parse phase ===")
    n_parse = run_registered_parsers(batch_size=parser_batch)
    print(f"Parsed {n_parse} attorney records.\n")

    print("Pipeline run complete.")


if __name__ == "__main__":
    main()
