"""
Run a small relaxed-schema Phase B extraction batch from Supabase queued cases.

This is meant for debugging and validating the extraction pipeline after the
original strict schema failed. It:
1. Reads queued `cases_raw` rows from Supabase
2. Calls the OpenAI API with a stricter JSON-only prompt
3. Normalizes tolerant output into the database schema shape
4. Upserts successful rows into `case_extractions`
5. Prints a compact run summary

Cursor Composer 2 is not available as an OpenAI `model` id. To try Composer on real
text: use `--dump-first-prompt` (copy output into Cursor Composer), then
`--apply-json-file` with the JSON Composer returns to upsert one row.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


PROMPT_VERSION = "cap_pi_extract_relaxed_v2"
DEFAULT_MODEL_NAME = "gpt-5.4-mini"
COMPOSER_MANUAL_MODEL_NAME = "cursor-composer-2-manual"
SOURCE_NAME = "CaselawAccessProject"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model",
        default=os.getenv("PHASE_B_MODEL") or os.getenv("OPENAI_MODEL") or DEFAULT_MODEL_NAME,
        help=(
            "OpenAI API model id for normal runs (e.g. gpt-5.4-mini, gpt-4o-mini). "
            "Also stored in case_extractions.model_name. "
            "Composer 2 is not an OpenAI id — use --dump-first-prompt + --apply-json-file instead."
        ),
    )
    parser.add_argument("--limit", type=int, default=100, help="Number of queued cases to process")
    parser.add_argument("--max-input-chars", type=int, default=120000, help="Opinion text cap")
    parser.add_argument(
        "--mark-complete",
        action="store_true",
        help="Mark successful rows as needs_gpt_extraction=false",
    )
    parser.add_argument(
        "--dump-first-prompt",
        action="store_true",
        help=(
            "Fetch one case from Supabase and print the extraction prompt only "
            "(for pasting into Cursor Composer). Default: first queued row; or use --case-id. "
            "Does not call OpenAI. OPENAI_API_KEY is not required for this mode."
        ),
    )
    parser.add_argument(
        "--apply-json-file",
        metavar="PATH",
        default=None,
        help=(
            "Read JSON from a file (e.g. Composer output), normalize, upsert into "
            "case_extractions. Targets the first queued row unless --case-id is set."
        ),
    )
    parser.add_argument(
        "--case-id",
        default=None,
        metavar="ID",
        help=(
            "With --dump-first-prompt or --apply-json-file: use this cases_raw.case_id "
            "instead of the first queued row (prefilter_label=keep, needs_gpt_extraction=true)."
        ),
    )
    return parser.parse_args()


def read_text_file_robust(path: Path) -> str:
    raw_bytes = path.read_bytes()
    for encoding in ("utf-8", "utf-8-sig", "utf-16", "utf-16-le", "utf-16-be", "latin-1"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw_bytes.decode("utf-8", errors="replace")


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    raw_bytes = path.read_bytes()
    text = None
    for encoding in ("utf-8", "utf-8-sig", "utf-16", "utf-16-le", "utf-16-be", "latin-1"):
        try:
            text = raw_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        return values
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def get_required_env(name: str, file_values: dict[str, str]) -> str:
    value = os.getenv(name) or file_values.get(name)
    if not value:
        raise RuntimeError(f"Missing required setting: {name}")
    return value


def http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: Any | None = None,
    timeout: int = 60,
) -> tuple[int, dict[str, str], str]:
    data = None
    request_headers = dict(headers)
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        return response.status, dict(response.headers.items()), body


def extract_first_json_object(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
      text = text.removeprefix("```json").removeprefix("```").rstrip("`").strip()

    start = text.find("{")
    if start < 0:
        raise ValueError("No JSON object start found")

    depth = 0
    in_string = False
    escape = False
    for idx in range(start, len(text)):
        char = text[idx]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : idx + 1]

    raise ValueError("No complete JSON object found")


def normalize_confidence(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {"overall": 0.0, "damages": 0.0, "injury": 0.0, "liability": 0.0}

    overall = value.get("overall")
    if overall is None:
        overall = value.get("score", 0.0)
    try:
        overall = float(overall)
    except Exception:
        overall = 0.0

    def num(key: str) -> float:
        raw = value.get(key, overall)
        try:
            return float(raw)
        except Exception:
            return overall

    return {
        "overall": overall,
        "damages": num("damages"),
        "injury": num("injury"),
        "liability": num("liability"),
    }


def normalize_extraction(data: dict[str, Any], *, case_id: str, source_url: str | None) -> dict[str, Any]:
    normalized = dict(data)
    normalized["case_id"] = normalized.get("case_id") or case_id
    normalized["source_name"] = normalized.get("source_name") or SOURCE_NAME
    normalized["source_url"] = normalized.get("source_url") or source_url
    normalized["court_level"] = normalized.get("court_level") or "unknown"
    normalized["procedural_posture"] = normalized.get("procedural_posture") or "unknown"
    normalized["case_type"] = normalized.get("case_type") or "not_pi"
    normalized["is_plaintiff_pi_case"] = bool(normalized.get("is_plaintiff_pi_case", False))
    normalized["citations"] = normalized.get("citations") if isinstance(normalized.get("citations"), list) else []

    injury_flags = normalized.get("injury_flags")
    if not isinstance(injury_flags, dict):
        injury_flags = {}
    normalized["injury_flags"] = {
        "soft_tissue": injury_flags.get("soft_tissue"),
        "spine": injury_flags.get("spine"),
        "surgery": injury_flags.get("surgery"),
        "tbi": injury_flags.get("tbi"),
        "fracture": injury_flags.get("fracture"),
        "death": injury_flags.get("death"),
        "permanency": injury_flags.get("permanency"),
    }

    treatment_features = normalized.get("treatment_features")
    if not isinstance(treatment_features, dict):
        treatment_features = {}
    normalized["treatment_features"] = {
        "er_visit": treatment_features.get("er_visit"),
        "hospitalization": treatment_features.get("hospitalization"),
        "pt": treatment_features.get("pt"),
        "injections": treatment_features.get("injections"),
        "future_treatment": treatment_features.get("future_treatment"),
        "treatment_duration_days": treatment_features.get("treatment_duration_days"),
    }

    damages = normalized.get("damages")
    if not isinstance(damages, dict):
        damages = {}
    normalized["damages"] = {
        "medical_expenses_past": damages.get("medical_expenses_past"),
        "medical_expenses_future": damages.get("medical_expenses_future"),
        "lost_wages_past": damages.get("lost_wages_past"),
        "lost_earning_capacity": damages.get("lost_earning_capacity"),
        "pain_suffering": damages.get("pain_suffering"),
        "punitive": damages.get("punitive"),
        "consortium": damages.get("consortium"),
        "property_damage": damages.get("property_damage"),
        "total_award": damages.get("total_award"),
        "settlement_amount": damages.get("settlement_amount"),
        "final_recoverable_amount": damages.get("final_recoverable_amount"),
    }

    liability = normalized.get("liability")
    if not isinstance(liability, dict):
        liability = {}
    normalized["liability"] = {
        "plaintiff_win": liability.get("plaintiff_win"),
        "comparative_fault_percent": liability.get("comparative_fault_percent"),
        "liability_strength": liability.get("liability_strength") or "unclear",
    }

    insurance = normalized.get("insurance")
    if not isinstance(insurance, dict):
        insurance = {}
    normalized["insurance"] = {
        "policy_limit_amount": insurance.get("policy_limit_amount"),
        "policy_limit_mentioned": insurance.get("policy_limit_mentioned"),
    }

    value_signals = normalized.get("value_signals")
    if not isinstance(value_signals, dict):
        value_signals = {}
    normalized["value_signals"] = {
        "verdict_mentioned": bool(value_signals.get("verdict_mentioned", False)),
        "settlement_mentioned": bool(value_signals.get("settlement_mentioned", False)),
        "remittitur_mentioned": bool(value_signals.get("remittitur_mentioned", False)),
        "damages_discussed": bool(value_signals.get("damages_discussed", False)),
    }

    evidence_spans = normalized.get("evidence_spans")
    if isinstance(evidence_spans, list) or not isinstance(evidence_spans, dict):
        evidence_spans = {}
    normalized["evidence_spans"] = {
        "injury_text": evidence_spans.get("injury_text") if isinstance(evidence_spans.get("injury_text"), list) else [],
        "damages_text": evidence_spans.get("damages_text") if isinstance(evidence_spans.get("damages_text"), list) else [],
        "liability_text": evidence_spans.get("liability_text") if isinstance(evidence_spans.get("liability_text"), list) else [],
    }

    normalized["confidence"] = normalize_confidence(normalized.get("confidence"))
    normalized["decision_year"] = normalized.get("decision_year")
    normalized["injury_summary"] = normalized.get("injury_summary")
    normalized["jurisdiction_state"] = normalized.get("jurisdiction_state")
    normalized["court_name"] = normalized.get("court_name")
    return normalized


def build_prompt(case_id: str, source_url: str | None, opinion_text: str) -> str:
    return f"""You are extracting structured plaintiff-side personal injury case-value data from a judicial opinion.

