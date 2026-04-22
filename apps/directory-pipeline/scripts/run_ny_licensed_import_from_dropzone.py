#!/usr/bin/env python3
"""Auto-run the New York licensed import workflow from the standard drop zone."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.run_ny_licensed_import import run_workflow

SUPPORTED_EXTENSIONS = {".csv", ".json", ".jsonl", ".xlsx"}


def load_manifest(path: Path | None):
    if not path or not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, dict) else {}


def choose_dataset(root: Path):
    files = [path for path in root.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS]
    if not files:
        raise FileNotFoundError(f"No dataset files found in {root}")
    files.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    return files[0], files[1:]


def resolve_paths(base_dir: Path, dataset_path: Path):
    manifest_path = base_dir / "MANIFEST.json"
    stem_manifest_path = base_dir / f"{dataset_path.stem}.manifest.json"
    manifest = load_manifest(stem_manifest_path if stem_manifest_path.exists() else manifest_path)

    field_map_path = None
    if manifest.get("field_map_path"):
        candidate = (base_dir / manifest["field_map_path"]).resolve()
        if candidate.exists():
            field_map_path = candidate

    if field_map_path is None:
        candidate = base_dir / "field-maps" / f"{dataset_path.stem}.field-map.json"
        if candidate.exists():
            field_map_path = candidate.resolve()

    report_path = base_dir / "reports" / f"{dataset_path.stem}.validation.json"
    source_label = manifest.get("dataset_name") or dataset_path.stem
    return manifest, field_map_path, report_path, source_label


def main():
    parser = argparse.ArgumentParser(description="Run the New York licensed import from the standard drop zone.")
    parser.add_argument("--preview", type=int, default=5, help="Rows to include in the validation preview.")
    parser.add_argument("--allow-issues", action="store_true", help="Continue even if validation finds blocking issues.")
    parser.add_argument("--allow-duplicates", action="store_true", help="Stage rows even if the same source_url was already imported.")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent.parent / "imports" / "ny-licensed"
    incoming_dir = base_dir / "incoming"
    incoming_dir.mkdir(parents=True, exist_ok=True)
    (base_dir / "reports").mkdir(parents=True, exist_ok=True)
    (base_dir / "field-maps").mkdir(parents=True, exist_ok=True)

    try:
        dataset_path, ignored = choose_dataset(incoming_dir)
    except FileNotFoundError as error:
        print(f"Error: {error}", file=sys.stderr)
        print(
            f"Place an approved dataset file here, then run this command again: {incoming_dir}",
            file=sys.stderr,
        )
        print(
            "Supported extensions: .csv, .json, .jsonl, .xlsx",
            file=sys.stderr,
        )
        raise SystemExit(1) from error
    manifest, field_map_path, report_path, source_label = resolve_paths(base_dir, dataset_path)

    print(json.dumps(
        {
            "selected_dataset": str(dataset_path),
            "ignored_datasets": [str(path) for path in ignored],
            "field_map_path": str(field_map_path) if field_map_path else None,
            "report_path": str(report_path),
            "source_label": source_label,
            "manifest_present": bool(manifest),
        },
        indent=2,
    ))

    run_workflow(
        dataset_path=dataset_path.resolve(),
        field_map_path=field_map_path,
        source_label=source_label,
        preview=args.preview,
        allow_issues=args.allow_issues,
        report_path=report_path,
        allow_duplicates=args.allow_duplicates,
    )


if __name__ == "__main__":
    main()
