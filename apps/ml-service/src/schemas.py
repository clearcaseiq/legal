from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class RetrievalFilter(BaseModel):
    jurisdiction: str | None = None
    claim_type: str | None = None
    source: str | None = None


class RetrievalDocument(BaseModel):
    external_id: str
    source: str
    title: str | None = None
    citation: str | None = None
    jurisdiction: str | None = None
    claim_type: str | None = None
    body: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievalSearchRequest(BaseModel):
    query: str
    filters: RetrievalFilter | None = None
    top_k: int = 4


class RetrievalMatch(BaseModel):
    external_id: str
    source: str
    title: str | None = None
    citation: str | None = None
    excerpt: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievalSearchResponse(BaseModel):
    matches: list[RetrievalMatch]
    backend: Literal["pgvector", "jsonl_fallback", "empty"]


class RetrievalIndexRequest(BaseModel):
    documents: list[RetrievalDocument]


class PredictionRequest(BaseModel):
    assessment_id: str | None = None
    features: dict[str, Any]
    claim_type: str | None = None
    venue: str | None = None


class PredictionComponent(BaseModel):
    overall: float
    liability: float
    causation: float
    damages: float
    ci: list[float]


class PredictionBands(BaseModel):
    p25: int
    median: int
    p75: int


class ExplainabilityItem(BaseModel):
    feature: str
    direction: Literal["+", "-"]
    impact: float


class PredictionResponse(BaseModel):
    viability: PredictionComponent
    value_bands: PredictionBands
    explainability: list[ExplainabilityItem]
    caveats: list[str]
    severity: dict[str, Any] | None = None
    liability: dict[str, Any] | None = None
    model_version: str
    source: Literal["artifact", "fallback"]


class SimulationRequest(BaseModel):
    base: dict[str, Any]
    toggles: dict[str, Any]


class SimulationResponse(BaseModel):
    deltas: dict[str, float]
