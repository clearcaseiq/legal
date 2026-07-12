import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { ENV } from '../env'

// Reuse the same OpenAI credential resolution as the analysis service.
const openai = (ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY })
  : null

const SCENE_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
const SCENE_BRIEF_MODEL = process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini'

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Best-effort scrub of obvious personal identifiers before the text is handed to the
 * image model. This is a lightweight safety net (the prompt also instructs the model
 * to anonymize) — it removes street addresses, phone numbers, emails, and full names
 * introduced by "Mr./Ms./Dr." titles, replacing people with a generic role.
 */
function redactIdentifiers(text: string): string {
  if (!text) return ''
  return text
    // emails
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted]')
    // phone numbers
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]')
    // street addresses like "123 Main St"
    .replace(/\b\d{1,6}\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+(Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Highway|Hwy)\b\.?/g, 'the roadway')
    // titled names: "Mr. Smith", "Dr. Jane Doe"
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Miss)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g, 'the party')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Build a prompt for a clean, defensible schematic reconstruction diagram of the
 * incident — intentionally a technical top-down line-drawing (like a police report
 * diagram), NOT a photorealistic scene. Keeps it neutral and free of identifiable
 * people, gore, logos, or invented specifics.
 */
export function buildScenePrompt(input: {
  claimType?: string | null
  location?: string | null
  narrative?: string | null
  fault?: string | null
  parties?: string[] | null
}): string {
  const claim = input.claimType ? titleCase(input.claimType) : 'Personal injury'
  // Location is used only as loose context; drop anything that looks like a full
  // street address so we don't leak identifying details into the diagram.
  const location = redactIdentifiers(input.location?.trim() || '') || 'unspecified location'
  const narrative = redactIdentifiers((input.narrative || '').trim()).slice(0, 900)
  const fault = input.fault ? titleCase(input.fault) : null
  const partyCount = (input.parties || []).filter(Boolean).length

  const lines = [
    'Create a clean, professional top-down SCHEMATIC RECONSTRUCTION DIAGRAM of a personal-injury incident,',
    'in the style of a police accident report or an insurance diagram: flat vector line-drawing, white background,',
    'simple labeled shapes, directional movement arrows, and a clear point-of-impact / point-of-injury marker.',
    'Include a small legend. Use neutral, muted colors. Absolutely NO photorealism, NO identifiable faces or people,',
    'NO blood or graphic injury, and NO brand logos.',
    '',
    'PRIVACY — VERY IMPORTANT: Do NOT write any personal names, addresses, phone numbers, license plates,',
    'dates, or other identifying text anywhere in the image. Label everyone by generic ROLE only, e.g.',
    '"Plaintiff", "Defendant", "Driver 1"/"Driver 2", "Vehicle A"/"Vehicle B", or "Pedestrian".',
    'If the description below mentions any real names, ignore those names and use the generic role labels instead.',
    'Keep on-image text to short role labels and a small legend only — no sentences or paragraphs.',
    '',
    `Incident type: ${claim}.`,
    `Location context (general area only): ${location}.`,
  ]
  if (fault) lines.push(`Alleged fault: ${fault}.`)
  if (partyCount > 1) lines.push(`Number of parties/vehicles involved: ${partyCount} (label them generically).`)
  if (narrative) lines.push(`What happened (reconstruct only what is described; anonymize all people): ${narrative}`)
  else lines.push('No detailed narrative is available; produce a generic, representative diagram for this incident type.')

  return lines.join('\n')
}

/**
 * Convert the raw incident description into a fully ANONYMIZED spatial brief using the
 * text model, BEFORE anything reaches the image model. Image models routinely render
 * any names they are given, so the reliable fix is to never hand them real names —
 * we strip identifiers with the chat model (and a regex safety net) up front.
 * Returns null on any failure so the caller can fall back to a redacted narrative.
 */
async function anonymizeIncidentBrief(input: {
  claimType: string
  location: string | null
  narrative: string | null
  fault: string | null
  partyCount: number
}): Promise<string | null> {
  if (!openai || !input.narrative) return null
  try {
    const completion = await openai.chat.completions.create({
      model: SCENE_BRIEF_MODEL,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You convert a personal-injury incident description into a short, fully ANONYMIZED spatial brief used to draw a top-down schematic diagram. ' +
            'Absolute rules: NEVER include any personal names, addresses, phone numbers, license plates, specific dates, or business/brand names. ' +
            'Refer to people and vehicles ONLY by generic role: Plaintiff, Defendant, Driver 1/Driver 2, Vehicle A/Vehicle B, Pedestrian, Cyclist. ' +
            'In 2–4 concise sentences, describe the layout, each party\u2019s direction of travel, and the point of impact/injury. No preamble, no names.',
        },
        {
          role: 'user',
          content:
            `Claim type: ${input.claimType}\n` +
            `General area: ${input.location || 'unspecified'}\n` +
            `Alleged fault: ${input.fault || 'unspecified'}\n` +
            `Parties/vehicles involved: ${input.partyCount || 'unspecified'}\n` +
            `Description: ${input.narrative}`,
        },
      ],
    })
    const brief = completion.choices?.[0]?.message?.content?.trim()
    return brief ? redactIdentifiers(brief) : null
  } catch (err: any) {
    logger.warn('Scene brief anonymization failed; falling back to redacted narrative', {
      error: err?.message,
    })
    return null
  }
}

