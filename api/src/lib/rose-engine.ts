/**
 * Rose Intake Engine for ClearCaseIQ
 * Single-file implementation with:
 * - conversation state object
 * - required field matrix by case type
 * - JSON extractor prompt
 * - missing-field controller
 * - question generation prompt
 * - escalation classifier
 * - final intake summary generator
 */
import OpenAI from 'openai'
import { logger } from './logger'
import { ENV } from '../env'

const openai = (ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY })
  : null
const ROSE_LLM_MODEL = process.env.ROSE_LLM_MODEL ?? 'gpt-4o-mini'
const ROSE_LLM_TIMEOUT_MS = Number(process.env.ROSE_LLM_TIMEOUT_MS ?? 1800)

export type CaseType =
  | 'auto_accident'
  | 'slip_fall'
  | 'medical_malpractice'
  | 'other_pi'
  | 'unknown'

export type TreatmentLevel =
  | 'none'
  | 'self_care'
  | 'urgent_care'
  | 'er'
  | 'doctor'
  | 'physical_therapy'
  | 'hospitalization'
  | 'surgery'
  | 'unknown'

export type EvidenceType =
  | 'photos'
  | 'video'
  | 'police_report'
  | 'incident_report'
  | 'witness'
  | 'insurance_info'
  | 'medical_records'
  | 'medical_bills'
  | 'other'

export type EscalationDisposition =
  | 'continue_intake'
  | 'standard_review'
  | 'urgent_attorney_review'
  | 'manual_ops_review'
  | 'human_handoff'

export type ConversationPhase =
  | 'story_capture'
  | 'targeted_followup'
  | 'recap_confirmation'
  | 'completed'

export interface FieldValue<T> {
  value: T | null
  confidence: number
  source?: string
  raw?: string
  disputed?: boolean
}

export interface PlaintiffContact {
  full_name: FieldValue<string>
  phone: FieldValue<string>
  email: FieldValue<string>
  city: FieldValue<string>
  state: FieldValue<string>
}

export interface IntakeSchema {
  case_type: FieldValue<CaseType>
  incident_date: FieldValue<string>
  incident_date_raw: FieldValue<string>
  incident_location: FieldValue<string>
  incident_summary: FieldValue<string>
  injuries: FieldValue<string[]>
  treatment_level: FieldValue<TreatmentLevel>
  treatment_notes: FieldValue<string>
  evidence: FieldValue<EvidenceType[]>
  liability_facts: FieldValue<string[]>
  insurance_info: FieldValue<string>
  defendant_type: FieldValue<string>
  represented_already: FieldValue<boolean>
  catastrophic_signal: FieldValue<boolean>
  hospitalization_signal: FieldValue<boolean>
  surgery_signal: FieldValue<boolean>
  death_signal: FieldValue<boolean>
  distress_signal: FieldValue<boolean>
  plaintiff_contact: PlaintiffContact
}

export interface ConversationTurn {
  role: 'system' | 'assistant' | 'user' | 'tool'
  content: string
  timestamp: string
}

export interface ConversationState {
  conversation_id: string
  created_at: string
  updated_at: string
  current_step: ConversationPhase
  case_type_detected: CaseType
  turns: ConversationTurn[]
  schema: IntakeSchema
  missing_required_fields: string[]
  unclear_fields: string[]
  contradictions: string[]
  completion_score: number
  ready_for_submission: boolean
  disposition: EscalationDisposition
  disposition_reason?: string
  last_question?: string
  last_field_target?: string
  pending_review?: ConversationReview
}

export interface ExtractorResult {
  schema_updates: Record<string, unknown>
  contradictions: string[]
  ambiguities: string[]
  inferred_case_type?: CaseType
  confidence_overrides?: Record<string, number>
}

export interface MissingFieldResult {
  missing_required_fields: string[]
  unclear_fields: string[]
  ready_for_completion: boolean
  completion_score: number
}

export interface QuestionResult {
  next_question: string
  field_target: string
  reason: string
}

export interface EscalationResult {
  disposition: EscalationDisposition
  priority: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  queue_target?: string
}

export interface FinalSummaryResult {
  plaintiff_summary: string
  attorney_summary: string
  structured_payload: Record<string, unknown>
}

export interface ConversationReview {
  plaintiff_summary: string
  attorney_summary: string
  structured_payload: Record<string, unknown>
  missing_required_fields: string[]
  disposition: EscalationDisposition
  confirmation_prompt: string
}

export const REQUIRED_FIELD_MATRIX: Record<CaseType, string[]> = {
  unknown: [
    'case_type',
    'incident_date',
    'incident_location',
    'incident_summary',
    'injuries',
    'treatment_level',
    'plaintiff_contact.full_name',
    'plaintiff_contact.phone',
    'plaintiff_contact.state',
  ],
  auto_accident: [
    'case_type',
    'incident_date',
    'incident_location',
    'incident_summary',
    'injuries',
    'treatment_level',
    'liability_facts',
    'insurance_info',
    'plaintiff_contact.full_name',
    'plaintiff_contact.phone',
    'plaintiff_contact.state',
  ],
  slip_fall: [
    'case_type',
    'incident_date',
    'incident_location',
    'incident_summary',
    'injuries',
    'treatment_level',
    'liability_facts',
    'evidence',
    'plaintiff_contact.full_name',
    'plaintiff_contact.phone',
    'plaintiff_contact.state',
  ],
  medical_malpractice: [
    'case_type',
    'incident_date',
    'incident_location',
    'incident_summary',
    'injuries',
    'treatment_level',
    'defendant_type',
    'treatment_notes',
    'plaintiff_contact.full_name',
    'plaintiff_contact.phone',
    'plaintiff_contact.state',
  ],
  other_pi: [
    'case_type',
    'incident_date',
    'incident_location',
    'incident_summary',
    'injuries',
    'treatment_level',
    'plaintiff_contact.full_name',
    'plaintiff_contact.phone',
    'plaintiff_contact.state',
  ],
}

