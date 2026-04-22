#!/usr/bin/env python3
"""Inventory approved New York licensed-import files in the drop zone."""

import json
import sys
from datetime import datetime, UTC
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.licensed_import_utils import read_rows


def isoformat(timestamp: float):
    return datetime.fromtimestamp(timestamp, UTC).isoformat()


def summarize_file(path: Path):
    entry = {
        "path": str(path),
        "name": path.name,
        "extension": path.suffix.lower(),
        "size_bytes": path.stat().st_size,
        "modified_at": isoformat(path.stat().st_mtime),
        "row_count": None,
        "readable": False,
        "error": None,
    }

    if path.suffix.lower() in {".csv", ".json", ".jsonl", ".xlsx"}:
        try:
            rows = read_rows(path)
            entry["row_count"] = len(rows)
            entry["readable"] = True
        except Exception as error:
            entry["error"] = str(error)

    return entry


def main():
    root = Path(__file__).resolve().parent.parent / "imports" / "ny-licensed" / "incoming"
    root.mkdir(parents=True, exist_ok=True)

    files = sorted([path for path in root.iterdir() if path.is_file() and path.name != ".gitkeep"])
    summary = {
        "dropzone": str(root),
        "file_count": len(files),
        "files": [summarize_file(path) for path in files],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
