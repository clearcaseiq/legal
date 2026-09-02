import { logger } from './logger'
import { llmChatDisabled, resolveLlmChat } from './llm-client'
import { llmAllowPhi, redactLlmPii } from './llm-prompt-sanitize'

/**
 * Structured details extracted from a claimant's free-text incident narrative.
 * All fields are best-effort and may be null when the model is unsure — the UI
 * treats every value as a *suggestion* the claimant confirms or edits.
 *
 * Every enum here mirrors an option list in IntakeWizardQuick. They are kept
 * in lockstep deliberately: the client applies these values straight onto the
 * form, so a value the form does not offer is worse than no value at all — it
 * silently fails to select anything. `coerce` below is the guard.
 */
export interface IncidentExtraction {
  /** Vehicle crash category. Mirrors VEHICLE_CRASH_OPTIONS on the client. */
  crashType:
    | 'rear_end'
    | 'side_impact'
    | 'head_on'
    | 'left_turn'
    | 'multi_vehicle'
    | 'pedestrian'
    | 'bicycle'
    | 'not_sure'
    | null
  /** Who the claimant appears to blame. Mirrors FAULT_PARTY_OPTIONS. */
  atFault: 'other_driver' | 'shared' | 'not_sure' | null
  /** Whether the narrative describes a motor-vehicle incident. */
  isVehicle: boolean
  /** Tri-state signals for common evidence the narrative may (not) mention. */
  policeReport: 'yes' | 'no' | 'unknown'
  witnesses: 'yes' | 'no' | 'unknown'
  photos: 'yes' | 'no' | 'unknown'
  /** Incident date as ISO `YYYY-MM-DD`, resolved against the request date. */
  incidentDate: string | null
  /** Two-letter US state code. */
  state: string | null
  /** County name without the word "County"; validated client-side per state. */
  county: string | null
  /** Mirrors INJURY_SEVERITY_OPTIONS. */
  injurySeverity: 'minor' | 'moderate' | 'serious' | 'surgery' | 'unsure' | null
  /** First treating facility. Mirrors MEDICAL_TREATMENT_OPTION_DEFS. */
  firstCare: 'er' | 'urgent_care' | 'primary_care' | 'other' | 'none' | null
  /** How soon care began. Mirrors CARE_TIMING_OPTION_DEFS. */
  careTiming:
    | 'same_day'
    | 'next_day'
    | 'within_2_3_days'
    | 'within_week'
    | 'more_than_week'
    | 'not_sure'
    | null
  /** Whether an ambulance attended. Transport, not a facility. */
  emsResponded: 'yes' | 'no' | 'unknown'
  /** Mirrors BODY_PART_OPTION_DEFS. */
  bodyParts: Array<
    'neck' | 'lower_back' | 'shoulder' | 'knee' | 'head_concussion' | 'hand_wrist' | 'hip' | 'other'
  >
  /** One short, plain-language sentence summarizing what happened. */
  summary: string
  /** 0..1 self-reported confidence in the structured fields. */
  confidence: number
}

const BODY_PARTS = [
  'neck',
  'lower_back',
  'shoulder',
  'knee',
  'head_concussion',
  'hand_wrist',
  'hip',
  'other',
] as const

const SYSTEM_PROMPT = `You are an intake assistant for a US personal-injury law platform. You read a short, plain-language description of an accident written by an injured person and extract structured facts.

Respond with ONLY a single JSON object (no markdown, no prose) matching exactly this shape:
{
  "crashType": "rear_end" | "side_impact" | "head_on" | "left_turn" | "multi_vehicle" | "pedestrian" | "bicycle" | "not_sure" | null,
  "atFault": "other_driver" | "shared" | "not_sure" | null,
  "isVehicle": boolean,
  "policeReport": "yes" | "no" | "unknown",
  "witnesses": "yes" | "no" | "unknown",
  "photos": "yes" | "no" | "unknown",
  "incidentDate": string | null,
  "state": string | null,
  "county": string | null,
  "injurySeverity": "minor" | "moderate" | "serious" | "surgery" | "unsure" | null,
  "firstCare": "er" | "urgent_care" | "primary_care" | "other" | "none" | null,
  "careTiming": "same_day" | "next_day" | "within_2_3_days" | "within_week" | "more_than_week" | "not_sure" | null,
  "emsResponded": "yes" | "no" | "unknown",
  "bodyParts": string[],
  "summary": string,
  "confidence": number
}

Rules:
- Never invent facts. Use null, "unknown" or "not_sure" whenever the text does not say.
- Only set crashType/atFault when isVehicle is true; otherwise use null.
- policeReport/witnesses/photos/emsResponded = "yes" only if clearly stated, "no" only if the text says none or denies it, otherwise "unknown".
- incidentDate: ISO "YYYY-MM-DD". Resolve relative phrases ("last Tuesday", "three weeks ago") against TODAY given below. Null if the text gives no usable timing. Never guess a date from context such as weather or holidays.
- state: two-letter US code (e.g. "CA"). county: the county name only, without the word "County". Infer county from a named city only when it is unambiguous; otherwise null.
- injurySeverity: "surgery" only if surgery happened or was recommended. "serious" for fractures, herniation, hospitalization, or ongoing severe limits. "moderate" for continuing treatment. "minor" for soreness or bruising that resolved. "unsure" if unclear.
- firstCare: where they FIRST received care. An ambulance ride to a hospital is "er" with emsResponded "yes". "none" only if the text says they were not treated.
- bodyParts: only from this list, and only parts the text actually mentions being hurt: ${BODY_PARTS.join(', ')}. Empty array if none are named.
- summary: <= 140 chars, neutral, factual.
- confidence: your overall confidence (0..1) in the structured fields.`

