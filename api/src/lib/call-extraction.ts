/**
 * Turns a finished Amazon Connect call into a usable transcript + summary.
 *
 * Two paths, in order of preference:
 *   1. Contact Lens — Amazon Connect writes a post-call analysis JSON to S3 with
 *      speaker-labeled transcript + sentiment (and, with generative analytics, a
 *      summary). We parse that directly. Cheapest + richest.
 *   2. Amazon Transcribe fallback — if Contact Lens output isn't available we run
 *      a batch transcription job on the recording object itself.
 *
 * In both cases the raw transcript is then run through the shared LLM client to
 * produce a case-oriented summary, action items, and key facts.
 */
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { prisma } from './prisma'
import { logger } from './logger'
import { ENV } from '../env'
import { getLlmChatClient, LLM_CHAT_MODEL } from './llm-client'

// Recordings + Contact Lens output + Transcribe jobs all live in the Connect
// instance region, which can differ from AWS_REGION (Textract/SES).
const region = ENV.CONNECT_REGION

let s3: S3Client | null = null
let transcribe: TranscribeClient | null = null

function getS3(): S3Client {
  if (!s3) s3 = new S3Client({ region })
  return s3
}
function getTranscribe(): TranscribeClient {
  if (!transcribe) transcribe = new TranscribeClient({ region })
  return transcribe
}

export type TranscriptSegment = {
  speaker: string // 'plaintiff' | 'attorney' | 'unknown'
  startMs: number
  endMs: number
  text: string
}

async function readS3Json(bucket: string, key: string): Promise<any | null> {
  try {
    const res = await getS3().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const body = await res.Body?.transformToString()
    if (!body) return null
    return JSON.parse(body)
  } catch (error: any) {
    logger.warn('call-extraction: failed to read S3 JSON', { bucket, key, error: error?.message })
    return null
  }
}

function roleToSpeaker(role: string | undefined): string {
  const r = (role || '').toUpperCase()
  if (r === 'AGENT') return 'attorney'
  if (r === 'CUSTOMER') return 'plaintiff'
  return 'unknown'
}

/**
 * Parse an Amazon Connect Contact Lens post-call analysis document into our
 * transcript shape. Defensive against schema drift between Connect versions.
 */
export function parseContactLensAnalysis(doc: any): {
  segments: TranscriptSegment[]
  fullText: string
  summary: string | null
  sentiment: string | null
} {
  const rawTurns: any[] = Array.isArray(doc?.Transcript) ? doc.Transcript : []
  const segments: TranscriptSegment[] = rawTurns.map((t) => ({
    speaker: roleToSpeaker(t.ParticipantRole || t.ParticipantId),
    startMs: Number(t.BeginOffsetMillis ?? t.beginOffsetMillis ?? 0),
    endMs: Number(t.EndOffsetMillis ?? t.endOffsetMillis ?? 0),
    text: String(t.Content ?? t.content ?? '').trim(),
  })).filter((s) => s.text)

  const fullText = segments
    .map((s) => `${labelForSpeaker(s.speaker)}: ${s.text}`)
    .join('\n')

  // Generative Contact Lens may include a summary; overall sentiment lives under
  // ConversationCharacteristics.
  const summary =
    doc?.ConversationCharacteristics?.ContactSummary?.PostContactSummary?.Content ||
    doc?.Summary ||
    null
  const sentiment =
    doc?.ConversationCharacteristics?.Sentiment?.OverallSentiment?.OverallSentiment ||
    doc?.ConversationCharacteristics?.Sentiment?.OverallSentiment ||
    null

  return { segments, fullText, summary: summary ? String(summary) : null, sentiment: normalizeSentiment(sentiment) }
}

function labelForSpeaker(speaker: string): string {
  if (speaker === 'attorney') return 'Attorney'
  if (speaker === 'plaintiff') return 'Client'
  return 'Speaker'
}

function normalizeSentiment(raw: any): string | null {
  const s = String(raw || '').toUpperCase()
  if (s.includes('POSITIVE')) return 'positive'
  if (s.includes('NEGATIVE')) return 'negative'
  if (s.includes('NEUTRAL') || s.includes('MIXED')) return 'neutral'
  return null
}

