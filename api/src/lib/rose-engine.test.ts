import { describe, expect, it } from 'vitest'
import {
  buildConversationReview,
  buildRuleBasedQuestion,
  createConversationState,
  generateFinalSummary,
  mergeExtractorResult,
  processUserTurn,
  type ConversationState,
} from './rose-engine'

function buildCompleteState(): ConversationState {
  return mergeExtractorResult(createConversationState('rose_test'), {
    schema_updates: {
      case_type: { value: 'auto_accident', confidence: 0.95, source: 'test' },
      incident_date: { value: '2024-01-15', confidence: 0.95, source: 'test' },
      incident_location: { value: 'Los Angeles, CA', confidence: 0.95, source: 'test' },
      incident_summary: { value: 'I was rear-ended while stopped at a red light.', confidence: 0.95, source: 'test' },
      injuries: { value: ['neck pain'], confidence: 0.95, source: 'test' },
      treatment_level: { value: 'doctor', confidence: 0.95, source: 'test' },
      liability_facts: { value: ['The other driver hit me from behind'], confidence: 0.95, source: 'test' },
      insurance_info: { value: 'The other driver had insurance', confidence: 0.95, source: 'test' },
      'plaintiff_contact.full_name': { value: 'Jane Doe', confidence: 0.95, source: 'test' },
      'plaintiff_contact.phone': { value: '555-111-2222', confidence: 0.95, source: 'test' },
      'plaintiff_contact.state': { value: 'CA', confidence: 0.95, source: 'test' },
    },
    contradictions: [],
    ambiguities: [],
    inferred_case_type: 'auto_accident',
  })
}

describe('rose-engine conversational flow', () => {
  it('moves into a targeted follow-up after the first fallback story message', async () => {
    const state = createConversationState('rose_fallback')

    const result = await processUserTurn(state, 'Hi Rose, I got injured at work.')

    expect(result.finalSummary).toBeUndefined()
    expect(result.state.current_step).toBe('targeted_followup')
    expect(result.state.schema.incident_summary.value).toContain('injured at work')
    expect(result.state.case_type_detected).toBe('other_pi')
    expect(result.nextQuestion?.next_question).not.toBe(
      'Please walk me through what happened, starting wherever it makes the most sense to you.',
    )
  })

  it('captures rough timing and location before asking a more natural follow-up', async () => {
    const state = createConversationState('rose_auto')

    const result = await processUserTurn(
      state,
      'I was in a car accident last week in San Jose and my neck still hurts.',
    )

    expect(result.state.schema.incident_date_raw.value).toBe('last week')
    expect(result.state.schema.incident_location.value).toBe('San Jose')
    expect(result.nextQuestion?.next_question).not.toMatch(/incident date/i)
  })

  it('does not lead with incident date when better conversational follow-ups are still missing', async () => {
    const state = createConversationState('rose_sparse_crash')

    const result = await processUserTurn(state, 'I got hurt in a crash.')

    expect(result.nextQuestion?.field_target).not.toBe('incident_date')
    expect(result.nextQuestion?.next_question).not.toMatch(/when did .* happen|what date/i)
  })

  it('recognizes natural injury phrasing and keeps intake conversational', async () => {
    const state = createConversationState('rose_injuries')

    const firstTurn = await processUserTurn(
      state,
      'I was rear-ended last week in San Jose and my neck hurts.',
    )
    const secondTurn = await processUserTurn(
      firstTurn.state,
      'My neck and lower back hurt, and I went to urgent care the same day.',
    )

    expect(secondTurn.state.schema.injuries.value).toContain('neck pain')
    expect(
      secondTurn.state.schema.injuries.value?.some((injury) => injury === 'back pain' || injury === 'lower back pain'),
    ).toBe(true)
    expect(secondTurn.state.schema.treatment_level.value).toBe('urgent_care')
    expect(secondTurn.escalation.disposition).not.toBe('human_handoff')
  }, 12000)

  it('uses a conversational date question when only rough timing is known', () => {
    const state = mergeExtractorResult(createConversationState('rose_date_prompt'), {
      schema_updates: {
        case_type: { value: 'auto_accident', confidence: 0.95, source: 'test' },
        incident_summary: { value: 'Rear-ended at a light.', confidence: 0.95, source: 'test' },
        incident_date_raw: { value: 'last week', confidence: 0.8, source: 'test' },
      },
      contradictions: [],
      ambiguities: [],
      inferred_case_type: 'auto_accident',
    })

    const question = buildRuleBasedQuestion(state)

    expect(question.field_target).not.toBe('incident_date')
    expect(question.next_question).not.toMatch(/please provide/i)
  })

  it('returns a recap review before final submission', async () => {
    const state = buildCompleteState()

    const result = await processUserTurn(state, 'That is the full story.')

    expect(result.review).toBeDefined()
    expect(result.finalSummary).toBeUndefined()
    expect(result.state.current_step).toBe('recap_confirmation')
    expect(result.review?.confirmation_prompt).toContain('submit')
  })

  it('finalizes once the user confirms the recap', async () => {
    const state = buildCompleteState()
    const summary = generateFinalSummary(state)
    const review = buildConversationReview(
      { ...state, disposition: 'standard_review', disposition_reason: 'Required intake fields are complete.' },
      summary,
    )

    const result = await processUserTurn(
      {
        ...state,
        current_step: 'recap_confirmation',
        disposition: 'standard_review',
        disposition_reason: 'Required intake fields are complete.',
        pending_review: review,
      },
      'Submit it',
    )

    expect(result.finalSummary).toBeDefined()
    expect(result.state.current_step).toBe('completed')
    expect(result.finalSummary?.plaintiff_summary).toBe(summary.plaintiff_summary)
  })

  it('asks for a correction detail when the user rejects the recap without specifics', async () => {
    const state = buildCompleteState()
    const summary = generateFinalSummary(state)
    const review = buildConversationReview(
      { ...state, disposition: 'standard_review', disposition_reason: 'Required intake fields are complete.' },
      summary,
    )

    const result = await processUserTurn(
      {
        ...state,
        current_step: 'recap_confirmation',
        disposition: 'standard_review',
        disposition_reason: 'Required intake fields are complete.',
        pending_review: review,
      },
      'No',
    )

    expect(result.finalSummary).toBeUndefined()
    expect(result.review).toBeUndefined()
    expect(result.state.current_step).toBe('targeted_followup')
    expect(result.nextQuestion?.next_question).toContain('correct or add')
  })
})