function fv<T>(value: T | null = null): FieldValue<T> {
  return { value, confidence: 0 }
}

export function createEmptySchema(): IntakeSchema {
  return {
    case_type: fv<CaseType>('unknown'),
    incident_date: fv<string>(null),
    incident_date_raw: fv<string>(null),
    incident_location: fv<string>(null),
    incident_summary: fv<string>(null),
    injuries: fv<string[]>([]),
    treatment_level: fv<TreatmentLevel>('unknown'),
    treatment_notes: fv<string>(null),
    evidence: fv<EvidenceType[]>([]),
    liability_facts: fv<string[]>([]),
    insurance_info: fv<string>(null),
    defendant_type: fv<string>(null),
    represented_already: fv<boolean>(false),
    catastrophic_signal: fv<boolean>(false),
    hospitalization_signal: fv<boolean>(false),
    surgery_signal: fv<boolean>(false),
    death_signal: fv<boolean>(false),
    distress_signal: fv<boolean>(false),
    plaintiff_contact: {
      full_name: fv<string>(null),
      phone: fv<string>(null),
      email: fv<string>(null),
      city: fv<string>(null),
      state: fv<string>(null),
    },
  }
}

export function createConversationState(conversationId: string): ConversationState {
  const now = new Date().toISOString()
  return {
    conversation_id: conversationId,
    created_at: now,
    updated_at: now,
    current_step: 'story_capture',
    case_type_detected: 'unknown',
    turns: [],
    schema: createEmptySchema(),
    missing_required_fields: REQUIRED_FIELD_MATRIX.unknown,
    unclear_fields: [],
    contradictions: [],
    completion_score: 0,
    ready_for_submission: false,
    disposition: 'continue_intake',
  }
}

export function addTurn(state: ConversationState, role: ConversationTurn['role'], content: string): ConversationState {
  const now = new Date().toISOString()
  return {
    ...state,
    updated_at: now,
    turns: [...state.turns, { role, content, timestamp: now }],
  }
}

function countUserTurns(state: ConversationState): number {
  return state.turns.filter((turn) => turn.role === 'user').length
}

function getNextConversationPhase(state: ConversationState): ConversationPhase {
  if (state.current_step === 'completed') return 'completed'
  if (state.ready_for_submission) return 'recap_confirmation'
  return countUserTurns(state) === 0 ? 'story_capture' : 'targeted_followup'
}

function isAffirmativeConfirmation(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return false

  const affirmativePhrases = [
    'yes',
    'yes.',
    'yes please',
    'correct',
    'that is correct',
    "that's correct",
    'that is right',
    "that's right",
    'looks right',
    'looks good',
    'go ahead',
    'submit it',
    'submit',
    'please submit',
    'all set',
  ]

  return affirmativePhrases.some((phrase) => normalized === phrase || normalized.startsWith(`${phrase} `))
}

function isShortCorrectionCue(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return false
  const wordCount = normalized.split(/\s+/).filter(Boolean).length
  if (wordCount > 8) return false

  return [
    'no',
    'nope',
    'not quite',
    'that is wrong',
    "that's wrong",
    'needs a correction',
    'i need to correct something',
    'change something',
    'something is wrong',
  ].some((phrase) => normalized === phrase || normalized.startsWith(`${phrase} `))
}

export const JSON_EXTRACTOR_SYSTEM_PROMPT = `You are Rose's structured data extraction engine for ClearCaseIQ.

Your job is to read the user's latest message and extract ONLY facts supported by the user's words into the intake schema.

Rules:
- Return valid JSON only.
- Do not invent missing facts.
- If a fact is uncertain, keep confidence low.
- Normalize into canonical labels where possible.
- Preserve important raw language when useful.
- If the user contradicts prior information, include that in contradictions.
- If the case type is unclear, infer cautiously.
- If the user indicates severe injury, death, surgery, hospitalization, or urgent distress, surface those signals.

Canonical labels:
case_type: auto_accident | slip_fall | medical_malpractice | other_pi | unknown

Treatment levels:
none | self_care | urgent_care | er | doctor | physical_therapy | hospitalization | surgery | unknown

Evidence types:
photos | video | police_report | incident_report | witness | insurance_info | medical_records | medical_bills | other

Return this shape:
{
  "schema_updates": {
    "field_name": { "value": <value>, "confidence": <0 to 1>, "raw": <optional raw phrase>, "source": "user_message" }
  },
  "contradictions": ["..."],
  "ambiguities": ["..."],
  "inferred_case_type": "unknown"
}`

export function buildExtractorUserPrompt(state: ConversationState, userMessage: string): string {
  return JSON.stringify(
    {
      current_schema: state.schema,
      case_type_detected: state.case_type_detected,
      user_message: userMessage,
      recent_turns: state.turns.slice(-6),
    },
    null,
    2,
  )
}

