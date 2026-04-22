from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import mlflow
import numpy as np
from sklearn.metrics import mean_absolute_error, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier, XGBRegressor

from src.config import settings
from src.service import FEATURE_ORDER, _base_feature_map


def load_rows(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_training_matrices(rows: list[dict[str, Any]]):
    X = []
    y_class = []
    y_value = []
    for row in rows:
        mapped = _base_feature_map(row["features"])
        X.append([mapped[name] for name in FEATURE_ORDER])
        y_class.append(int(row["labels"]["viability"]))
        y_value.append(float(row["labels"]["median_value"]))
    return np.array(X, dtype=float), np.array(y_class), np.array(y_value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the ClearCaseIQ predictive bundle.")
    parser.add_argument("--input", required=True, help="Path to JSONL training data.")
    parser.add_argument("--version", default=settings.predictive_model_version, help="Model version to write.")
    args = parser.parse_args()

    input_path = Path(args.input)
    rows = load_rows(input_path)
    X, y_class, y_value = build_training_matrices(rows)

    X_train, X_test, y_train, y_test, value_train, value_test = train_test_split(
        X, y_class, y_value, test_size=0.2, random_state=42
    )

    classifier = XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
    )
    classifier.fit(X_train, y_train)

    value_regressor = XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
    )
    value_regressor.fit(X_train, value_train)

    auc = roc_auc_score(y_test, classifier.predict_proba(X_test)[:, 1])
    mae = mean_absolute_error(value_test, value_regressor.predict(X_test))

    output_dir = settings.model_registry_dir / args.version
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(classifier, output_dir / "viability_classifier.joblib")
    joblib.dump(value_regressor, output_dir / "value_regressor.joblib")

    feature_importances = {
        name: float(importance)
        for name, importance in zip(FEATURE_ORDER, classifier.feature_importances_, strict=True)
    }
    metadata = {
        "model_version": args.version,
        "training_rows": len(rows),
        "roc_auc": float(auc),
        "value_mae": float(mae),
        "feature_order": FEATURE_ORDER,
        "feature_importances": feature_importances,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment("clearcaseiq-predictor")
    with mlflow.start_run(run_name=args.version):
        mlflow.log_params({
            "model_version": args.version,
            "rows": len(rows),
            "model_type": "xgboost",
        })
        mlflow.log_metrics({
            "roc_auc": float(auc),
            "value_mae": float(mae),
        })
        mlflow.log_artifact(str(output_dir / "metadata.json"))

    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
