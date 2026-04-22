"""
Stream common-pile/caselaw_access_project, filter with keyword gate + embedding similarity
to a PI prototype, extract light structure + medical-injury spans, then export CSV/Parquet
and optionally push a private Hugging Face Dataset.

Uses HF_TOKEN or HUGGING_FACE_HUB_TOKEN from the environment (never hardcode secrets).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from typing import Any

import pandas as pd
import torch
from datasets import Dataset, load_dataset
from huggingface_hub import login
from sentence_transformers import SentenceTransformer, util
from tqdm import tqdm


def resolve_device(device: str) -> str:
    """`auto` → CUDA when available, else CPU."""
    if device == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    return device

PI_PROTOTYPE = (
    "This is a personal injury case involving negligence, "
    "accident, slip and fall, auto collision, wrongful death, "
    "or medical malpractice with damages and injury."
)

MEDICAL_TERMS = [
    "fracture",
    "broken bone",
    "surgery",
    "amputation",
    "traumatic brain injury",
    "TBI",
    "concussion",
    "whiplash",
    "soft tissue injury",
    "herniated disc",
    "spinal cord injury",
    "paralysis",
    "burn",
    "laceration",
    "crushed",
    "dislocated",
    "internal bleeding",
    "ruptured",
    "ligament tear",
    "rotator cuff",
    "ACL tear",
]

KW_GATE = [
    "personal injury",
    "slip and fall",
    "wrongful death",
    "auto accident",
    "negligence",
    "tort",
]


def extract_parties(text: str) -> dict[str, str | None]:
    match = re.search(
        r"([A-Za-z\s,\.&]+)\s+v\.?\s+([A-Za-z\s,\.&]+)",
        text[:2000],
        re.I,
    )
    if match:
        return {"plaintiff": match.group(1).strip(), "defendant": match.group(2).strip()}
    return {"plaintiff": None, "defendant": None}


def extract_court(text: str) -> str | None:
    patterns = [
        r"(?:United States|U\.S\.|State of|Supreme Court|Court of Appeals|Superior Court|District Court)[^,\n]{0,80}",
        r"(?:[A-Z][a-z]+ County|Circuit|Appellate) Court",
    ]
    for pat in patterns:
        m = re.search(pat, text[:1000], re.I)
        if m:
            return m.group(0).strip()
    return None


def extract_date(text: str) -> str | None:
    """Parse common US opinion date lead-ins (full or abbreviated month)."""
    m = re.search(
        r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b",
        text[:500],
        re.I,
    )
    if not m:
        return None
    raw = re.sub(r"\s+", " ", m.group(1).strip())
    variants = {raw, raw.replace(",", ""), re.sub(r"(\w+)\.", r"\1", raw)}
    for cand in variants:
        for fmt in ("%b %d %Y", "%B %d %Y", "%b %d, %Y", "%B %d, %Y"):
            try:
                return datetime.strptime(cand, fmt).date().isoformat()
            except ValueError:
                continue
    return None


def extract_outcome(text: str) -> str:
    keywords = [
        "affirmed",
        "reversed",
        "remanded",
        "judgment for",
        "verdict",
        "damages awarded",
        "summary judgment",
        "dismissed",
    ]
    text_lower = text.lower()
    for kw in keywords:
        if kw in text_lower:
            snippet = re.search(
                r"[^.!?]*" + re.escape(kw) + r"[^.!?]*[.!?]",
                text_lower[:3000],
            )
            return snippet.group(0).strip() if snippet else kw.title()
    return "Unknown"


def extract_medical_injuries(text: str, limit: int = 10) -> list[str]:
    text_lower = text.lower()
    injuries: list[str] = []
    for term in MEDICAL_TERMS:
        for match in re.finditer(r".{0,60}" + re.escape(term) + r".{0,60}", text_lower):
            ctx = match.group(0).strip()
            injuries.append(f"{term}: {ctx}")
    return list(dict.fromkeys(injuries))[:limit]


def row_for_frame(case_data: dict[str, Any]) -> dict[str, Any]:
    """Flatten nested fields for CSV/Parquet."""
    parties = case_data.get("parties") or {}
    meta = case_data.get("metadata")
    injuries = case_data.get("medical_injuries") or []
    return {
        "case_id": case_data.get("case_id"),
        "plaintiff": parties.get("plaintiff"),
        "defendant": parties.get("defendant"),
        "court": case_data.get("court"),
        "decision_date": case_data.get("decision_date"),
        "outcome": case_data.get("outcome"),
        "medical_injuries_json": json.dumps(injuries),
        "metadata_json": json.dumps(meta if meta is not None else {}),
        "pi_similarity_score": case_data.get("pi_similarity_score"),
        "full_text": case_data.get("full_text"),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--hf-token",
        default=os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN"),
        help="Hugging Face token (else env HF_TOKEN / HUGGING_FACE_HUB_TOKEN)",
    )
    ap.add_argument(
        "--hub-dataset",
        default="",
        help="If set, push Dataset to this repo id (e.g. your-org/clearcaseiq_pi_v2)",
    )
    ap.add_argument(
        "--max-cases",
        type=int,
        default=50_000,
        help="Max matching cases to collect",
    )
    ap.add_argument(
        "--max-stream-rows",
        type=int,
        default=0,
        metavar="N",
        help="Stop after N raw dataset rows (0 = until max-cases or stream ends). Bounds long CPU runs.",
    )
    ap.add_argument(
        "--similarity-threshold",
        type=float,
        default=0.68,
        help="Min cosine similarity to PI prototype (0–1)",
    )
    ap.add_argument(
        "--model",
        default="sentence-transformers/all-MiniLM-L6-v2",
        help="SentenceTransformer model id",
    )
    ap.add_argument(
        "--device",
        default="auto",
        metavar="NAME",
        help="Embedding device: auto (CUDA if available), cpu, or cuda / cuda:0, …",
    )
    ap.add_argument(
        "--csv-out",
        default="clearcaseiq_personal_injury_cases.csv",
    )
    ap.add_argument(
        "--parquet-out",
        default="clearcaseiq_personal_injury_cases.parquet",
    )
    ap.add_argument(
        "--no-parquet",
        action="store_true",
        help="Skip Parquet export",
    )
    args = ap.parse_args()

    if args.hub_dataset and not args.hf_token:
        print(
            "Set --hf-token or HF_TOKEN / HUGGING_FACE_HUB_TOKEN for Hub push.",
            file=sys.stderr,
        )
        return 1

    if args.hf_token:
        login(token=args.hf_token)

    device = resolve_device(args.device)
    print(f"Loading embedder on {device}…", file=sys.stderr)
    embedder = SentenceTransformer(args.model, device=device)
    prototype_emb = embedder.encode(PI_PROTOTYPE, convert_to_tensor=True)

    dataset = load_dataset(
        "common-pile/caselaw_access_project",
        streaming=True,
        split="train",
    )

    print("Scanning cases (keyword gate → embedding)…", file=sys.stderr)
    extracted: list[dict[str, Any]] = []
    stream_rows = 0

    for example in tqdm(dataset, desc="Scanning cases"):
        stream_rows += 1
        if args.max_stream_rows and stream_rows > args.max_stream_rows:
            break
        if len(extracted) >= args.max_cases:
            break

        text = example.get("text") or ""
        if not text:
            continue

        tl = text.lower()
        if not any(kw in tl for kw in KW_GATE):
            continue

        short_text = text[:4000]
        text_emb = embedder.encode(short_text, convert_to_tensor=True)
        similarity = float(util.cos_sim(text_emb, prototype_emb)[0][0].item())

        if similarity <= args.similarity_threshold:
            continue

        case_data = {
            "case_id": example.get("id"),
            "full_text": text,
            "parties": extract_parties(text),
            "court": extract_court(text),
            "decision_date": extract_date(text),
            "outcome": extract_outcome(text),
            "medical_injuries": extract_medical_injuries(text),
            "metadata": example.get("metadata") or {},
            "pi_similarity_score": round(similarity, 4),
        }
        extracted.append(case_data)

    print(f"Extracted {len(extracted):,} cases", file=sys.stderr)

    rows = [row_for_frame(c) for c in extracted]
    df = pd.DataFrame(rows)
    df.to_csv(args.csv_out, index=False)
    print(f"Wrote CSV: {args.csv_out}", file=sys.stderr)

    if not args.no_parquet:
        try:
            df.to_parquet(args.parquet_out, index=False)
            print(f"Wrote Parquet: {args.parquet_out}", file=sys.stderr)
        except ImportError:
            print("Parquet skipped (install pyarrow).", file=sys.stderr)

    if args.hub_dataset:
        final = Dataset.from_pandas(df)
        final.push_to_hub(
            repo_id=args.hub_dataset,
            private=True,
            token=args.hf_token,
            commit_message=f"PI embedding filter: {len(extracted)} cases",
        )
        print(f"Pushed private dataset: {args.hub_dataset}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
