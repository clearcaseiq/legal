from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from .config import settings
from .schemas import (
    ExplainabilityItem,
    PredictionBands,
    PredictionComponent,
    PredictionResponse,
    RetrievalDocument,
    RetrievalMatch,
    RetrievalSearchResponse,
    SimulationResponse,
)


FEATURE_ORDER = [
    "severity",
    "medPaid",
    "medCharges",
    "wageLoss",
    "hasTreatment",
    "narrativeLength",
    "liabilityScoreValue",
    "comparativeNegligence",
]


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_bool(value: Any) -> float:
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, str):
        return 1.0 if value.lower() in {"1", "true", "yes"} else 0.0
    return 1.0 if value else 0.0


def _claim_type_factor(claim_type: str | None) -> float:
    return {
        "medmal": 0.08,
        "product": 0.06,
        "auto": 0.03,
        "slip_and_fall": 0.02,
        "premises": 0.01,
        "workplace": -0.02,
        "workers": -0.05,
    }.get(claim_type or "", 0.0)


def _venue_factor(venue: str | None) -> float:
    return 0.05 if (venue or "").upper() in {"CA", "NY", "TX"} else -0.02


def _base_feature_map(features: dict[str, Any]) -> dict[str, float]:
    liability = features.get("liabilityScore") or {}
    return {
        "severity": _safe_float(features.get("severity")),
        "medPaid": _safe_float(features.get("medPaid")),
        "medCharges": _safe_float(features.get("medCharges")),
        "wageLoss": _safe_float(features.get("wageLoss")),
        "hasTreatment": _safe_bool(features.get("hasTreatment")),
        "narrativeLength": _safe_float(features.get("narrativeLength")),
        "liabilityScoreValue": _safe_float(liability.get("score"), 0.5),
        "comparativeNegligence": _safe_float(liability.get("comparativeNegligence")),
    }


def _feature_vector(features: dict[str, Any]) -> np.ndarray:
    mapped = _base_feature_map(features)
    return np.array([[mapped[name] for name in FEATURE_ORDER]], dtype=float)


def _clamp(value: float, low: float = 0.05, high: float = 0.95) -> float:
    return max(low, min(high, value))


def _fallback_prediction(features: dict[str, Any]) -> PredictionResponse:
    severity = _safe_float(features.get("severity"))
    med_paid = _safe_float(features.get("medPaid"))
    has_treatment = _safe_bool(features.get("hasTreatment")) > 0
    narrative_length = _safe_float(features.get("narrativeLength"))
    liability = features.get("liabilityScore") or {}
    liability_score = _safe_float(liability.get("score"), 0.5)

    overall = _clamp(
        0.45
        + {-0.10: -0.10}.get(-0.10, 0)  # keep clamp math explicit for parity with the TS baseline
        + {0: -0.10, 1: 0.02, 2: 0.08, 3: 0.15, 4: 0.20}.get(int(severity), 0.0)
        + min(med_paid / 100000.0, 0.15)
        + (0.08 if has_treatment else -0.03)
        + min(narrative_length / 5.0, 0.06)
        + _venue_factor(features.get("venue"))
        + _claim_type_factor(features.get("claimType"))
    )
    causation = _clamp(overall - 0.05 + (severity * 0.01))
    damages = _clamp(overall + 0.06 + min(med_paid / 150000.0, 0.08))
    liability_component = _clamp(liability_score)
    ci_low = _clamp(overall - 0.09)
    ci_high = _clamp(overall + 0.09)
    median = max(10000, int(max(med_paid * 3, 10000) * {0: 1.0, 1: 1.3, 2: 1.8, 3: 2.8, 4: 4.0}.get(int(severity), 1.2)))

    explainability = [
        ExplainabilityItem(feature="injury_severity", direction="+", impact=round(max(severity, 0) * 0.04, 4)),
        ExplainabilityItem(feature="medical_expenses", direction="+", impact=round(min(med_paid / 100000.0, 0.15), 4)),
        ExplainabilityItem(feature="treatment_continuity", direction="+" if has_treatment else "-", impact=0.05),
        ExplainabilityItem(
            feature="comparative_negligence",
            direction="-",
            impact=round(_safe_float(liability.get("comparativeNegligence")) * 0.3, 4),
        ),
    ]

    return PredictionResponse(
        viability=PredictionComponent(
            overall=round(overall, 4),
            liability=round(liability_component, 4),
            causation=round(causation, 4),
            damages=round(damages, 4),
            ci=[round(ci_low, 4), round(ci_high, 4)],
        ),
        value_bands=PredictionBands(
            p25=int(round(median * 0.3)),
            median=int(round(median)),
            p75=int(round(median * 2.2)),
        ),
        explainability=explainability,
        caveats=[
            "Fallback score because no promoted artifact is available.",
            "Use shadow mode before routing or valuation cutover.",
            "Consult qualified counsel for final legal review.",
        ],
        severity=features.get("severityScore"),
        liability=features.get("liabilityScore"),
        model_version=f"{settings.predictive_model_version}-fallback",
        source="fallback",
    )


