"""
Heuristic tags that align caselaw snippets with ClearCaseIQ product concepts.

Maps to (among others):
- Assessment.claimType: auto, slip_and_fall, dog_bite, medmal, product, nursing_home_abuse,
  wrongful_death, high_severity_surgery
- facts.damages: med_charges, wage_loss, ...
- prediction-style injury severity buckets (see apps/api/src/lib/prediction.ts)
- SettlementRecord-style interest: amounts, injury severity, claim type (for benchmark corpora)

This is not legal classification — only regex / keyword Features for search, ML labels, or QA.
"""
from __future__ import annotations

import re
from typing import Any

# Mirrors apps/web AssessmentWriteSchema / prisma claimType strings.
CLAIM_TYPE_SIGNALS: list[tuple[str, re.Pattern[str]]] = [
    (
        "auto",
        re.compile(
            r"\b(?:motor\s+vehicle|automobile|auto\s+accident|car\s+crash|rear-?end(?:ed)?|"
            r"uninsured\s+motorist|underinsured\s+motorist|UM\s*/\s*UIM)\b",
            re.I,
        ),
    ),
    (
        "slip_and_fall",
        re.compile(
            r"\b(?:slip\s+and\s+fall|trip\s+and\s+fall|premises\s+liability|"
            r"dangerous\s+condition|failure\s+to\s+maintain)\b",
            re.I,
        ),
    ),
    ("dog_bite", re.compile(r"\b(?:dog\s+bite|animal\s+attack|vicious\s+dog)\b", re.I)),
    (
        "medmal",
        re.compile(
            r"\b(?:medical\s+malpractice|physician(?:'s)?\s+duty|hospital\s+negligence|"
            r"misdiagnos(?:is|ed)|surgical\s+error|failure\s+to\s+diagnose)\b",
            re.I,
        ),
    ),
    (
        "product",
        re.compile(
            r"\b(?:product[s]?\s+liability|strict\s+liability|design\s+defect|"
            r"manufacturing\s+defect|failure\s+to\s+warn)\b",
            re.I,
        ),
    ),
    (
        "nursing_home_abuse",
        re.compile(
            r"\b(?:nursing\s+home|skilled\s+nursing\s+facility|long[- ]term\s+care|"
            r"elder\s+abuse|bedsore|pressure\s+ulcer)\b",
            re.I,
        ),
    ),
    ("wrongful_death", re.compile(r"\bwrongful\s+death\b", re.I)),
    (
        "high_severity_surgery",
        re.compile(
            r"\b(?:surgical\s+error|surgery\s+gone\s+wrong|catastrophic\s+injury|"
            r"permanent\s+disabilit|paraly[sz](?:is|ed)|amputat(?:e|ion))\b",
            re.I,
        ),
    ),
]

# Liability / fault concepts surfaced in apps/api/src/lib/prediction.ts (LiabilityScore) and caselaw.
LIABILITY_SIGNALS: list[tuple[str, re.Pattern[str]]] = [
    ("comparative_negligence", re.compile(r"\bcomparative\s+negligence\b", re.I)),
    ("contributory_negligence", re.compile(r"\bcontributory\s+negligence\b", re.I)),
    ("duty_breach", re.compile(r"\b(?:breach\s+of\s+duty|duty\s+of\s+care)\b", re.I)),
    ("proximate_cause", re.compile(r"\bproximate\s+cause\b", re.I)),
    ("res_ipsa", re.compile(r"\bres\s+ipsa\s+loquitur\b", re.I)),
    ("summary_judgment_liability", re.compile(r"\bsummary\s+judgment.*\bliabilit", re.I)),
    ("premises_duty", re.compile(r"\bpremises\s+liability\b|\blandlord(?:'s)?\s+duty\b", re.I)),
]