export const QUESTION_GENERATION_SYSTEM_PROMPT = `You are Rose, a compassionate and efficient AI intake specialist for ClearCaseIQ.

Your job is to ask the best next intake question.

Rules:
- Let the user tell their story naturally before switching into narrow follow-up questions.
- Ask one main question at a time.
- Ask only about missing or unclear required fields.
- Prioritize the highest-value missing field.
- Keep questions under 25 words when possible.
- Sound calm, helpful, and professional.
- Sound like a live intake specialist, not a form.
- Never say "can you please provide", "please provide", or similar robotic phrasing.
- If the user already gave an approximate time like "last week" or "yesterday", acknowledge that and ask for their best estimate only when needed.
- Avoid repeating the same field or the same wording from the last question unless absolutely necessary.
- Do not give legal advice.
- Do not promise outcomes or value.
- If the user sounds distressed, acknowledge briefly before asking the next question.

Return JSON only:
{
  "next_question": "...",
  "field_target": "...",
  "reason": "..."
}`

export function buildQuestionGeneratorPrompt(state: ConversationState): string {
  const caseType = state.case_type_detected || 'unknown'
  return JSON.stringify(
    {
      conversation_phase: state.current_step,
      case_type: caseType,
      known_schema: state.schema,
      missing_required_fields: state.missing_required_fields,
      unclear_fields: state.unclear_fields,
      contradictions: state.contradictions,
      last_user_message: [...state.turns].reverse().find((t) => t.role === 'user')?.content ?? '',
      last_question: state.last_question ?? '',
      last_field_target: state.last_field_target ?? '',
      recent_turns: state.turns.slice(-6),
    },
    null,
    2,
  )
}

export const ESCALATION_CLASSIFIER_SYSTEM_PROMPT = `You are the ClearCaseIQ escalation classifier.

Determine whether the case should:
1. continue normal intake,
2. move to standard review,
3. be escalated for urgent attorney review,
4. be escalated for manual operations review,
5. be handed to a human intake specialist.

Consider:
- intake completeness
- catastrophic injury signals
- hospitalization, surgery, death signals
- user distress or confusion
- contradictions or possible fraud
- whether the user says they already have a lawyer

Return JSON only:
{
  "disposition": "continue_intake | standard_review | urgent_attorney_review | manual_ops_review | human_handoff",
  "priority": "low | medium | high | critical",
  "reason": "...",
  "queue_target": "..."
}`

export function buildEscalationPrompt(state: ConversationState): string {
  return JSON.stringify(
    {
      schema: state.schema,
      missing_required_fields: state.missing_required_fields,
      unclear_fields: state.unclear_fields,
      contradictions: state.contradictions,
      ready_for_submission: state.ready_for_submission,
      last_user_message: [...state.turns].reverse().find((t) => t.role === 'user')?.content ?? '',
    },
    null,
    2,
  )
}

export const FINAL_SUMMARY_SYSTEM_PROMPT = `You are the ClearCaseIQ intake summary generator.

Create:
1. a plaintiff-friendly summary,
2. an attorney-ready concise case summary,
3. a final structured payload.

Rules:
- Do not invent facts.
- Keep the plaintiff summary plain and clear.
- Keep the attorney summary concise and operational.
- If facts are uncertain, note that they are reported and may need confirmation.

Return JSON only:
{
  "plaintiff_summary": "...",
  "attorney_summary": "...",
  "structured_payload": { ... }
}`

export function buildFinalSummaryPrompt(state: ConversationState): string {
  return JSON.stringify(
    {
      schema: state.schema,
      disposition: state.disposition,
      disposition_reason: state.disposition_reason,
      contradictions: state.contradictions,
      missing_required_fields: state.missing_required_fields,
    },
    null,
    2,
  )
}

export function getValueAtPath(schema: IntakeSchema, path: string): unknown {
  const parts = path.split('.')
  let current: any = schema
  for (const part of parts) {
    current = current?.[part]
    if (current === undefined) return undefined
  }
  if (current && typeof current === 'object' && 'value' in current) return current.value
  return current
}

function latestUserMessage(state: ConversationState): string {
  return [...state.turns].reverse().find((turn) => turn.role === 'user')?.content ?? ''
}

function inferFallbackCaseType(message: string): CaseType {
  const normalized = message.toLowerCase()

  if (/(car|truck|rear-end|rear ended|collision|crash|vehicle|driver|traffic)/i.test(normalized)) {
    return 'auto_accident'
  }

  if (/(slip|fell|fall|tripped|trip|wet floor|stairs)/i.test(normalized)) {
    return 'slip_fall'
  }

  if (/(doctor|hospital|surgery|medical|nurse|clinic|malpractice|diagnos)/i.test(normalized)) {
    return 'medical_malpractice'
  }

  if (/(injured at work|hurt at work|workplace|on the job|while working|work injury)/i.test(normalized)) {
    return 'other_pi'
  }

  if (/(injured|hurt|accident|incident|pain)/i.test(normalized)) {
    return 'other_pi'
  }

  return 'unknown'
}

