import { ENV } from '../env'
import { logger } from './logger'

/**
 * Structured details extracted from a claimant's free-text incident narrative.
 * All fields are best-effort and may be null when the model is unsure — the UI
 * treats every value as a *suggestion* the claimant confirms or edits.
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
  /** One short, plain-language sentence summarizing what happened. */
  summary: string
  /** 0..1 self-reported confidence in the structured fields. */
  confidence: number
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are an intake assistant for a US personal-injury law platform. You read a short, plain-language description of an accident written by an injured person and extract structured facts.

Respond with ONLY a single JSON object (no markdown, no prose) matching exactly this shape:
{
  "crashType": "rear_end" | "side_impact" | "head_on" | "left_turn" | "multi_vehicle" | "pedestrian" | "bicycle" | "not_sure" | null,
  "atFault": "other_driver" | "shared" | "not_sure" | null,
  "isVehicle": boolean,
  "policeReport": "yes" | "no" | "unknown",
  "witnesses": "yes" | "no" | "unknown",
  "photos": "yes" | "no" | "unknown",
  "summary": string,
  "confidence": number
}

Rules:
- Only set crashType/atFault when isVehicle is true; otherwise use null.
- Use "not_sure"/null when the text is ambiguous. Never invent facts.
- policeReport/witnesses/photos = "yes" only if clearly stated, "no" only if the text says none, otherwise "unknown".
- summary: <= 140 chars, neutral, factual.
- confidence: your overall confidence (0..1) in the structured fields.`

interface ExtractInput {
  narrative: string
  injuryType?: string
}

function coerce(raw: any): IncidentExtraction {
  const enumOr = <T extends string>(v: unknown, allowed: readonly T[], fallback: T | null): T | null =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
  const tri = (v: unknown): 'yes' | 'no' | 'unknown' =>
    v === 'yes' || v === 'no' ? v : 'unknown'
  const isVehicle = raw?.isVehicle === true
  return {
    isVehicle,
    crashType: isVehicle
      ? enumOr(raw?.crashType, ['rear_end', 'side_impact', 'head_on', 'left_turn', 'multi_vehicle', 'pedestrian', 'bicycle', 'not_sure'] as const, null)
      : null,
    atFault: isVehicle ? enumOr(raw?.atFault, ['other_driver', 'shared', 'not_sure'] as const, null) : null,
    policeReport: tri(raw?.policeReport),
    witnesses: tri(raw?.witnesses),
    photos: tri(raw?.photos),
    summary: typeof raw?.summary === 'string' ? raw.summary.slice(0, 160) : '',
    confidence: typeof raw?.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1 ? raw.confidence : 0.5,
  }
}

/**
 * Extract structured incident details from a narrative using Claude.
 * Returns null when the feature is unavailable (no key) or the call fails —
 * callers should degrade gracefully (the manual form still works).
 */
export async function extractIncidentDetails({ narrative, injuryType }: ExtractInput): Promise<IncidentExtraction | null> {
  const apiKey = ENV.ANTHROPIC_API_KEY
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY not configured — skipping incident extraction')
    return null
  }
  const text = (narrative || '').trim()
  if (text.length < 20) return null

  const userContent = `Injury type selected by the claimant: ${injuryType || 'unknown'}\n\nNarrative:\n"""\n${text.slice(0, 4000)}\n"""`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ENV.ANTHROPIC_MODEL,
        max_tokens: 400,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      logger.error('Anthropic extraction request failed', { status: resp.status, detail: detail.slice(0, 500) })
      return null
    }

    const data = (await resp.json()) as { content?: Array<{ type?: string; text?: string }> }
    const rawText = (data.content || []).map((b) => (b?.type === 'text' ? b.text : '')).join('').trim()
    if (!rawText) return null

    // The model is instructed to return raw JSON; strip any accidental code fences.
    const jsonText = rawText.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(jsonText)
    return coerce(parsed)
  } catch (error: any) {
    logger.error('Incident extraction failed', { error: error?.message })
    return null
  }
}
