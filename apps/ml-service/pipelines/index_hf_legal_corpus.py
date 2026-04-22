from __future__ import annotations

import argparse
import hashlib
from typing import Iterable

from datasets import load_dataset

from src.config import settings
from src.retrieval import retrieval_store
from src.schemas import RetrievalDocument


TEXT_FIELDS = ("text", "body", "content", "opinion", "summary")


def chunk_text(text: str, chunk_size: int = 1600, overlap: int = 200) -> Iterable[str]:
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        yield text[start:end]
        if end == len(text):
            break
        start = max(0, end - overlap)


def coerce_text(example: dict) -> str:
    for field in TEXT_FIELDS:
        value = example.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Index a Hugging Face legal corpus into pgvector.")
    parser.add_argument("--dataset", default=settings.hf_dataset)
    parser.add_argument("--split", default=settings.hf_dataset_split)
    parser.add_argument("--limit", type=int, default=250)
    parser.add_argument("--source", default="huggingface")
    args = parser.parse_args()

    stream = load_dataset(args.dataset, split=args.split, streaming=True, token=settings.hf_token)
    batch: list[RetrievalDocument] = []
    indexed = 0

    for item in stream:
        text = coerce_text(item)
        if not text:
            continue

        title = str(item.get("title") or item.get("name") or "Untitled legal source")
        citation = str(item.get("citation") or item.get("reporter") or "")
        jurisdiction = str(item.get("state") or item.get("jurisdiction") or "")
        claim_type = str(item.get("claim_type") or "personal_injury")

        for chunk_index, chunk in enumerate(chunk_text(text)):
            digest = hashlib.sha1(f"{args.source}:{title}:{chunk_index}:{chunk[:120]}".encode("utf-8")).hexdigest()
            batch.append(
                RetrievalDocument(
                    external_id=digest,
                    source=args.source,
                    title=title,
                    citation=citation or None,
                    jurisdiction=jurisdiction or None,
                    claim_type=claim_type or None,
                    body=chunk,
                    metadata={
                        "dataset": args.dataset,
                        "split": args.split,
                        "chunk_index": chunk_index,
                    },
                )
            )
            indexed += 1
            if len(batch) >= 32:
                retrieval_store.index_documents(batch)
                batch.clear()
            if indexed >= args.limit:
                break
        if indexed >= args.limit:
            break

    if batch:
        retrieval_store.index_documents(batch)

    print(f"Indexed {indexed} legal chunks from {args.dataset}:{args.split}")


if __name__ == "__main__":
    main()
