#!/usr/bin/env python3
"""
Run the fetcher - processes pending jobs and stores raw HTML.
Usage: python scripts/run_fetcher.py [batch_size]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.fetcher import run_fetcher


def main():
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    print(f"Running fetcher (batch={batch_size})...")
    n = run_fetcher(batch_size=batch_size)
    print(f"Processed {n} jobs.")


if __name__ == "__main__":
    main()