class PredictiveBundle:
    def __init__(self, directory: Path):
        self.directory = directory
        self.metadata = self._load_json("metadata.json")
        self.classifier = self._load_joblib("viability_classifier.joblib")
        self.value_regressor = self._load_joblib("value_regressor.joblib")
        self.liability_regressor = self._load_joblib("liability_regressor.joblib")
        self.causation_regressor = self._load_joblib("causation_regressor.joblib")
        self.damages_regressor = self._load_joblib("damages_regressor.joblib")

    def _load_joblib(self, filename: str):
        path = self.directory / filename
        return joblib.load(path) if path.exists() else None

    def _load_json(self, filename: str) -> dict[str, Any]:
        path = self.directory / filename
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    @property
    def is_ready(self) -> bool:
        return self.classifier is not None and self.value_regressor is not None

    def predict(self, features: dict[str, Any]) -> PredictionResponse:
        matrix = _feature_vector(features)
        overall = _clamp(float(self.classifier.predict_proba(matrix)[0][1]))
        liability_pred = self._predict_optional(self.liability_regressor, matrix, fallback=_safe_float((features.get("liabilityScore") or {}).get("score"), overall - 0.03))
        causation_pred = self._predict_optional(self.causation_regressor, matrix, fallback=overall - 0.04)
        damages_pred = self._predict_optional(self.damages_regressor, matrix, fallback=overall + 0.06)
        median = max(10000, int(round(self.value_regressor.predict(matrix)[0])))

        explainability = []
        importances = self.metadata.get("feature_importances") or {}
        for name in FEATURE_ORDER[:4]:
            impact = round(float(importances.get(name, 0.03)), 4)
            direction = "+" if _base_feature_map(features).get(name, 0.0) >= 0 else "-"
            explainability.append(ExplainabilityItem(feature=name, direction=direction, impact=impact))

        return PredictionResponse(
            viability=PredictionComponent(
                overall=round(overall, 4),
                liability=round(_clamp(liability_pred), 4),
                causation=round(_clamp(causation_pred), 4),
                damages=round(_clamp(damages_pred), 4),
                ci=[round(_clamp(overall - 0.07), 4), round(_clamp(overall + 0.07), 4)],
            ),
            value_bands=PredictionBands(
                p25=int(round(median * 0.35)),
                median=int(round(median)),
                p75=int(round(median * 1.9)),
            ),
            explainability=explainability,
            caveats=[
                "Model output should be reviewed against venue-specific legal rules.",
                "Predictions are trained on structured intake snapshots and require monitoring.",
            ],
            severity=features.get("severityScore"),
            liability=features.get("liabilityScore"),
            model_version=str(self.metadata.get("model_version") or settings.predictive_model_version),
            source="artifact",
        )

    @staticmethod
    def _predict_optional(model: Any, matrix: np.ndarray, fallback: float) -> float:
        if model is None:
            return _clamp(float(fallback))
        return _clamp(float(model.predict(matrix)[0]))


@lru_cache(maxsize=4)
def _load_bundle(version: str) -> PredictiveBundle | None:
    directory = settings.model_registry_dir / version
    if not directory.exists():
        return None
    bundle = PredictiveBundle(directory)
    return bundle if bundle.is_ready else None


def predict_case(features: dict[str, Any]) -> PredictionResponse:
    bundle = _load_bundle(settings.predictive_model_version)
    if bundle is None:
        return _fallback_prediction(features)
    return bundle.predict(features)


def simulate(base_features: dict[str, Any], toggles: dict[str, Any]) -> SimulationResponse:
    deltas: dict[str, float] = {}
    if toggles.get("increased_medical"):
        deltas["overall"] = 0.07
        deltas["damages"] = 0.12
    if toggles.get("additional_evidence"):
        deltas["overall"] = max(deltas.get("overall", 0.0), 0.05)
        deltas["liability"] = 0.08
    if toggles.get("expert_witness"):
        deltas["overall"] = max(deltas.get("overall", 0.0), 0.06)
        deltas["causation"] = 0.1
    return SimulationResponse(deltas=deltas)


def _keyword_score(query: str, document: RetrievalDocument) -> float:
    tokens = [token for token in query.lower().split() if token]
    haystack = " ".join([
        document.title or "",
        document.citation or "",
        document.body,
        document.claim_type or "",
        document.jurisdiction or "",
    ]).lower()
    return float(sum(1 for token in tokens if token in haystack))


def search_jsonl_corpus(query: str, documents: list[RetrievalDocument], top_k: int) -> RetrievalSearchResponse:
    ranked = sorted(
        documents,
        key=lambda doc: _keyword_score(query, doc),
        reverse=True,
    )
    matches = [
        RetrievalMatch(
            external_id=doc.external_id,
            source=doc.source,
            title=doc.title,
            citation=doc.citation,
            excerpt=doc.body[:320],
            score=round(_keyword_score(query, doc), 4),
            metadata=doc.metadata,
        )
        for doc in ranked[:top_k]
        if _keyword_score(query, doc) > 0
    ]
    backend = "jsonl_fallback" if matches else "empty"
    return RetrievalSearchResponse(matches=matches, backend=backend)