interface ExtractInput {
  narrative: string
  injuryType?: string
}

/**
 * Reject a date the model produced that cannot be a real incident date.
 *
 * The model resolves relative phrases against a date we hand it, which it
 * sometimes gets wrong by a year. A future date or one from decades ago is
 * always an error, and one that reaches the form silently sets the statute of
 * limitations clock to the wrong value — the single most damaging field to get
 * wrong on this screen.
 */
function coerceIncidentDate(value: unknown, today: Date): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  // Round-trip guard: "2026-02-31" parses but is not the date it claims.
  if (parsed.toISOString().slice(0, 10) !== value) return null
  if (parsed.getTime() > today.getTime()) return null
  const twentyYearsAgo = new Date(today)
  twentyYearsAgo.setUTCFullYear(twentyYearsAgo.getUTCFullYear() - 20)
  if (parsed.getTime() < twentyYearsAgo.getTime()) return null
  return value
}

function coerce(raw: any, today: Date): IncidentExtraction {
  const enumOr = <T extends string>(v: unknown, allowed: readonly T[], fallback: T | null): T | null =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  const tri = (v: unknown): 'yes' | 'no' | 'unknown' =>
    v === 'yes' || v === 'no' ? v : 'unknown'
  const isVehicle = raw?.isVehicle === true
  const bodyParts = Array.isArray(raw?.bodyParts)
    ? Array.from(
        new Set(
          raw.bodyParts.filter((part: unknown): part is (typeof BODY_PARTS)[number] =>
            typeof part === 'string' && (BODY_PARTS as readonly string[]).includes(part),
          ),
        ),
      )
    : []
  return {
    isVehicle,
    crashType: isVehicle
      ? enumOr(raw?.crashType, ['rear_end', 'side_impact', 'head_on', 'left_turn', 'multi_vehicle', 'pedestrian', 'bicycle', 'not_sure'] as const, null)
      : null,
    atFault: isVehicle ? enumOr(raw?.atFault, ['other_driver', 'shared', 'not_sure'] as const, null) : null,
    policeReport: tri(raw?.policeReport),
    witnesses: tri(raw?.witnesses),
    photos: tri(raw?.photos),
    incidentDate: coerceIncidentDate(raw?.incidentDate, today),
    state: typeof raw?.state === 'string' && /^[A-Za-z]{2}$/.test(raw.state.trim())
      ? raw.state.trim().toUpperCase()
      : null,
    county: typeof raw?.county === 'string' && raw.county.trim()
      ? raw.county.trim().replace(/\s+County\s*$/i, '').slice(0, 60)
      : null,
    injurySeverity: enumOr(raw?.injurySeverity, ['minor', 'moderate', 'serious', 'surgery', 'unsure'] as const, null),
    firstCare: enumOr(raw?.firstCare, ['er', 'urgent_care', 'primary_care', 'other', 'none'] as const, null),
    careTiming: enumOr(
      raw?.careTiming,
      ['same_day', 'next_day', 'within_2_3_days', 'within_week', 'more_than_week', 'not_sure'] as const,
      null,
    ),
    emsResponded: tri(raw?.emsResponded),
    bodyParts,
    summary: typeof raw?.summary === 'string' ? raw.summary.slice(0, 160) : '',
    confidence: typeof raw?.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1 ? raw.confidence : 0.5,
  }
}

/** Exported for unit tests; not part of the route surface. */
export const __testables = { coerce, coerceIncidentDate }

/**
 * Extract structured incident details from a narrative via the shared LLM
 * client. Returns null when OpenAI is not configured, when the PHI gate is
 * closed, or when the call fails — callers should degrade gracefully.
 */
export async function extractIncidentDetails({ narrative, injuryType }: ExtractInput): Promise<IncidentExtraction | null> {
  if (llmChatDisabled()) {
    logger.warn('No LLM chat provider configured — skipping incident extraction')
    return null
  }
  // Narratives are medical/incident PHI — do not send until LLM_ALLOW_PHI=true.
  if (!llmAllowPhi()) {
    logger.info('Skipping incident extraction — LLM_ALLOW_PHI=false (keys-only mode)')
    return null
  }
  const resolved = resolveLlmChat()
  if (!resolved) return null

  const text = (narrative || '').trim()
  if (text.length < 20) return null

  // Contact/identity PII is stripped before any provider sees the narrative.
  const safeNarrative = redactLlmPii(text).slice(0, 4000)
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const userContent = `TODAY: ${todayIso}\nInjury type selected by the claimant: ${injuryType || 'unknown'}\n\nNarrative:\n"""\n${safeNarrative}\n"""`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const completion = await resolved.client.chat.completions.create(
      {
        model: resolved.model,
        temperature: 0,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      },
      { signal: controller.signal },
    )
    clearTimeout(timeout)

    const rawText = (completion.choices?.[0]?.message?.content || '').trim()
    if (!rawText) return null

    // The model is instructed to return raw JSON; strip any accidental code fences.
    const jsonText = rawText.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(jsonText)
    return coerce(parsed, today)
  } catch (error: any) {
    logger.error('Incident extraction failed', {
      error: error?.message,
      model: resolved.model,
      provider: resolved.provider,
    })
    return null
  }
}