/**
 * Ingest a Contact Lens analysis object (the webhook gives us the exact S3
 * location) and persist a ready transcript, then enrich it with an LLM summary.
 */
export async function ingestContactLensAnalysis(callId: string, bucket: string, key: string): Promise<void> {
  const doc = await readS3Json(bucket, key)
  if (!doc) {
    await markTranscriptFailed(callId, 'contact_lens')
    return
  }
  const parsed = parseContactLensAnalysis(doc)
  await upsertTranscript(callId, {
    source: 'contact_lens',
    status: 'ready',
    fullText: parsed.fullText,
    segments: JSON.stringify(parsed.segments),
    sentiment: parsed.sentiment,
    summary: parsed.summary,
  })
  await enrichTranscriptWithLlm(callId).catch((e) =>
    logger.warn('call-extraction: LLM enrichment failed', { callId, error: e?.message }),
  )
}

/**
 * Fallback: run Amazon Transcribe on the recording object and persist the
 * result. Used when Contact Lens output is not available for the call.
 */
export async function transcribeRecording(callId: string): Promise<void> {
  const recording = await prisma.callRecording.findUnique({ where: { callId } })
  if (!recording?.s3Bucket || !recording?.s3Key) {
    logger.warn('call-extraction: no recording to transcribe', { callId })
    await markTranscriptFailed(callId, 'transcribe')
    return
  }

  await upsertTranscript(callId, { source: 'transcribe', status: 'processing' })

  const jobName = `caseiq-${callId}-${Date.now()}`
  const mediaUri = `s3://${recording.s3Bucket}/${recording.s3Key}`
  try {
    await getTranscribe().send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: (ENV.CALL_TRANSCRIBE_LANGUAGE as any) || 'en-US',
        Media: { MediaFileUri: mediaUri },
        Settings: { ShowSpeakerLabels: true, MaxSpeakerLabels: 2 },
      }),
    )
  } catch (error: any) {
    logger.error('call-extraction: StartTranscriptionJob failed', { callId, error: error?.message })
    await markTranscriptFailed(callId, 'transcribe')
    return
  }

  const result = await pollTranscriptionJob(jobName)
  if (!result?.transcriptUri) {
    await markTranscriptFailed(callId, 'transcribe')
    return
  }

  const transcriptDoc = await fetchTranscribeOutput(result.transcriptUri)
  if (!transcriptDoc) {
    await markTranscriptFailed(callId, 'transcribe')
    return
  }

  const { segments, fullText } = parseTranscribeOutput(transcriptDoc)
  await upsertTranscript(callId, {
    source: 'transcribe',
    status: 'ready',
    fullText,
    segments: JSON.stringify(segments),
  })
  await enrichTranscriptWithLlm(callId).catch((e) =>
    logger.warn('call-extraction: LLM enrichment failed', { callId, error: e?.message }),
  )
}

async function pollTranscriptionJob(
  jobName: string,
  { attempts = 40, delayMs = 5000 } = {},
): Promise<{ transcriptUri?: string } | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await getTranscribe().send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
      )
      const status = res.TranscriptionJob?.TranscriptionJobStatus
      if (status === 'COMPLETED') {
        return { transcriptUri: res.TranscriptionJob?.Transcript?.TranscriptFileUri }
      }
      if (status === 'FAILED') {
        logger.error('call-extraction: transcription job failed', {
          jobName,
          reason: res.TranscriptionJob?.FailureReason,
        })
        return null
      }
    } catch (error: any) {
      logger.warn('call-extraction: poll transcription failed', { jobName, error: error?.message })
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
  logger.warn('call-extraction: transcription job timed out', { jobName })
  return null
}

async function fetchTranscribeOutput(uri: string): Promise<any | null> {
  // Transcribe returns an https URL or an s3:// URI depending on config.
  try {
    if (uri.startsWith('s3://')) {
      const [, , bucket, ...keyParts] = uri.split('/')
      return await readS3Json(bucket, keyParts.join('/'))
    }
    const res = await fetch(uri)
    if (!res.ok) return null
    return await res.json()
  } catch (error: any) {
    logger.warn('call-extraction: failed to fetch transcribe output', { error: error?.message })
    return null
  }
}

