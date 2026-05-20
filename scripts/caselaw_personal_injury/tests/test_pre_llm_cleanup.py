"""Tests for pre-LLM opinion cleanup and prompt packing."""
from __future__ import annotations

import pre_llm_cleanup as cleanup


def test_clean_opinion_text_normalizes_whitespace_and_page_markers():
    raw = "\n\n  Caption v. Defendant  \n\n\n  *123 Plaintiff was injured.\n\n  124  \n\nJudgment affirmed.\x00"

    out = cleanup.clean_opinion_text(raw)

    assert out.startswith("Caption v. Defendant")
    assert "*123" not in out
    assert "\x00" not in out
    assert "\n\n\n" not in out
    assert "124" not in out


def test_clean_opinion_text_dehyphenates_line_broken_words():
    raw = "The plaintiff suffered per-\nmanent injury after negli-\ngent operation of a streetcar."

    out = cleanup.clean_opinion_text(raw)

    assert "permanent injury" in out
    assert "negligent operation" in out


def test_build_prompt_text_selects_signal_windows_when_truncating():
    text = (
        "Caption and syllabus. " + ("background only. " * 300)
        + "The employee was injured in a railroad workplace accident. "
        + "The jury awarded damages of $50,000 after finding negligence. "
        + ("procedural text. " * 300)
        + "Judgment affirmed."
    )

    packed, metrics = cleanup.build_prompt_text(cleanup.clean_opinion_text(text), 2500)

    assert len(packed) <= 2500
    assert metrics["strategy"] == "head_windows_tail"
    assert "railroad workplace accident" in packed
    assert "damages of $50,000" in packed
    assert {"railroad", "workplace", "damages", "liability"}.issubset(set(metrics["signal_labels_found"]))


def test_prepare_opinion_preserves_death_rail_and_workplace_signals():
    raw = (
        "The Wabash Railway Company v. Smith, Administrator of the Estate.\n"
        "Filed at Mt. Vernon January 31, 1883.\n"
        "The deceased employee was killed while working around railroad cars. "
        "The administrator sought damages for death caused by negligence."
    )

    prepared = cleanup.prepare_opinion_for_llm(
        case_id="ill_105/html/0364-01.html",
        source_url="https://static.case.law/",
        opinion_text=raw,
        max_chars=4000,
    )

    assert prepared.known_metadata["jurisdiction_state_hint"] == "IL"
    assert prepared.known_metadata["decision_year_hint"] == 1883
    assert "wrongful_death" in prepared.heuristic_hints["claim_type_hints"]
    assert "railroad" in prepared.metrics["signal_labels_found"]
    assert "workplace" in prepared.metrics["signal_labels_found"]
    assert "deceased employee was killed" in prepared.text
