"""Tests for every function in clearcaseiq_caselaw_signals."""
from __future__ import annotations

import clearcaseiq_caselaw_signals as cciq


def test_uniq_preserve_dedupes_order():
    assert cciq._uniq_preserve(["a", "b", "a", "c"]) == ["a", "b", "c"]
    assert cciq._uniq_preserve([]) == []


def test_injury_severity_proxy_catastrophic():
    r = cciq._injury_severity_proxy("wrongful death after crash")
    assert r["level"] == 4
    assert r["label"] == "catastrophic_or_death"


def test_injury_severity_proxy_severe():
    r = cciq._injury_severity_proxy("patient needed surgery for fracture")
    assert r["level"] == 3
    assert r["label"] == "severe"


def test_injury_severity_proxy_moderate():
    r = cciq._injury_severity_proxy("whiplash and physical therapy")
    assert r["level"] == 2


def test_injury_severity_proxy_mild():
    r = cciq._injury_severity_proxy("minor bruise to elbow")
    assert r["level"] == 1


def test_injury_severity_proxy_unknown():
    r = cciq._injury_severity_proxy("the court held jurisdiction")
    assert r["level"] is None
    assert r["label"] == "unknown"


def test_monetary_near_resolution_finds_dollar_near_settlement():
    text = "The parties settled for $125,000 after mediation."
    rows = cciq._monetary_near_resolution(text, limit=5)
    assert len(rows) >= 1
    assert "$125,000" in rows[0]["amount_raw"] or "125,000" in rows[0]["amount_raw"]


def test_monetary_near_resolution_empty_when_no_context():
    assert cciq._monetary_near_resolution("damages including pain") == []


def test_caption_plaintiff_side_true():
    cap = "John DOE, Plaintiff, v. ACME Corp., Defendant.\n\nOn appeal..."
    assert cciq._caption_plaintiff_side(cap) is True


def test_caption_plaintiff_side_false():
    assert cciq._caption_plaintiff_side("UNITED STATES v. Smith") is False


def test_enrich_clearcaseiq_combines_signals():
    text = (
        "Slip and fall at store. Comparative negligence and pain and suffering. "
        "Verdict for plaintiff for $50,000. Medicare not discussed."
    )
    out = cciq.enrich_clearcaseiq(text)
    assert "slip_and_fall" in out["claim_type_hints"]
    assert "comparative_negligence" in out["liability_signals"]
    assert "pain_suffering" in out["damages_language"]
    assert out["caption_plaintiff_focus"] is False
    assert isinstance(out["monetary_mentions_near_resolution"], list)