function detectInjuries(message: string): string[] {
  const normalized = message.toLowerCase()
  const knownInjuries = [
    { label: 'neck pain', pattern: /\b(neck pain|neck hurts?|neck hurting|pain in my neck|whiplash)\b/i },
    { label: 'back pain', pattern: /\b(back pain|back hurts?|back hurting|lower back pain|lower back hurts?|pain in my back)\b/i },
    { label: 'shoulder pain', pattern: /\b(shoulder pain|shoulder hurts?|shoulder hurting|pain in my shoulder)\b/i },
    { label: 'head injury', pattern: /\b(head injury|hit my head)\b/i },
    { label: 'headache', pattern: /\b(headache|head hurts?|migraine)\b/i },
    { label: 'concussion', pattern: /\b(concussion|concussed)\b/i },
    { label: 'whiplash', pattern: /\b(whiplash)\b/i },
    { label: 'broken arm', pattern: /\b(broken arm|fractured arm)\b/i },
    { label: 'broken leg', pattern: /\b(broken leg|fractured leg)\b/i },
    { label: 'knee pain', pattern: /\b(knee pain|knee hurts?|pain in my knee)\b/i },
    { label: 'arm pain', pattern: /\b(arm pain|arm hurts?|pain in my arm)\b/i },
    { label: 'leg pain', pattern: /\b(leg pain|leg hurts?|pain in my leg)\b/i },
  ]

  return knownInjuries.filter((injury) => injury.pattern.test(normalized)).map((injury) => injury.label)
}

function needsImmediateHumanHandoff(message: string): boolean {
  return /\b(suicid|kill myself|self harm|911|can'?t breathe|panic attack|unsafe at home|being abused|domestic violence|i am terrified|i am panicking)\b/i.test(
    message,
  )
}

function inferIncidentDateReference(message: string): string | undefined {
  const normalized = message.toLowerCase()
  const relativePatterns = [
    /\b(today|yesterday|tonight|last night|this morning|this afternoon|this evening)\b/i,
    /\b(last week|this week|last month|this month|last year|this year)\b/i,
    /\b(\d+\s+(day|days|week|weeks|month|months|year|years)\s+ago)\b/i,
  ]

  for (const pattern of relativePatterns) {
    const match = normalized.match(pattern)
    if (match?.[1]) return match[1]
  }

  return undefined
}

function inferIncidentLocation(message: string): string | undefined {
  const explicitMatch = message.match(
    /\b(?:in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?:,\s*[A-Z]{2})?)/,
  )
  if (explicitMatch?.[1]) return explicitMatch[1].trim()

  return undefined
}

function normalizeQuestionText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const FOLLOWUP_FIELD_PRIORITY: string[] = [
  'incident_summary',
  'case_type',
  'incident_location',
  'injuries',
  'treatment_level',
  'liability_facts',
  'insurance_info',
  'evidence',
  'defendant_type',
  'treatment_notes',
  'incident_date',
  'plaintiff_contact.full_name',
  'plaintiff_contact.phone',
  'plaintiff_contact.state',
]

function selectFollowupField(state: ConversationState): string {
  const unsortedFields = [
    ...state.missing_required_fields,
    ...state.unclear_fields.filter((field) => !state.missing_required_fields.includes(field)),
  ]

  const orderedFields = [...unsortedFields].sort((a, b) => {
    const aIndex = FOLLOWUP_FIELD_PRIORITY.indexOf(a)
    const bIndex = FOLLOWUP_FIELD_PRIORITY.indexOf(b)
    const aPriority = aIndex === -1 ? FOLLOWUP_FIELD_PRIORITY.length : aIndex
    const bPriority = bIndex === -1 ? FOLLOWUP_FIELD_PRIORITY.length : bIndex
    return aPriority - bPriority
  })

  if (orderedFields.length === 0) return 'review'

  const alternativeField = orderedFields.find((field) => field !== 'incident_date')
  if (orderedFields[0] === 'incident_date' && alternativeField && countUserTurns(state) < 4) {
    return alternativeField
  }

  if (orderedFields[0] === 'incident_date' && state.schema.incident_date_raw.value && alternativeField) {
    return alternativeField
  }

  if (state.last_field_target && orderedFields[0] === state.last_field_target && orderedFields[1]) {
    return orderedFields[1]
  }

  return orderedFields[0]
}