Return ONLY valid JSON.
Do not use markdown.
Do not add commentary.

You must ALWAYS include every top-level field.
If a field is unknown, use null.
If a boolean field is unknown, use false.
If a required text field is unclear, use \"unknown\".

Required defaults:
- court_level: use \"unknown\" if unclear
- procedural_posture: use \"unknown\" if unclear
- liability.liability_strength: use one of \"strong\", \"medium\", \"weak\", or \"unclear\"
- value_signals.verdict_mentioned: always true/false
- value_signals.settlement_mentioned: always true/false
- value_signals.remittitur_mentioned: always true/false
- value_signals.damages_discussed: always true/false
- confidence.overall: always 0 to 1
- confidence.damages: always 0 to 1
- confidence.injury: always 0 to 1
- confidence.liability: always 0 to 1
- evidence_spans must be an object with injury_text, damages_text, liability_text arrays

If this is not plaintiff-side PI:
- is_plaintiff_pi_case = false
- case_type = \"not_pi\"

Schema:
{{
  "case_id": "string",
  "source_name": "CaselawAccessProject",
  "source_url": "string or null",
  "jurisdiction_state": "string or null",
  "court_name": "string or null",
  "court_level": "string",
  "decision_year": 2024,
  "case_type": "auto_pi | premises | med_mal | product_liability | wrongful_death | other_pi | not_pi",
  "is_plaintiff_pi_case": true,
  "procedural_posture": "string",
  "injury_summary": "string or null",
  "injury_flags": {{
    "soft_tissue": true,
    "spine": false,
    "surgery": false,
    "tbi": false,
    "fracture": false,
    "death": false,
    "permanency": false
  }},
  "treatment_features": {{
    "er_visit": true,
    "hospitalization": false,
    "pt": false,
    "injections": false,
    "future_treatment": false,
    "treatment_duration_days": null
  }},
  "damages": {{
    "medical_expenses_past": null,
    "medical_expenses_future": null,
    "lost_wages_past": null,
    "lost_earning_capacity": null,
    "pain_suffering": null,
    "punitive": null,
    "consortium": null,
    "property_damage": null,
    "total_award": null,
    "settlement_amount": null,
    "final_recoverable_amount": null
  }},
  "liability": {{
    "plaintiff_win": null,
    "comparative_fault_percent": null,
    "liability_strength": "unclear"
  }},
  "insurance": {{
    "policy_limit_amount": null,
    "policy_limit_mentioned": null
  }},
  "value_signals": {{
    "verdict_mentioned": false,
    "settlement_mentioned": false,
    "remittitur_mentioned": false,
    "damages_discussed": false
  }},
  "citations": [],
  "confidence": {{
    "overall": 0.0,
    "damages": 0.0,
    "injury": 0.0,
    "liability": 0.0
  }},
  "evidence_spans": {{
    "injury_text": [],
    "damages_text": [],
    "liability_text": []
  }}
}}