function extractFacts(factsRaw: string | null | undefined) {
  let facts: any = {}
  try {
    facts = factsRaw ? JSON.parse(factsRaw) : {}
  } catch {
    facts = {}
  }
  const incident = facts?.incident || {}
  return {
    location: incident.location || null,
    narrative: incident.narrative || facts?.damages?.pain_suffering_narrative || null,
    fault: facts?.liability?.fault || null,
    parties: Array.isArray(incident.parties) ? incident.parties : null,
    validatedClaimType: facts?.caseTypeValidation?.validatedClaimType || null,
  }
}

/**
 * Generate (or regenerate) the AI incident-scene schematic for an assessment.
 * Fire-and-forget safe: never throws. Writes a PNG under uploads/scenes and stores
 * a relative /uploads/scenes/... URL on the assessment.
 *
 * @param force  when false, skips generation if an image already exists / is pending.
 */
export async function generateSceneImageForAssessment(
  assessmentId: string,
  opts: { force?: boolean } = {},
): Promise<{ ok: boolean; url?: string; status: string; reason?: string }> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        facts: true,
        sceneImageUrl: true,
        sceneImageStatus: true,
      },
    })
    if (!assessment) return { ok: false, status: 'failed', reason: 'assessment_not_found' }

    if (!opts.force) {
      if (assessment.sceneImageStatus === 'pending') return { ok: true, status: 'pending' }
      if (assessment.sceneImageUrl && assessment.sceneImageStatus === 'ready') {
        return { ok: true, url: assessment.sceneImageUrl, status: 'ready' }
      }
    }

    if (!openai) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { sceneImageStatus: 'failed' },
      }).catch(() => {})
      logger.warn('Scene image skipped — OpenAI API key not configured', { assessmentId })
      return { ok: false, status: 'failed', reason: 'openai_not_configured' }
    }

    // Mark as pending so the UI can show a "generating…" state.
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { sceneImageStatus: 'pending' },
    }).catch(() => {})

    const parsed = extractFacts(assessment.facts)
    const location =
      parsed.location ||
      [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') ||
      null
    // Anonymize the narrative with the text model first (image models leak names),
    // falling back to a regex-redacted narrative if that call is unavailable.
    const partyCount = (parsed.parties || []).filter(Boolean).length
    const brief =
      (await anonymizeIncidentBrief({
        claimType: parsed.validatedClaimType || assessment.claimType,
        location,
        narrative: parsed.narrative,
        fault: parsed.fault,
        partyCount,
      })) || redactIdentifiers(parsed.narrative || '')

    const prompt = buildScenePrompt({
      claimType: parsed.validatedClaimType || assessment.claimType,
      location,
      narrative: brief,
      fault: parsed.fault,
      parties: parsed.parties,
    })

    const result = await openai.images.generate({
      model: SCENE_IMAGE_MODEL,
      prompt,
      size: '1536x1024',
      // gpt-image-1 accepts low/medium/high; medium balances cost and legibility.
      quality: 'medium' as any,
    } as any)

    const b64 = result?.data?.[0]?.b64_json
    if (!b64) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { sceneImageStatus: 'failed', sceneImagePrompt: prompt },
      }).catch(() => {})
      return { ok: false, status: 'failed', reason: 'no_image_returned' }
    }

    const dir = path.join(process.cwd(), 'uploads', 'scenes')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const fileName = `scene-${assessmentId}-${randomUUID()}.png`
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(b64, 'base64'))
    const url = `/uploads/scenes/${fileName}`

    // Best-effort cleanup of a previous scene file to avoid orphan buildup.
    if (assessment.sceneImageUrl && assessment.sceneImageUrl !== url) {
      const oldPath = path.join(process.cwd(), assessment.sceneImageUrl.replace(/^\//, ''))
      fs.promises.unlink(oldPath).catch(() => {})
    }

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        sceneImageUrl: url,
        sceneImagePrompt: prompt,
        sceneImageStatus: 'ready',
        sceneImageDate: new Date(),
      },
    })

    logger.info('Incident scene image generated', { assessmentId, url })
    return { ok: true, url, status: 'ready' }
  } catch (err: any) {
    logger.error('Failed to generate incident scene image', { assessmentId, error: err?.message })
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { sceneImageStatus: 'failed' },
    }).catch(() => {})
    return { ok: false, status: 'failed', reason: err?.message || 'error' }
  }
}