function buildConversationalQuestion(state: ConversationState, field: string): QuestionResult {
  const lastUserMessage = latestUserMessage(state)
  const empatheticPrefix =
    /(injured|hurt|pain|accident|crash|fell|fall|workplace|hospital|doctor)/i.test(lastUserMessage)
      ? "I'm sorry that happened. "
      : ''

  const dateReference = state.schema.incident_date_raw.value
  const map: Record<string, QuestionResult> = {
    case_type: {
      next_question: `${empatheticPrefix}Was this a vehicle crash, a fall, a workplace injury, medical treatment issue, or something else?`.trim(),
      field_target: 'case_type',
      reason: 'Need to identify the case type.',
    },
    incident_date: {
      next_question: dateReference
        ? `You mentioned this happened ${dateReference}. About what date was it, even if that is only your best estimate?`
        : `${empatheticPrefix}About when did this happen, even if you only remember the week or month?`.trim(),
      field_target: 'incident_date',
      reason: 'Incident date is required.',
    },
    incident_location: {
      next_question: `${empatheticPrefix}What city or place did this happen in?`.trim(),
      field_target: 'incident_location',
      reason: 'Location is required for jurisdiction and routing.',
    },
    incident_summary: {
      next_question: 'Can you tell me a little more about what happened in your own words?',
      field_target: 'incident_summary',
      reason: 'Need a basic narrative of the incident.',
    },
    injuries: {
      next_question: `${empatheticPrefix}What injuries or symptoms are bothering you right now?`.trim(),
      field_target: 'injuries',
      reason: 'Need injury details.',
    },
    treatment_level: {
      next_question: `${empatheticPrefix}Have you had any treatment yet, like urgent care, the ER, or a doctor visit?`.trim(),
      field_target: 'treatment_level',
      reason: 'Treatment level is required.',
    },
    liability_facts: {
      next_question: 'What do you think caused the incident, or who do you believe was at fault?',
      field_target: 'liability_facts',
      reason: 'Need basic liability facts.',
    },
    insurance_info: {
      next_question: 'Do you know whether any insurance information is available yet?',
      field_target: 'insurance_info',
      reason: 'Insurance information helps with intake evaluation.',
    },
    evidence: {
      next_question: 'Do you have any photos, reports, witnesses, or anything else that documents what happened?',
      field_target: 'evidence',
      reason: 'Evidence helps assess case completeness.',
    },
    defendant_type: {
      next_question: 'Who provided the treatment or care involved here?',
      field_target: 'defendant_type',
      reason: 'Need to understand the provider or defendant type.',
    },
    treatment_notes: {
      next_question: 'What treatment, procedure, or medical care are you concerned about?',
      field_target: 'treatment_notes',
      reason: 'Need medical treatment details.',
    },
    'plaintiff_contact.full_name': {
      next_question: 'What name should I put on your intake?',
      field_target: 'plaintiff_contact.full_name',
      reason: "Need the plaintiff's name.",
    },
    'plaintiff_contact.phone': {
      next_question: 'What is the best phone number to reach you?',
      field_target: 'plaintiff_contact.phone',
      reason: 'Need contact phone number.',
    },
    'plaintiff_contact.state': {
      next_question: 'What state do you live in now?',
      field_target: 'plaintiff_contact.state',
      reason: 'Need state for routing and jurisdiction.',
    },
  }

  return (
    map[field] ?? {
      next_question: 'Is there anything else important you want me to know about the incident or your injuries?',
      field_target: 'additional_context',
      reason: 'Fallback question.',
    }
  )
}

function sanitizeQuestionResult(state: ConversationState, question: QuestionResult): QuestionResult {
  const fallback = buildConversationalQuestion(state, selectFollowupField(state))
  const cleanedQuestion = question.next_question.replace(/\s+/g, ' ').trim()
  const normalizedQuestion = normalizeQuestionText(cleanedQuestion)
  const normalizedLastQuestion = state.last_question ? normalizeQuestionText(state.last_question) : ''
  const preferredField = selectFollowupField(state)

  if (!cleanedQuestion) return fallback

  if (normalizedLastQuestion && normalizedQuestion === normalizedLastQuestion) {
    return fallback
  }

  if (
    /can you please provide|please provide|kindly provide|what is the incident date|what injuries did you sustain|sustain(?:ed)?|specify|indicate/i.test(
      cleanedQuestion,
    )
  ) {
    return buildConversationalQuestion(
      state,
      question.field_target && question.field_target !== 'review' ? question.field_target : preferredField,
    )
  }

  if (question.field_target === 'incident_date' && preferredField !== 'incident_date') {
    return fallback
  }

  return {
    ...question,
    next_question: cleanedQuestion,
  }
}

