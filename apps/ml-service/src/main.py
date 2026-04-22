from __future__ import annotations

from fastapi import FastAPI

from .config import settings
from .retrieval import retrieval_store
from .schemas import (
    PredictionRequest,
    RetrievalIndexRequest,
    RetrievalSearchRequest,
    RetrievalSearchResponse,
    SimulationRequest,
)
from .service import predict_case, simulate


app = FastAPI(
    title="ClearCaseIQ ML Service",
    version="0.1.0",
    description="Inference, retrieval, and MLOps support service for ClearCaseIQ.",
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "model_version": settings.predictive_model_version,
        "mlflow_tracking_uri": settings.mlflow_tracking_uri,
        "retrieval_backend": settings.pgvector_table,
    }


@app.post("/v1/predict")
def predict(request: PredictionRequest):
    return predict_case(request.features).model_dump()


@app.post("/v1/predict/simulate")
def predict_simulation(request: SimulationRequest):
    return simulate(request.base, request.toggles).model_dump()


@app.post("/v1/retrieval/search", response_model=RetrievalSearchResponse)
def retrieval_search(request: RetrievalSearchRequest):
    return retrieval_store.search(request.query, request.filters, request.top_k)


@app.post("/v1/retrieval/index")
def retrieval_index(request: RetrievalIndexRequest) -> dict[str, int]:
    return {
        "indexed": retrieval_store.index_documents(request.documents),
    }
