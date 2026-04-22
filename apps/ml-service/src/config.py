from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("PORT", "8000"))
    database_url: str | None = os.getenv("DATABASE_URL")
    model_registry_dir: Path = Path(os.getenv("MODEL_REGISTRY_DIR", ROOT_DIR / "artifacts" / "models"))
    legal_corpus_cache_dir: Path = Path(os.getenv("LEGAL_CORPUS_CACHE_DIR", ROOT_DIR / "artifacts" / "corpus"))
    legal_corpus_jsonl: Path = Path(os.getenv("LEGAL_CORPUS_JSONL", ROOT_DIR / "artifacts" / "corpus" / "legal_corpus.jsonl"))
    pgvector_table: str = os.getenv("PGVECTOR_TABLE", "legal_document_chunks")
    pgvector_embedding_dim: int = int(os.getenv("PGVECTOR_EMBEDDING_DIM", "1024"))
    predictive_model_version: str = os.getenv("PREDICTIVE_MODEL_VERSION", "shadow-v1")
    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", f"file:{ROOT_DIR / 'artifacts' / 'mlruns'}")
    dvc_remote_uri: str | None = os.getenv("DVC_REMOTE_URI")
    hf_dataset: str = os.getenv("HF_DATASET", "common-pile/caselaw_access_project")
    hf_dataset_split: str = os.getenv("HF_DATASET_SPLIT", "train")
    hf_token: str | None = os.getenv("HF_TOKEN")
    embedding_model_name: str = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-large-en-v1.5")
    retrieval_top_k: int = int(os.getenv("RETRIEVAL_TOP_K", "4"))


settings = Settings()
