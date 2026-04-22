CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS legal_document_chunks (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  title TEXT,
  citation TEXT,
  jurisdiction TEXT,
  claim_type TEXT,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS legal_document_chunks_source_idx
  ON legal_document_chunks (source);

CREATE INDEX IF NOT EXISTS legal_document_chunks_claim_type_idx
  ON legal_document_chunks (claim_type);

CREATE INDEX IF NOT EXISTS legal_document_chunks_jurisdiction_idx
  ON legal_document_chunks (jurisdiction);

CREATE INDEX IF NOT EXISTS legal_document_chunks_embedding_idx
  ON legal_document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS llm_groundings (
  id BIGSERIAL PRIMARY KEY,
  assessment_id TEXT,
  provider TEXT,
  model_version TEXT,
  prompt_version TEXT,
  query_text TEXT NOT NULL,
  context_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS llm_groundings_assessment_idx
  ON llm_groundings (assessment_id);
