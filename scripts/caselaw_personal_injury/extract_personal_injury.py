"""
Stream common-pile/caselaw_access_project and export rows whose full text matches
personal-injury-related patterns (keyword / phrase filter, not legal classification).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

from clearcaseiq_caselaw_signals import enrich_clearcaseiq

# Curated phrases & terms common in PI / tort injury litigation (case-insensitive).
PI_PATTERN = re.compile(
    r"\b("
    r"personal\s+injury|"
    r"wrongful\s+death|"
    r"medical\s+malpractice|legal\s+malpractice|"
    r"premises\s+liability|"
    r"product[s]?\s+liability|strict\s+liability|"
    r"slip\s+and\s+fall|trip\s+and\s+fall|"
    r"pain\s+and\s+suffering|"
    r"loss\s+of\s+consortium|"
    r"res\s+ipsa\s+loquitur|"
    r"bodily\s+injury|"
    r"negligen(?:ce|t)\s+(?:of|by)\s+(?:the\s+)?(?:defendant|doctor|physician|hospital)|"
    r"negligent\s+(?:supervision|entrustment|hiring|retention|security|maintenance)|"
    r"motor\s+vehicle\s+accident|automobile\s+accident|car\s+crash|"
    r"dog\s+bite|"
    r"dram\s+shop|"
    r"toxic\s+tort|asbestos|mesothelioma|"
    r"malpractice\s+(?:action|claim|case|suit)"
    r")\b",
    re.IGNORECASE | re.VERBOSE,
)


def row_to_export(
    row: dict[str, Any],
    text_max: int | None,
    *,
    enrich: bool,
    full_text: str,
) -> dict[str, Any]:
    text = row.get("text") or ""
    out: dict[str, Any] = {
        "id": row.get("id"),
        "source": row.get("source"),
        "added": row.get("added"),
        "created": row.get("created"),
        "metadata": row.get("metadata"),
        "text_length": len(text),
        "matched_spans": _matched_spans(text),
    }
    if enrich:
        out["clearcaseiq"] = enrich_clearcaseiq(full_text)
    if text_max is None:
        out["text"] = text
    else:
        out["text"] = text[:text_max]
        out["text_truncated"] = len(text) > text_max
    return out


def _matched_spans(text: str, limit: int = 20) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    for m in PI_PATTERN.finditer(text):
        spans.append({"start": m.start(), "end": m.end(), "match": m.group(0)[:200]})
        if len(spans) >= limit:
            break
    return spans


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--out",
        default="personal_injury_matches.jsonl",
        help="Output JSONL path",
    )
    ap.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Stop after scanning this many rows (default: scan entire split)",
    )
    ap.add_argument(
        "--max-matches",
        type=int,
        default=None,
        help="Stop after writing this many matching rows",
    )
    ap.add_argument(
        "--text-max",
        type=int,
        default=8000,
        help="Truncate stored text to this many chars; 0 = store full text (large files)",
    )
    ap.add_argument(
        "--dataset",
        default="common-pile/caselaw_access_project",
        help="HF dataset id",
    )
    ap.add_argument(
        "--split",
        default="train",
        help="Dataset split name",
    )
    ap.add_argument(
        "--enrich",
        action="store_true",
        help="Add clearcaseiq block (claim types, liability/damages hints, rough severity, $ near settlement language)",
    )
    args = ap.parse_args()

    try:
        from datasets import load_dataset
    except ImportError:
        print("Install dependencies: pip install -r requirements.txt", file=sys.stderr)
        return 1

    text_max = None if args.text_max == 0 else args.text_max

    stream = load_dataset(args.dataset, split=args.split, streaming=True)

    scanned = 0
    matched = 0
    with open(args.out, "w", encoding="utf-8") as f:
        for row in stream:
            scanned += 1
            text = row.get("text") or ""
            if not text or not PI_PATTERN.search(text):
                if args.max_rows and scanned >= args.max_rows:
                    break
                continue

            rec = row_to_export(
                dict(row),
                text_max,
                enrich=args.enrich,
                full_text=text,
            )
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            matched += 1

            if args.max_matches and matched >= args.max_matches:
                break
            if args.max_rows and scanned >= args.max_rows:
                break

    print(f"Scanned rows: {scanned}, matches written: {matched}, output: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
