import { describe, expect, it } from 'vitest'
import { buildProposalDraftsFromAnswers } from './question-task-proposals'

describe('buildProposalDraftsFromAnswers', () => {
  it('proposes police report follow-up for a no answer', () => {
    const drafts = buildProposalDraftsFromAnswers([
      {
        questionKey: 'base:sf_video',
        questionText: 'Is there surveillance video or an incident report from the property?',
        answer: 'No, I never got a copy',
        section: 'Liability',
        source: 'baseline',
      },
    ])
    expect(drafts.some((d) => d.ruleId === 'police_report' || d.ruleId === 'surveillance_video')).toBe(true)
  })

  it('proposes wage-loss docs when plaintiff missed work', () => {
    const drafts = buildProposalDraftsFromAnswers([
      {
        questionKey: 'base:auto_dmg_work',
        questionText: 'Have you missed work, promotions, bonuses, or used vacation/sick days?',
        answer: 'Yes, I missed two weeks',
        section: 'Damages',
        source: 'baseline',
      },
    ])
    expect(drafts.map((d) => d.ruleId)).toContain('wage_loss_docs')
    expect(drafts[0]?.priority).toBe('high')
  })

  it('does not propose on empty answers', () => {
    const drafts = buildProposalDraftsFromAnswers([
      {
        questionKey: 'base:auto_liab_fault',
        questionText: 'Did the other driver admit fault?',
        answer: '   ',
        section: 'Liability',
        source: 'baseline',
      },
    ])
    expect(drafts).toEqual([])
  })
})
