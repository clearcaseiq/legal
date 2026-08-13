import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createCompletion } = vi.hoisted(() => ({ createCompletion: vi.fn() }))

// LLM_ALLOW_PHI must be true to exercise the model path; the command-center pack
// is clinical and is gated behind the BAA flag (see askCaseAssistant).
vi.mock('../env', () => ({
  ENV: { OPENAI_API_KEY: 'test-openai-key', OPENAI_ANALYSIS_MODEL: 'gpt-4o-mini', LLM_ALLOW_PHI: true },
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } }
  },
}))

import { askCaseAssistant, detectDemandDraftIntent } from './case-assistant'

describe('detectDemandDraftIntent', () => {
  it('recognises an instruction to write the letter', () => {
    for (const q of [
      'draft the demand letter',
      'Write a demand letter for this case',
      'can you generate the demand letter',
      'prepare a settlement demand',
      'put together the demand letter please',
    ]) {
      expect(detectDemandDraftIntent(q), q).toBe(true)
    }
  })

  it('leaves questions about the demand stage as questions', () => {
    for (const q of [
      'is this case demand ready?',
      'what is still missing before this case is demand-ready?',
      'when should we draft the demand letter',
      'how do i draft a demand letter',
      'should we send the demand now',
      'what was the last demand',
    ]) {
      expect(detectDemandDraftIntent(q), q).toBe(false)
    }
  })

  it('ignores authoring requests about other documents', () => {
    expect(detectDemandDraftIntent('draft a client update')).toBe(false)
    expect(detectDemandDraftIntent('write a letter to the provider')).toBe(false)
  })
})

const summary: any = {
  assessmentId: 'a1',
  stage: { title: 'Treating', detail: 'Client is still in active care.' },
  readiness: { score: 62, label: 'File strengthening', detail: 'Two records outstanding.', factors: [] },
  valueStory: { low: 30000, median: 55000, high: 90000, detail: 'Soft-tissue with imaging.' },
  coverageStory: { label: 'Known', detail: '50/100 policy confirmed.' },
  liabilityStory: { label: 'Clear', detail: 'Rear-end, no comparative fault.' },
  negotiationSummary: { posture: 'No offer yet.', recommendedMove: 'Hold for records.' },
  treatmentMonitor: { status: 'Active care', recommendedAction: 'Confirm next visit.', providers: ['Dr. Ruiz'] },
  nextBestAction: { title: 'Chase records', detail: 'Request the MRI report.' },
  missingItems: [{ key: 'mri', label: 'MRI report', priority: 'high' }],
  strengths: [],
  weaknesses: [],
  defenseRisks: [],
  sources: [
    { label: 'Readiness score', detail: '62%' },
    { label: 'Evidence on file', detail: '4 documents' },
  ],
  suggestedPlaintiffUpdate: 'We are waiting on your MRI report.',
}

describe('askCaseAssistant', () => {
  beforeEach(() => {
    createCompletion.mockReset()
  })

  it('returns a draft_demand action instead of calling the model', async () => {
    const result = await askCaseAssistant(summary, 'draft the demand letter and stress the missed work')

    expect(result.action).toEqual({
      type: 'draft_demand',
      guidance: 'draft the demand letter and stress the missed work',
    })
    expect(createCompletion).not.toHaveBeenCalled()
  })

  it('answers a free-text question with the model, citing record sources', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ answer: 'The MRI report is the only thing holding this up.' }) } }],
    })

    const result = await askCaseAssistant(summary, 'what is stopping us from moving forward on this one')

    expect(result.source).toBe('ai')
    expect(result.answer).toBe('The MRI report is the only thing holding this up.')
    // Sources are never model-generated.
    expect(result.sources).toEqual(summary.sources)
  })

  it('falls back to the deterministic copilot when the model fails', async () => {
    createCompletion.mockRejectedValue(new Error('upstream down'))

    const result = await askCaseAssistant(summary, 'what documents are missing')

    expect(result.source).toBe('deterministic')
    expect(result.answer).toContain('MRI report')
  })

  it('falls back when the model returns no answer', async () => {
    createCompletion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ answer: '' }) } }] })

    const result = await askCaseAssistant(summary, 'what is the value of this case')

    expect(result.source).toBe('deterministic')
    expect(result.answer).toBeTruthy()
  })
})