# Rough anchors for special / general damages language (not extracted dollar parsing).
DAMAGES_LANGUAGE: list[tuple[str, re.Pattern[str]]] = [
    ("medical_specials", re.compile(r"\b(?:medical\s+bills?|special\s+damages|economic\s+damages)\b", re.I)),
    ("lost_wages", re.compile(r"\b(?:lost\s+wages|loss\s+of\s+earnings|wage\s+loss)\b", re.I)),
    ("pain_suffering", re.compile(r"\b(?:pain\s+and\s+suffering|non-?economic\s+damages)\b", re.I)),
    ("punitive", re.compile(r"\bpunitive\s+damages\b", re.I)),
]

SETTLEMENT_OR_AWARD_CTX = re.compile(
    r"\b(?:settled|settlement|consent\s+judgment|stipulat|verdict|jury\s+award|"
    r"judgment\s+for\s+(?:the\s+)?plaintiff|award(?:ed)?\s+(?:of|in|\$)|"
    r"damages\s+(?:of|in|\$))\b",
    re.I,
)

DOLLAR = re.compile(r"\$\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s+dollars", re.I)

# injury_severity 0–4 style hints (subset of prediction.ts narratives).
_CATASTROPHIC = re.compile(
    r"\b(?:wrongful\s+death|fatal|died|deceased|coma|paraly[sz]|quadripleg|"
    r"permanent\s+disabilit|amputat)\b",
    re.I,
)
_SEVERE = re.compile(
    r"\b(?:surgery|surgical|hospitaliz|fracture|herniat|torn\s+(?:ligament|meniscus)|"
    r"traumatic\s+brain|subdural)\b",
    re.I,
)
_MODERATE = re.compile(
    r"\b(?:concussion|whiplash|strain|sprain|laceration|PT|physical\s+therapy)\b",
    re.I,
)
_MILD = re.compile(r"\b(?:bruise|contusion|minor\s+injur|soft\s+tissue)\b", re.I)


def _uniq_preserve(xs: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _injury_severity_proxy(text: str) -> dict[str, Any]:
    """Coarse label only; not a medical or legal determination."""
    if _CATASTROPHIC.search(text):
        return {"level": 4, "label": "catastrophic_or_death", "source": "keyword"}
    if _SEVERE.search(text):
        return {"level": 3, "label": "severe", "source": "keyword"}
    if _MODERATE.search(text):
        return {"level": 2, "label": "moderate", "source": "keyword"}
    if _MILD.search(text):
        return {"level": 1, "label": "mild", "source": "keyword"}
    return {"level": None, "label": "unknown", "source": "none"}


def _monetary_near_resolution(text: str, limit: int = 25) -> list[dict[str, Any]]:
    """Pull dollar strings that appear near settlement / verdict / damages language."""
    out: list[dict[str, Any]] = []
    for m in SETTLEMENT_OR_AWARD_CTX.finditer(text):
        start = max(0, m.start() - 120)
        end = min(len(text), m.end() + 120)
        window = text[start:end]
        for dm in DOLLAR.finditer(window):
            out.append(
                {
                    "amount_raw": dm.group(0)[:80],
                    "context_snippet": window.replace("\n", " ")[:240],
                }
            )
            if len(out) >= limit:
                return out
    return out


def _caption_plaintiff_side(text: str, head_chars: int = 800) -> bool:
    head = text[:head_chars].lower()
    return "plaintiff" in head and ("v." in head or " vs." in head or " versus " in head)


def enrich_clearcaseiq(text: str) -> dict[str, Any]:
    """
    Returns a JSON-serializable dict aligned with ClearCaseIQ intake / benchmarks vocabulary.
    """
    claim_type_hints = [name for name, pat in CLAIM_TYPE_SIGNALS if pat.search(text)]
    liability_signals = [name for name, pat in LIABILITY_SIGNALS if pat.search(text)]
    damages_language = [name for name, pat in DAMAGES_LANGUAGE if pat.search(text)]

    return {
        "claim_type_hints": _uniq_preserve(claim_type_hints),
        "liability_signals": _uniq_preserve(liability_signals),
        "damages_language": _uniq_preserve(damages_language),
        "monetary_mentions_near_resolution": _monetary_near_resolution(text),
        "injury_severity_proxy": _injury_severity_proxy(text),
        "caption_plaintiff_focus": _caption_plaintiff_side(text),
    }