function heuristicExtraction(state: ConversationState, userMessage: string): ConversationState {
  const normalized = userMessage.trim()
  const schema_updates: ExtractorResult['schema_updates'] = {}
  const inferredCaseType = inferFallbackCaseType(normalized)
  const injuries = detectInjuries(normalized)
  const dateReference = inferIncidentDateReference(normalized)
  const locationReference = inferIncidentLocation(userMessage)

  if (!state.schema.incident_summary.value && normalized) {
    schema_updates.incident_summary = {
      value: normalized,
      confidence: 0.7,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (inferredCaseType !== 'unknown' && state.case_type_detected === 'unknown') {
    schema_updates.case_type = {
      value: inferredCaseType,
      confidence: 0.65,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (/(injured at work|hurt at work|workplace|on the job|while working|work injury)/i.test(normalized) && !state.schema.incident_location.value) {
    schema_updates.incident_location = {
      value: 'workplace',
      confidence: 0.55,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (dateReference && !state.schema.incident_date_raw.value) {
    schema_updates.incident_date_raw = {
      value: dateReference,
      confidence: 0.7,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (locationReference && !state.schema.incident_location.value) {
    schema_updates.incident_location = {
      value: locationReference,
      confidence: 0.65,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (injuries.length > 0) {
    const existingInjuries = state.schema.injuries.value || []
    const mergedInjuries = [...new Set([...existingInjuries, ...injuries])]
    schema_updates.injuries = {
      value: mergedInjuries,
      confidence: 0.7,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (/\b(er|emergency room|urgent care|hospital|doctor|physical therapy|surgery)\b/i.test(normalized) && state.schema.treatment_level.value === 'unknown') {
    const treatmentLevel: TreatmentLevel =
      /surgery/i.test(normalized)
        ? 'surgery'
        : /\b(hospital|emergency room|er)\b/i.test(normalized)
          ? 'hospitalization'
          : /\burgent care\b/i.test(normalized)
            ? 'urgent_care'
            : /\bphysical therapy\b/i.test(normalized)
              ? 'physical_therapy'
              : 'doctor'

    schema_updates.treatment_level = {
      value: treatmentLevel,
      confidence: 0.65,
      raw: normalized,
      source: 'fallback_heuristic',
    }
  }

  if (Object.keys(schema_updates).length === 0) return state

  return mergeExtractorResult(state, {
    schema_updates,
    contradictions: [],
    ambiguities: [],
    inferred_case_type: inferredCaseType,
  })
}

export function isFieldMissing(schema: IntakeSchema, path: string): boolean {
  const value = getValueAtPath(schema, path)
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'boolean') return false
  return false
}

export function isFieldUnclear(schema: IntakeSchema, path: string, minConfidence = 0.65): boolean {
  const parts = path.split('.')
  let current: any = schema
  for (const part of parts) {
    current = current?.[part]
    if (current === undefined) return false
  }
  if (current && typeof current === 'object' && 'confidence' in current) {
    return current.confidence < minConfidence
  }
  return false
}

export function evaluateMissingFields(state: ConversationState): MissingFieldResult {
  const caseType = state.case_type_detected || 'unknown'
  const required = REQUIRED_FIELD_MATRIX[caseType] ?? REQUIRED_FIELD_MATRIX.unknown
  const missing_required_fields = required.filter((field) => isFieldMissing(state.schema, field))
  const unclear_fields = required.filter((field) => !isFieldMissing(state.schema, field) && isFieldUnclear(state.schema, field))

  const total = required.length
  const completeCount = total - missing_required_fields.length
  const completion_score = Math.max(0, Math.min(1, completeCount / total))
  const ready_for_completion = missing_required_fields.length === 0

  return {
    missing_required_fields,
    unclear_fields,
    ready_for_completion,
    completion_score,
  }
}

function applyUpdate(target: any, path: string, payload: any) {
  const parts = path.split('.')
  let current = target
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    if (!(key in current)) current[key] = {}
    current = current[key]
  }
  const finalKey = parts[parts.length - 1]
  if (current[finalKey] && typeof current[finalKey] === 'object' && 'value' in current[finalKey]) {
    current[finalKey] = {
      ...current[finalKey],
      ...payload,
    }
  } else {
    current[finalKey] = payload
  }
}

export function mergeExtractorResult(state: ConversationState, result: ExtractorResult): ConversationState {
  const nextSchema: IntakeSchema = JSON.parse(JSON.stringify(state.schema))

  for (const [path, payload] of Object.entries(result.schema_updates || {})) {
    try {
      applyUpdate(nextSchema, path, payload)
    } catch (e) {
      logger.warn({ path, payload }, 'Rose engine: failed to apply schema update')
    }
  }

  const caseType =
    result.inferred_case_type && result.inferred_case_type !== 'unknown'
      ? result.inferred_case_type
      : ((nextSchema.case_type.value as CaseType) || state.case_type_detected || 'unknown')

  const nextState: ConversationState = {
    ...state,
    schema: nextSchema,
    case_type_detected: caseType,
    contradictions: [...new Set([...(state.contradictions || []), ...(result.contradictions || [])])],
    updated_at: new Date().toISOString(),
  }

  const missing = evaluateMissingFields(nextState)
  return {
    ...nextState,
    missing_required_fields: missing.missing_required_fields,
    unclear_fields: missing.unclear_fields,
    ready_for_submission: missing.ready_for_completion,
    completion_score: missing.completion_score,
  }
}

export function ruleBasedEscalation(state: ConversationState): EscalationResult {
  const s = state.schema

  if (s.represented_already.value === true) {
    return {
      disposition: 'manual_ops_review',
      priority: 'medium',
      reason: 'User may already be represented by counsel.',
      queue_target: 'ops_conflict_review',
    }
  }

  if (s.death_signal.value || s.catastrophic_signal.value) {
    return {
      disposition: 'urgent_attorney_review',
      priority: 'critical',
      reason: 'Catastrophic or death-related signal detected.',
      queue_target: 'catastrophic_injury_queue',
    }
  }

  if (s.hospitalization_signal.value || s.surgery_signal.value) {
    return {
      disposition: 'urgent_attorney_review',
      priority: 'high',
      reason: 'Hospitalization or surgery signal detected.',
      queue_target: 'priority_review_queue',
    }
  }

  if (s.distress_signal.value) {
    return {
      disposition: 'human_handoff',
      priority: 'high',
      reason: 'User appears distressed and may benefit from human assistance.',
      queue_target: 'human_intake_queue',
    }
  }

  if (state.contradictions.length >= 2) {
    return {
      disposition: 'manual_ops_review',
      priority: 'high',
      reason: 'Multiple contradictions detected in intake responses.',
      queue_target: 'ops_manual_review',
    }
  }

  if (state.ready_for_submission) {
    return {
      disposition: 'standard_review',
      priority: 'medium',
      reason: 'Required intake fields are complete.',
      queue_target: 'standard_case_review',
    }
  }

  return {
    disposition: 'continue_intake',
    priority: 'low',
    reason: 'Continue collecting missing required intake fields.',
  }
}

export function buildRuleBasedQuestion(state: ConversationState): QuestionResult {
  const lastUserMessage = latestUserMessage(state)

  if (state.current_step === 'story_capture' && !lastUserMessage.trim()) {
    return {
      next_question: 'Please walk me through what happened, starting wherever it makes the most sense to you.',
      field_target: 'incident_summary',
      reason: 'Begin with the user narrative before drilling into missing fields.',
    }
  }

  return buildConversationalQuestion(state, selectFollowupField(state))
}

export function generateFinalSummary(state: ConversationState): FinalSummaryResult {
  const s = state.schema
  const caseType = s.case_type.value || 'unknown'
  const injuryText = (s.injuries.value || []).join(', ') || 'not yet specified'
  const evidenceText = (s.evidence.value || []).join(', ') || 'none reported'

  const plaintiff_summary = [
    `Case type: ${caseType}.`,
    s.incident_date.value ? `Incident date: ${s.incident_date.value}.` : 'Incident date still needs confirmation.',
    s.incident_location.value ? `Location: ${s.incident_location.value}.` : 'Location still needs confirmation.',
    `Reported injuries: ${injuryText}.`,
    `Treatment: ${s.treatment_level.value || 'unknown'}.`,
    `Evidence: ${evidenceText}.`,
  ].join(' ')

  const attorney_summary = [
    `Reported ${caseType} matter.`,
    s.incident_location.value ? `Location: ${s.incident_location.value}.` : 'Location unclear.',
    s.incident_date.value ? `Date: ${s.incident_date.value}.` : 'Date unclear.',
    `Injuries: ${injuryText}.`,
    `Treatment level: ${s.treatment_level.value || 'unknown'}.`,
    `Liability facts: ${(s.liability_facts.value || []).join(', ') || 'none yet'}.`,
    `Evidence: ${evidenceText}.`,
    `Contact: ${s.plaintiff_contact.full_name.value || 'unknown'} / ${s.plaintiff_contact.phone.value || 'unknown'}.`,
    state.disposition_reason ? `Disposition note: ${state.disposition_reason}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const structured_payload = {
    case_type: s.case_type.value,
    incident_date: s.incident_date.value,
    incident_date_raw: s.incident_date_raw.value,
    incident_location: s.incident_location.value,
    incident_summary: s.incident_summary.value,
    injuries: s.injuries.value,
    treatment_level: s.treatment_level.value,
    treatment_notes: s.treatment_notes.value,
    evidence: s.evidence.value,
    liability_facts: s.liability_facts.value,
    insurance_info: s.insurance_info.value,
    defendant_type: s.defendant_type.value,
    plaintiff_contact: {
      full_name: s.plaintiff_contact.full_name.value,
      phone: s.plaintiff_contact.phone.value,
      email: s.plaintiff_contact.email.value,
      city: s.plaintiff_contact.city.value,
      state: s.plaintiff_contact.state.value,
    },
    escalation: {
      disposition: state.disposition,
      reason: state.disposition_reason,
    },
    contradictions: state.contradictions,
    missing_required_fields: state.missing_required_fields,
  }

  return {
    plaintiff_summary,
    attorney_summary,
    structured_payload,
  }
}

export function buildConversationReview(state: ConversationState, summary: FinalSummaryResult): ConversationReview {
  const confirmation_prompt = state.contradictions.length > 0
    ? "I've summarized what I heard. Please check it carefully and tell me what needs to change before I submit it."
    : "Here's what I understand so far. Tell me anything I should correct, or say it's right and I'll submit it."

  return {
    plaintiff_summary: summary.plaintiff_summary,
    attorney_summary: summary.attorney_summary,
    structured_payload: summary.structured_payload,
    missing_required_fields: state.missing_required_fields,
    disposition: state.disposition,
    confirmation_prompt,
  }
}

function extractJson(text: string): any {
  const trimmed = text.trim()
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = codeBlock ? codeBlock[1].trim() : trimmed
  return JSON.parse(raw)
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<any> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY for Rose intake engine.')
  }

  const completion = await Promise.race([
    openai.chat.completions.create({
      model: ROSE_LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Rose LLM timed out after ${ROSE_LLM_TIMEOUT_MS}ms`)), ROSE_LLM_TIMEOUT_MS)
    }),
  ])

  const text = completion.choices[0]?.message?.content
  if (!text) throw new Error('No response from LLM')

  try {
    return extractJson(text)
  } catch (e) {
    logger.warn({ text }, 'Rose engine: LLM response was not valid JSON')
    throw e
  }
}

export async function runExtraction(state: ConversationState, userMessage: string): Promise<ConversationState> {
  try {
    const raw = await callLLM(JSON_EXTRACTOR_SYSTEM_PROMPT, buildExtractorUserPrompt(state, userMessage))
    const result = raw as ExtractorResult
    return mergeExtractorResult(state, result)
  } catch (e) {
    logger.warn({ error: (e as Error).message }, 'Rose engine: extraction failed, returning state unchanged')
    return heuristicExtraction(state, userMessage)
  }
}

export async function runQuestionGeneration(state: ConversationState): Promise<QuestionResult> {
  try {
    const raw = await callLLM(QUESTION_GENERATION_SYSTEM_PROMPT, buildQuestionGeneratorPrompt(state))
    return sanitizeQuestionResult(state, raw as QuestionResult)
  } catch {
    return buildRuleBasedQuestion(state)
  }
}

export async function runEscalationClassifier(state: ConversationState): Promise<EscalationResult> {
  try {
    const raw = await callLLM(ESCALATION_CLASSIFIER_SYSTEM_PROMPT, buildEscalationPrompt(state))
    return raw as EscalationResult
  } catch {
    return ruleBasedEscalation(state)
  }
}

export async function runFinalSummary(state: ConversationState): Promise<FinalSummaryResult> {
  try {
    const raw = await callLLM(FINAL_SUMMARY_SYSTEM_PROMPT, buildFinalSummaryPrompt(state))
    return raw as FinalSummaryResult
  } catch {
    return generateFinalSummary(state)
  }
}

export async function processUserTurn(
  state: ConversationState,
  userMessage: string,
): Promise<{
  state: ConversationState
  nextQuestion?: QuestionResult
  escalation: EscalationResult
  review?: ConversationReview
  finalSummary?: FinalSummaryResult
}> {
  let nextState = addTurn(state, 'user', userMessage)

  if (state.current_step === 'recap_confirmation' && isAffirmativeConfirmation(userMessage)) {
    const finalSummary = state.pending_review
      ? {
          plaintiff_summary: state.pending_review.plaintiff_summary,
          attorney_summary: state.pending_review.attorney_summary,
          structured_payload: state.pending_review.structured_payload,
        }
      : await runFinalSummary(nextState)

    return {
      state: {
        ...nextState,
        current_step: 'completed',
        pending_review: undefined,
      },
      escalation: {
        disposition: state.disposition,
        priority: 'medium',
        reason: state.disposition_reason ?? 'User confirmed the recap and is ready to submit.',
      },
      finalSummary,
    }
  }

  if (state.current_step === 'recap_confirmation' && isShortCorrectionCue(userMessage)) {
    const nextQuestion = {
      next_question: 'Thanks for catching that. What would you like me to correct or add before I submit this?',
      field_target: 'review_corrections',
      reason: 'User indicated the recap needs a correction.',
    }

    return {
      state: {
        ...nextState,
        current_step: 'targeted_followup',
        pending_review: undefined,
        last_question: nextQuestion.next_question,
        last_field_target: nextQuestion.field_target,
      },
      escalation: {
        disposition: state.disposition,
        priority: 'medium',
        reason: state.disposition_reason ?? 'User wants to revise the intake before submission.',
      },
      nextQuestion,
    }
  }

  nextState = await runExtraction(nextState, userMessage)

  const missing = evaluateMissingFields(nextState)
  nextState = {
    ...nextState,
    missing_required_fields: missing.missing_required_fields,
    unclear_fields: missing.unclear_fields,
    ready_for_submission: missing.ready_for_completion,
    completion_score: missing.completion_score,
    current_step: getNextConversationPhase({
      ...nextState,
      missing_required_fields: missing.missing_required_fields,
      unclear_fields: missing.unclear_fields,
      ready_for_submission: missing.ready_for_completion,
      completion_score: missing.completion_score,
    }),
  }

  if (nextState.ready_for_submission) {
    const escalationResult = await runEscalationClassifier(nextState)
    const escalation =
      escalationResult.disposition === 'continue_intake' ? ruleBasedEscalation(nextState) : escalationResult
    const normalizedEscalation =
      escalation.disposition === 'human_handoff' && !needsImmediateHumanHandoff(userMessage)
        ? ruleBasedEscalation({ ...nextState, disposition: 'continue_intake' })
        : escalation
    nextState = {
      ...nextState,
      disposition: normalizedEscalation.disposition,
      disposition_reason: normalizedEscalation.reason,
      pending_review: undefined,
    }

    if (
      normalizedEscalation.disposition === 'standard_review' ||
      normalizedEscalation.disposition === 'urgent_attorney_review' ||
      normalizedEscalation.disposition === 'manual_ops_review'
    ) {
      const summary = await runFinalSummary(nextState)
      const review = buildConversationReview(nextState, summary)
      return {
        state: {
          ...nextState,
          current_step: 'recap_confirmation',
          pending_review: review,
        },
        escalation: normalizedEscalation,
        review,
      }
    }

    const nextQuestion = await runQuestionGeneration(nextState)
    nextState = {
      ...nextState,
      last_question: nextQuestion.next_question,
      last_field_target: nextQuestion.field_target,
    }

    return { state: nextState, nextQuestion, escalation: normalizedEscalation }
  }

  const [escalation, nextQuestion] = await Promise.all([
    runEscalationClassifier(nextState),
    runQuestionGeneration(nextState),
  ])

  const normalizedEscalation =
    escalation.disposition === 'human_handoff' && !needsImmediateHumanHandoff(userMessage)
      ? ruleBasedEscalation({ ...nextState, disposition: 'continue_intake' })
      : escalation

  nextState = {
    ...nextState,
    disposition: normalizedEscalation.disposition,
    disposition_reason: normalizedEscalation.reason,
    pending_review: undefined,
  }

  if (
    normalizedEscalation.disposition === 'standard_review' ||
    normalizedEscalation.disposition === 'urgent_attorney_review' ||
    normalizedEscalation.disposition === 'manual_ops_review'
  ) {
    const summary = await runFinalSummary(nextState)
    const review = buildConversationReview(nextState, summary)
    return {
      state: {
        ...nextState,
        current_step: 'recap_confirmation',
        pending_review: review,
      },
      escalation: normalizedEscalation,
      review,
    }
  }

  nextState = {
    ...nextState,
    last_question: nextQuestion.next_question,
    last_field_target: nextQuestion.field_target,
  }

  return { state: nextState, nextQuestion, escalation: normalizedEscalation }
}