Metadata:
- case_id: {case_id}
- source_url: {source_url}

Opinion text:
{opinion_text}
"""


def call_openai(api_key: str, prompt: str, *, model: str) -> str:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a careful legal extraction system. Output only valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    status, _, body = http_json(
        "POST",
        OPENAI_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        payload=payload,
        timeout=120,
    )
    if status != 200:
        raise RuntimeError(f"OpenAI request failed with status {status}")
    data = json.loads(body)
    return data["choices"][0]["message"]["content"]


def fetch_cases(supabase_url: str, supabase_key: str, limit: int) -> list[dict[str, Any]]:
    select = urllib.parse.quote("case_id,source_name,source_url,opinion_text", safe=",")
    url = (
        f"{supabase_url}/rest/v1/cases_raw"
        f"?select={select}&prefilter_label=eq.keep&needs_gpt_extraction=eq.true&limit={limit}"
    )
    _, _, body = http_json(
        "GET",
        url,
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
        timeout=120,
    )
    return json.loads(body)


def fetch_case_by_id(supabase_url: str, supabase_key: str, case_id: str) -> list[dict[str, Any]]:
    select = urllib.parse.quote("case_id,source_name,source_url,opinion_text", safe=",")
    encoded = urllib.parse.quote(case_id, safe="")
    url = f"{supabase_url}/rest/v1/cases_raw?select={select}&case_id=eq.{encoded}&limit=1"
    _, _, body = http_json(
        "GET",
        url,
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
        timeout=120,
    )
    return json.loads(body)


def upsert_extraction(
    supabase_url: str,
    supabase_key: str,
    normalized: dict[str, Any],
    raw_output: dict[str, Any],
    *,
    model_name: str,
) -> None:
    payload = {
        "case_id": normalized["case_id"],
        "source_name": normalized["source_name"],
        "model_name": model_name,
        "model_version": model_name,
        "prompt_version": PROMPT_VERSION,
        "is_plaintiff_pi_case": normalized["is_plaintiff_pi_case"],
        "case_type": normalized["case_type"],
        "jurisdiction_state": normalized["jurisdiction_state"],
        "court_name": normalized["court_name"],
        "court_level": normalized["court_level"],
        "decision_year": normalized["decision_year"],
        "procedural_posture": normalized["procedural_posture"],
        "injury_summary": normalized["injury_summary"],
        "injury_flags_json": normalized["injury_flags"],
        "treatment_features_json": normalized["treatment_features"],
        "damages_json": normalized["damages"],
        "liability_json": normalized["liability"],
        "insurance_json": normalized["insurance"],
        "value_signals_json": normalized["value_signals"],
        "citations_json": normalized["citations"],
        "evidence_spans_json": normalized["evidence_spans"],
        "confidence_json": normalized["confidence"],
        "raw_llm_output": raw_output,
        "validation_status": "valid",
        "validation_errors_json": [],
    }
    url = f"{supabase_url}/rest/v1/case_extractions?on_conflict=case_id,model_name,prompt_version"
    http_json(
        "POST",
        url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        payload=payload,
        timeout=120,
    )


def mark_case_complete(supabase_url: str, supabase_key: str, case_id: str) -> None:
    encoded = urllib.parse.quote(case_id, safe="")
    url = f"{supabase_url}/rest/v1/cases_raw?case_id=eq.{encoded}"
    http_json(
        "PATCH",
        url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Prefer": "return=minimal",
        },
        payload={"needs_gpt_extraction": False},
        timeout=60,
    )


def fetch_inserted_samples(
    supabase_url: str,
    supabase_key: str,
    limit: int = 10,
    *,
    model_name: str,
) -> list[dict[str, Any]]:
    select = urllib.parse.quote(
        "case_id,case_type,is_plaintiff_pi_case,court_level,procedural_posture,injury_summary,damages_json,confidence_json,extracted_at",
        safe=",",
    )
    url = (
        f"{supabase_url}/rest/v1/case_extractions"
        f"?select={select}&model_name=eq.{urllib.parse.quote(model_name, safe='')}"
        f"&prompt_version=eq.{urllib.parse.quote(PROMPT_VERSION, safe='')}"
        f"&order=extracted_at.desc&limit={limit}"
    )
    _, _, body = http_json(
        "GET",
        url,
        headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
        timeout=60,
    )
    return json.loads(body)


def main() -> int:
    args = parse_args()
    if args.dump_first_prompt and args.apply_json_file:
        print("Use only one of --dump-first-prompt or --apply-json-file", file=sys.stderr)
        return 2
    if args.case_id and not (args.dump_first_prompt or args.apply_json_file):
        print("--case-id is only valid with --dump-first-prompt or --apply-json-file", file=sys.stderr)
        return 2

    env_values: dict[str, str] = {}
    env_values.update(load_env_file(Path(".env")))
    env_values.update(load_env_file(Path("apps/api/.env")))

    supabase_url = get_required_env("SUPABASE_URL", env_values).rstrip("/")
    supabase_key = get_required_env("SUPABASE_SERVICE_ROLE_KEY", env_values)

    if args.dump_first_prompt:
        if args.case_id:
            cases = fetch_case_by_id(supabase_url, supabase_key, args.case_id.strip())
            if not cases:
                print(f"cases_raw has no row for case_id={args.case_id!r}", file=sys.stderr)
                return 1
        else:
            cases = fetch_cases(supabase_url, supabase_key, 1)
            if not cases:
                print("No queued cases (prefilter_label=keep, needs_gpt_extraction=true).", file=sys.stderr)
                return 1
        case = cases[0]
        case_id = case["case_id"]
        source_url = case.get("source_url")
        opinion_text = (case.get("opinion_text") or "")[: args.max_input_chars]
        prompt = build_prompt(case_id, source_url, opinion_text)
        print(
            f"# Paste the block below into Cursor Composer (or any model). case_id={case_id}\n",
            file=sys.stderr,
        )
        sys.stdout.write(prompt)
        return 0

    if args.apply_json_file:
        json_path = Path(args.apply_json_file)
        if not json_path.is_file():
            print(f"File not found: {json_path}", file=sys.stderr)
            return 1
        if args.case_id:
            cases = fetch_case_by_id(supabase_url, supabase_key, args.case_id.strip())
            if not cases:
                print(f"cases_raw has no row for case_id={args.case_id!r}", file=sys.stderr)
                return 1
        else:
            cases = fetch_cases(supabase_url, supabase_key, 1)
            if not cases:
                print("No queued cases (prefilter_label=keep, needs_gpt_extraction=true).", file=sys.stderr)
                return 1
        case = cases[0]
        case_id = case["case_id"]
        source_url = case.get("source_url")
        raw_text = read_text_file_robust(json_path)
        raw_json = json.loads(extract_first_json_object(raw_text))
        normalized = normalize_extraction(raw_json, case_id=case_id, source_url=source_url)
        model_name = args.model.strip()
        if model_name == DEFAULT_MODEL_NAME:
            model_name = COMPOSER_MANUAL_MODEL_NAME
        upsert_extraction(supabase_url, supabase_key, normalized, raw_json, model_name=model_name)
        if args.mark_complete:
            mark_case_complete(supabase_url, supabase_key, case_id)
        samples = fetch_inserted_samples(supabase_url, supabase_key, 10, model_name=model_name)
        print(
            json.dumps(
                {
                    "mode": "apply-json-file",
                    "case_id": case_id,
                    "case_id_source": "explicit --case-id" if args.case_id else "first queued row",
                    "model": model_name,
                    "samples": samples,
                },
                indent=2,
            )
        )
        return 0

    openai_key = get_required_env("OPENAI_API_KEY", env_values)
    model_name = args.model.strip()

    cases = fetch_cases(supabase_url, supabase_key, args.limit)
    if not cases:
        print(
            json.dumps(
                {"processed": 0, "success": 0, "failed": 0, "samples": [], "model": model_name},
                indent=2,
            )
        )
        return 0

    success = 0
    failures: list[dict[str, str]] = []
    for idx, case in enumerate(cases, start=1):
        case_id = case["case_id"]
        source_url = case.get("source_url")
        opinion_text = (case.get("opinion_text") or "")[: args.max_input_chars]
        try:
            prompt = build_prompt(case_id, source_url, opinion_text)
            raw_text = call_openai(openai_key, prompt, model=model_name)
            raw_json = json.loads(extract_first_json_object(raw_text))
            normalized = normalize_extraction(raw_json, case_id=case_id, source_url=source_url)
            upsert_extraction(supabase_url, supabase_key, normalized, raw_json, model_name=model_name)
            if args.mark_complete:
                mark_case_complete(supabase_url, supabase_key, case_id)
            success += 1
        except Exception as exc:  # noqa: BLE001
            failures.append({"case_id": case_id, "error": str(exc)})
        if idx % 10 == 0:
            print(f"Processed {idx}/{len(cases)} | success={success} | failed={len(failures)}", file=sys.stderr)
            time.sleep(0.2)

    samples = fetch_inserted_samples(supabase_url, supabase_key, 10, model_name=model_name)
    result = {
        "processed": len(cases),
        "success": success,
        "failed": len(failures),
        "failure_examples": failures[:10],
        "samples": samples,
        "model": model_name,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
