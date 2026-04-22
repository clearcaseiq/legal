from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

from .config import settings
from .schemas import RetrievalDocument, RetrievalFilter, RetrievalMatch, RetrievalSearchResponse
from .service import search_jsonl_corpus


def _load_jsonl(path: Path) -> list[RetrievalDocument]:
    if not path.exists():
        return []
    documents: list[RetrievalDocument] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            documents.append(RetrievalDocument(**payload))
    return documents


class RetrievalStore:
    def __init__(self) -> None:
        self._model: SentenceTransformer | None = None

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(settings.embedding_model_name)
        return self._model

    def _connect(self):
        if not settings.database_url:
            return None
        conn = psycopg.connect(settings.database_url)
        register_vector(conn)
        return conn

    def search(self, query: str, filters: RetrievalFilter | None = None, top_k: int | None = None) -> RetrievalSearchResponse:
        filters = filters or RetrievalFilter()
        top_k = top_k or settings.retrieval_top_k

        try:
            with self._connect() as conn:
                if conn is None:
                    raise RuntimeError("database unavailable")
                query_embedding = self.model.encode(query, normalize_embeddings=True).tolist()
                sql = f"""
                    SELECT external_id, source, title, citation, body, metadata,
                           1 - (embedding <=> %s::vector) AS score
                    FROM {settings.pgvector_table}
                    WHERE (%s IS NULL OR jurisdiction = %s)
                      AND (%s IS NULL OR claim_type = %s)
                      AND (%s IS NULL OR source = %s)
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                """
                rows = conn.execute(
                    sql,
                    (
                        query_embedding,
                        filters.jurisdiction,
                        filters.jurisdiction,
                        filters.claim_type,
                        filters.claim_type,
                        filters.source,
                        filters.source,
                        query_embedding,
                        top_k,
                    ),
                ).fetchall()
                matches = [
                    RetrievalMatch(
                        external_id=row[0],
                        source=row[1],
                        title=row[2],
                        citation=row[3],
                        excerpt=(row[4] or "")[:320],
                        score=round(float(row[6]), 4),
                        metadata=row[5] or {},
                    )
                    for row in rows
                ]
                return RetrievalSearchResponse(matches=matches, backend="pgvector" if matches else "empty")
        except Exception:
            documents = _load_jsonl(settings.legal_corpus_jsonl)
            if filters:
                documents = [
                    document
                    for document in documents
                    if (not filters.jurisdiction or document.jurisdiction == filters.jurisdiction)
                    and (not filters.claim_type or document.claim_type == filters.claim_type)
                    and (not filters.source or document.source == filters.source)
                ]
            return search_jsonl_corpus(query, documents, top_k)

    def index_documents(self, documents: list[RetrievalDocument]) -> int:
        if not documents:
            return 0

        embeddings = self.model.encode(
            [document.body for document in documents],
            normalize_embeddings=True,
        )

        if settings.database_url:
            try:
                with self._connect() as conn:
                    if conn is None:
                        raise RuntimeError("database unavailable")
                    for document, embedding in zip(documents, embeddings, strict=True):
                        conn.execute(
                            f"""
                            INSERT INTO {settings.pgvector_table}
                              (external_id, source, title, citation, jurisdiction, claim_type, body, metadata, embedding, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                            ON CONFLICT (external_id) DO UPDATE
                            SET source = EXCLUDED.source,
                                title = EXCLUDED.title,
                                citation = EXCLUDED.citation,
                                jurisdiction = EXCLUDED.jurisdiction,
                                claim_type = EXCLUDED.claim_type,
                                body = EXCLUDED.body,
                                metadata = EXCLUDED.metadata,
                                embedding = EXCLUDED.embedding,
                                updated_at = NOW()
                            """,
                            (
                                document.external_id,
                                document.source,
                                document.title,
                                document.citation,
                                document.jurisdiction,
                                document.claim_type,
                                document.body,
                                json.dumps(document.metadata),
                                embedding.tolist(),
                            ),
                        )
                    conn.commit()
                    return len(documents)
            except Exception:
                pass

        settings.legal_corpus_jsonl.parent.mkdir(parents=True, exist_ok=True)
        with settings.legal_corpus_jsonl.open("a", encoding="utf-8") as handle:
            for document in documents:
                handle.write(document.model_dump_json())
                handle.write("\n")
        return len(documents)


retrieval_store = RetrievalStore()