function parseTranscribeOutput(doc: any): { segments: TranscriptSegment[]; fullText: string } {
  const items: any[] = doc?.results?.items || []
  const speakerSegments: any[] = doc?.results?.speaker_labels?.segments || []

  // Map each pronunciation item to a speaker label using the diarization ranges.
  const segments: TranscriptSegment[] = []
  if (speakerSegments.length) {
    for (const seg of speakerSegments) {
      const start = Number(seg.start_time) * 1000
      const end = Number(seg.end_time) * 1000
      const words = items
        .filter((it) => it.type === 'pronunciation' && Number(it.start_time) * 1000 >= start && Number(it.end_time) * 1000 <= end)
        .map((it) => it.alternatives?.[0]?.content)
        .filter(Boolean)
      const text = words.join(' ').trim()
      if (text) {
        segments.push({
          speaker: seg.speaker_label === 'spk_0' ? 'plaintiff' : 'attorney',
          startMs: Math.round(start),
          endMs: Math.round(end),
          text,
        })
      }
    }
  }

  const fullText =
    segments.length > 0
      ? segments.map((s) => `${labelForSpeaker(s.speaker)}: ${s.text}`).join('\n')
      : (doc?.results?.transcripts || []).map((t: any) => t.transcript).join(' ').trim()

  return { segments, fullText }
}

/**
 * Run the transcript through the shared LLM client to produce a case-oriented
 * summary, action items, key facts, and sentiment. Deterministic no-op when no
 * LLM is configured — the raw transcript is still available.
 */
export async function enrichTranscriptWithLlm(callId: string): Promise<void> {
  const transcript = await prisma.callTranscript.findUnique({ where: { callId } })
  if (!transcript?.fullText) return

  const llm = getLlmChatClient()
  if (!llm) {
    logger.info('call-extraction: no LLM configured; skipping summary', { callId })
    return
  }

  try {
    const completion = await llm.chat.completions.create({
      model: LLM_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a legal intake assistant. Summarize a recorded call between a personal-injury client and their attorney. Return strict JSON with keys: summary (2-4 sentence plain-language summary), actionItems (array of short follow-up strings for the legal team), keyFacts (array of short case-relevant facts stated on the call), sentiment (one of "positive","neutral","negative"). Do not invent facts not present in the transcript.',
        },
        {
          role: 'user',
          content: `Transcript:\n\n${transcript.fullText.slice(0, 12000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices?.[0]?.message?.content
    if (!raw) return
    const parsed = JSON.parse(raw)
    await prisma.callTranscript.update({
      where: { callId },
      data: {
        summary: typeof parsed.summary === 'string' ? parsed.summary : transcript.summary,
        actionItems: Array.isArray(parsed.actionItems) ? JSON.stringify(parsed.actionItems) : null,
        keyFacts: Array.isArray(parsed.keyFacts) ? JSON.stringify(parsed.keyFacts) : null,
        sentiment: normalizeSentiment(parsed.sentiment) || transcript.sentiment,
        processedAt: new Date(),
      },
    })
  } catch (error: any) {
    logger.warn('call-extraction: LLM summary failed', { callId, error: error?.message })
  }
}

async function upsertTranscript(
  callId: string,
  data: {
    source: string
    status: string
    fullText?: string
    segments?: string
    summary?: string | null
    sentiment?: string | null
  },
): Promise<void> {
  await prisma.callTranscript.upsert({
    where: { callId },
    create: {
      callId,
      source: data.source,
      language: (ENV.CALL_TRANSCRIBE_LANGUAGE as string) || 'en-US',
      status: data.status,
      fullText: data.fullText,
      segments: data.segments,
      summary: data.summary ?? undefined,
      sentiment: data.sentiment ?? undefined,
    },
    update: {
      source: data.source,
      status: data.status,
      fullText: data.fullText,
      segments: data.segments,
      summary: data.summary ?? undefined,
      sentiment: data.sentiment ?? undefined,
    },
  })
}

async function markTranscriptFailed(callId: string, source: string): Promise<void> {
  await prisma.callTranscript
    .upsert({
      where: { callId },
      create: { callId, source, status: 'failed' },
      update: { status: 'failed' },
    })
    .catch(() => undefined)
}
