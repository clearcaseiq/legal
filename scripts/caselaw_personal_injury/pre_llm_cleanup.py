"""Deterministic cleanup before sending CAP opinions to an LLM."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re
import unicodedata
from typing import Any

from clearcaseiq_caselaw_signals import enrich_clearcaseiq


PREPROCESS_VERSION = "cap_pre_llm_clean_v1"

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_LINE_END_HYPHEN = re.compile(r"(?<=[A-Za-z])-\s*\n\s*(?=[a-z])")
_HORIZONTAL_SPACE = re.compile(r"[ \t\f\v]+")
_BLANK_LINES = re.compile(r"\n{3,}")
_CAP_PAGE_MARKER = re.compile(r"^\s*\*?\s*\d{1,4}\s*$")
_CAP_STAR_PAGE = re.compile(r"\*\s*\d{1,4}\b")
_YEAR = re.compile(r"\b(18\d{2}|19\d{2}|20\d{2})\b")
_COURT_LINE = re.compile(
    r"\b("
    r"Supreme Court|Appellate Court|Court of Appeals|District Court|Superior Court|"
    r"Circuit Court|City Court|County Court|Probate Court"
    r")\b[^\n]{0,120}",
    re.IGNORECASE,
)

_STATE_PREFIXES = {
    "ala": "AL",
    "alaska": "AK",
    "ariz": "AZ",
    "ark": "AR",
    "cal": "CA",
    "colo": "CO",
    "conn": "CT",
    "del": "DE",
    "fla": "FL",
    "ga": "GA",
    "ill": "IL",
    "ind": "IN",
    "iowa": "IA",
    "kan": "KS",
    "ky": "KY",
    "la": "LA",
    "me": "ME",
    "md": "MD",
    "mass": "MA",
    "mich": "MI",
    "minn": "MN",
    "miss": "MS",
    "mo": "MO",
    "mont": "MT",
    "neb": "NE",
    "nev": "NV",
    "nh": "NH",
    "nj": "NJ",
    "nm": "NM",
    "ny": "NY",
    "nc": "NC",
    "nd": "ND",
    "ohio": "OH",
    "okla": "OK",
    "or": "OR",
    "pa": "PA",
    "ri": "RI",
    "sc": "SC",
    "sd": "SD",
    "tenn": "TN",
    "tex": "TX",
    "utah": "UT",
    "vt": "VT",
    "va": "VA",
    "wash": "WA",
    "wva": "WV",
    "wis": "WI",
    "wyo": "WY",
}

_SIGNAL_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("death", re.compile(r"\b(wrongful\s+death|survival\s+action|decedent|deceased|fatal|fatally|killed|died|death\s+of|estate\s+of|administrator)\b", re.I)),
    ("railroad", re.compile(r"\b(train|railroad|railway|streetcar|locomotive|rail\s+crossing|railroad\s+track)\b", re.I)),
    ("workplace", re.compile(r"\b(worker|employee|employer|workplace|mine|factory|construction|industrial|machinery|uncoupl)\b", re.I)),
    ("auto", re.compile(r"\b(automobile|motor\s+vehicle|truck|bus|motorcycle|pedestrian|bicycle|highway|collision|car\s+crash)\b", re.I)),
    ("premises", re.compile(r"\b(sidewalk|premises|stairs?|landlord|tenant|store|warehouse|slip|trip|fall|fell|hole|ice)\b", re.I)),
    ("med_mal", re.compile(r"\b(medical\s+malpractice|hospital|physician|doctor|nurse|surgery|diagnos|treatment)\b", re.I)),
    ("product", re.compile(r"\b(product\s+liability|defect(?:ive)?|failure\s+to\s+warn|manufactur(?:e|ing)|machine|tool)\b", re.I)),
    ("damages", re.compile(r"\b(damages|verdict|judgment|award(?:ed)?|settlement|remittitur|medical\s+bills?|lost\s+wages|pain\s+and\s+suffering|\$\s*\d)\b", re.I)),
    ("liability", re.compile(r"\b(negligence|comparative\s+negligence|contributory\s+negligence|proximate\s+cause|duty|breach|liable|liability)\b", re.I)),
]


@dataclass(frozen=True)
class PreLLMOpinion:
    text: str
    known_metadata: dict[str, Any]
    heuristic_hints: dict[str, Any]
    metrics: dict[str, Any]
    skip_reason: str | None = None


def clean_opinion_text(text: str) -> str:
    """Clean OCR/reporting noise while preserving legal substance."""
    if not text:
        return ""

    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL_CHARS.sub("", text)
    text = _LINE_END_HYPHEN.sub("", text)
    text = _CAP_STAR_PAGE.sub("", text)

    cleaned_lines: list[str] = []
    previous = ""
    for raw_line in text.split("\n"):
        line = _HORIZONTAL_SPACE.sub(" ", raw_line).strip()
        if _CAP_PAGE_MARKER.match(line):
            continue
        if line and line == previous:
            continue
        cleaned_lines.append(line)
        previous = line

    text = "\n".join(cleaned_lines).strip()
    text = _BLANK_LINES.sub("\n\n", text)
    return text


def extract_known_metadata(case_id: str, source_url: str | None, text: str) -> dict[str, Any]:
    """Infer low-risk metadata cheaply before model extraction."""
    head = text[:4000]
    state = _state_from_case_id(case_id)
    years = [int(match.group(1)) for match in _YEAR.finditer(head)]
    court_match = _COURT_LINE.search(head)
    return {
        "preprocess_version": PREPROCESS_VERSION,
        "jurisdiction_state_hint": state,
        "decision_year_hint": years[0] if years else None,
        "court_name_hint": _squash_line(court_match.group(0)) if court_match else None,
        "source_url": source_url,
    }


def build_prompt_text(cleaned_text: str, max_chars: int) -> tuple[str, dict[str, Any]]:
    """Select head, signal windows, and tail instead of blind truncation."""
    signal_labels = _signal_labels(cleaned_text)
    if max_chars <= 0 or len(cleaned_text) <= max_chars:
        return cleaned_text, {
            "strategy": "full_text",
            "selected_signal_windows": [],
            "signal_labels_found": signal_labels,
        }

    head_chars = max(500, int(max_chars * 0.30))
    tail_chars = max(300, int(max_chars * 0.12))
    window_budget = max(0, max_chars - head_chars - tail_chars - 400)
    window_radius = 700

    windows: list[tuple[int, int, str]] = []
    seen_labels: set[str] = set()
    for label, pattern in _SIGNAL_PATTERNS:
        for match in pattern.finditer(cleaned_text):
            start = max(0, match.start() - window_radius)
            end = min(len(cleaned_text), match.end() + window_radius)
            windows.append((start, end, label))
            seen_labels.add(label)
            if len([w for w in windows if w[2] == label]) >= 4:
                break

    selected = _merge_and_trim_windows(windows, window_budget)
    parts = [
        cleaned_text[:head_chars].strip(),
        _format_windows(cleaned_text, selected),
        cleaned_text[-tail_chars:].strip(),
    ]
    prompt_text = "\n\n[...SELECTED RELEVANT WINDOWS...]\n\n".join(part for part in parts if part)
    if len(prompt_text) > max_chars:
        prompt_text = prompt_text[: max_chars - 80].rstrip() + "\n\n[...PREPROCESS TRUNCATED...]"
    return prompt_text, {
        "strategy": "head_windows_tail",
        "selected_signal_windows": [{"start": start, "end": end, "labels": labels} for start, end, labels in selected],
        "signal_labels_found": sorted(seen_labels),
    }


def prepare_opinion_for_llm(
    *,
    case_id: str,
    source_url: str | None,
    opinion_text: str,
    max_chars: int,
) -> PreLLMOpinion:
    raw_text = opinion_text or ""
    cleaned = clean_opinion_text(raw_text)
    prompt_text, selection_metrics = build_prompt_text(cleaned, max_chars)
    hints = enrich_clearcaseiq(cleaned)
    if _SIGNAL_PATTERNS[0][1].search(cleaned):
        claim_type_hints = list(hints.get("claim_type_hints", []))
        if "wrongful_death" not in claim_type_hints:
            claim_type_hints.append("wrongful_death")
        hints["claim_type_hints"] = claim_type_hints
    skip_reason = _skip_reason(cleaned, hints)
    metrics = {
        "preprocess_version": PREPROCESS_VERSION,
        "raw_sha256": hashlib.sha256(raw_text.encode("utf-8", errors="ignore")).hexdigest(),
        "raw_char_count": len(raw_text),
        "cleaned_char_count": len(cleaned),
        "prompt_char_count": len(prompt_text),
        **selection_metrics,
    }
    return PreLLMOpinion(
        text=prompt_text,
        known_metadata=extract_known_metadata(case_id, source_url, cleaned),
        heuristic_hints=_compact_hints(hints),
        metrics=metrics,
        skip_reason=skip_reason,
    )


def _state_from_case_id(case_id: str) -> str | None:
    prefix = (case_id or "").split("/", 1)[0].split("_", 1)[0].lower()
    return _STATE_PREFIXES.get(prefix)


def _signal_labels(text: str) -> list[str]:
    return sorted(label for label, pattern in _SIGNAL_PATTERNS if pattern.search(text))


def _skip_reason(text: str, hints: dict[str, Any]) -> str | None:
    if len(text.strip()) < 500:
        return "too_little_text"
    if not hints.get("claim_type_hints") and not hints.get("damages_language") and not hints.get("liability_signals"):
        return "low_signal_text"
    return None


def _compact_hints(hints: dict[str, Any]) -> dict[str, Any]:
    return {
        "claim_type_hints": hints.get("claim_type_hints", []),
        "liability_signals": hints.get("liability_signals", []),
        "damages_language": hints.get("damages_language", []),
        "injury_severity_proxy": hints.get("injury_severity_proxy", {}),
        "caption_plaintiff_focus": hints.get("caption_plaintiff_focus"),
        "monetary_mentions_near_resolution": hints.get("monetary_mentions_near_resolution", [])[:5],
    }


def _merge_and_trim_windows(
    windows: list[tuple[int, int, str]],
    budget: int,
) -> list[tuple[int, int, list[str]]]:
    if budget <= 0 or not windows:
        return []

    windows = sorted(windows, key=lambda item: (item[0], item[1]))
    merged: list[tuple[int, int, set[str]]] = []
    for start, end, label in windows:
        if merged and start <= merged[-1][1] + 120:
            prev_start, prev_end, labels = merged[-1]
            labels.add(label)
            merged[-1] = (prev_start, max(prev_end, end), labels)
        else:
            merged.append((start, end, {label}))

    selected: list[tuple[int, int, list[str]]] = []
    used = 0
    for start, end, labels in merged:
        length = end - start
        if used + length > budget:
            remaining = budget - used
            if remaining < 300:
                break
            end = start + remaining
            length = remaining
        selected.append((start, end, sorted(labels)))
        used += length
        if used >= budget:
            break
    return selected


def _format_windows(text: str, windows: list[tuple[int, int, list[str]]]) -> str:
    blocks: list[str] = []
    for start, end, labels in windows:
        snippet = text[start:end].strip()
        if snippet:
            blocks.append(f"[window labels={','.join(labels)} chars={start}-{end}]\n{snippet}")
    return "\n\n".join(blocks)


def _squash_line(value: str) -> str:
    return _HORIZONTAL_SPACE.sub(" ", value.replace("\n", " ")).strip(" .,-")
