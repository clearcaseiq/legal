"""Tests for extract_personal_injury helpers, main(), and PI pattern."""
from __future__ import annotations

import builtins
import json
import sys
import types

import extract_personal_injury as ext


def test_matched_spans_finds_phrase():
    text = "Plaintiff claims personal injury from motor vehicle accident."
    spans = ext._matched_spans(text, limit=5)
    assert len(spans) >= 1
    kinds = {s["match"].lower() for s in spans}
    assert "personal injury" in kinds or any("motor vehicle" in s for s in kinds)


def test_row_to_export_without_enrich_truncates():
    row = {
        "id": "row-1",
        "source": "test",
        "added": "",
        "created": "",
        "metadata": {},
        "text": "x" * 100,
    }
    out = ext.row_to_export(row, 20, enrich=False, full_text=row["text"])
    assert out["text"] == "x" * 20
    assert out["text_truncated"] is True
    assert out["text_length"] == 100
    assert "clearcaseiq" not in out


def test_row_to_export_with_enrich():
    row = {"id": "row-2", "source": "CAP", "text": "Dog bite and medical malpractice claim.", "metadata": {}}
    out = ext.row_to_export(row, None, enrich=True, full_text=row["text"])
    assert out["clearcaseiq"]["claim_type_hints"]
    assert "dog_bite" in out["clearcaseiq"]["claim_type_hints"]
    assert "medmal" in out["clearcaseiq"]["claim_type_hints"]


def test_pi_pattern_matches_known_terms():
    assert ext.PI_PATTERN.search("premises liability") is not None
    assert ext.PI_PATTERN.search("unrelated contract dispute about rent") is None


def test_main_returns_1_when_datasets_missing(monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv", ["extract_personal_injury.py"])
    orig_import = builtins.__import__

    def imp(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "datasets":
            raise ImportError("No module named 'datasets'")
        return orig_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", imp)
    assert ext.main() == 1
    err = capsys.readouterr().err
    assert "pip install" in err.lower()


def test_main_writes_jsonl(tmp_path, monkeypatch, capsys):
    rows = [
        {"id": "r1", "text": "Slip and fall premises liability claim.", "source": "s", "metadata": {}},
        {"id": "r2", "text": "Breach of contract about rent only.", "source": "s", "metadata": {}},
        {"id": "r3", "text": "Another personal injury motor vehicle accident.", "source": "s", "metadata": {}},
    ]
    fake = types.ModuleType("datasets")
    fake.load_dataset = lambda *args, **kwargs: iter(rows)
    monkeypatch.setitem(sys.modules, "datasets", fake)
    out = tmp_path / "matches.jsonl"
    monkeypatch.setattr(
        sys,
        "argv",
        ["extract_personal_injury.py", "--out", str(out), "--max-rows", "50", "--text-max", "0"],
    )
    assert ext.main() == 0
    lines = [ln for ln in out.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert len(lines) == 2
    ids = {json.loads(ln)["id"] for ln in lines}
    assert ids == {"r1", "r3"}
    cap = capsys.readouterr().out
    assert "matches written: 2" in cap


def test_main_respects_max_matches(tmp_path, monkeypatch):
    rows = [
        {"id": f"r{i}", "text": "Personal injury claim number %d." % i, "source": "s", "metadata": {}}
        for i in range(5)
    ]
    fake = types.ModuleType("datasets")
    fake.load_dataset = lambda *args, **kwargs: iter(rows)
    monkeypatch.setitem(sys.modules, "datasets", fake)
    out = tmp_path / "cap.jsonl"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "extract_personal_injury.py",
            "--out",
            str(out),
            "--max-rows",
            "99",
            "--max-matches",
            "1",
            "--text-max",
            "100",
        ],
    )
    assert ext.main() == 0
    assert len([ln for ln in out.read_text(encoding="utf-8").splitlines() if ln.strip()]) == 1


def test_main_enrich_flag(tmp_path, monkeypatch):
    rows = [
        {"id": "e1", "text": "Dog bite and medical malpractice.", "source": "s", "metadata": {}},
    ]
    fake = types.ModuleType("datasets")
    fake.load_dataset = lambda *args, **kwargs: iter(rows)
    monkeypatch.setitem(sys.modules, "datasets", fake)
    out = tmp_path / "enriched.jsonl"
    monkeypatch.setattr(
        sys,
        "argv",
        ["extract_personal_injury.py", "--out", str(out), "--max-rows", "5", "--text-max", "200", "--enrich"],
    )
    assert ext.main() == 0
    rec = json.loads(out.read_text(encoding="utf-8").strip())
    assert "clearcaseiq" in rec
    assert rec["clearcaseiq"]["claim_type_hints"]
