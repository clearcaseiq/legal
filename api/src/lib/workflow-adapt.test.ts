import { describe, expect, it } from 'vitest'
import {
  applyWorkflowAdaptPlan,
  isProtectedWorkflowStep,
  type WorkflowItemDraft,
} from './workflow-adapt'

function draft(partial: Partial<WorkflowItemDraft> & { title: string }): WorkflowItemDraft {
  return {
    phaseName: 'Intake & Setup',
    phaseOrder: 0,
    stageName: 'Case Opening',
    stageOrder: 0,
    description: null,
    stepType: 'task',
    aiSignal: null,
    assigneeRole: 'paralegal',
    assignedFirmMemberId: null,
    dueOffsetDays: 3,
    dueDate: null,
    required: false,
    templateId: null,
    sortOrder: 0,
    ...partial,
  }
}

describe('isProtectedWorkflowStep', () => {
  it('protects required, ai milestones, and compliance titles', () => {
    expect(isProtectedWorkflowStep(draft({ title: 'Send welcome', required: true }))).toBe(true)
    expect(isProtectedWorkflowStep(draft({ title: 'MMI', stepType: 'ai_milestone' }))).toBe(true)
    expect(isProtectedWorkflowStep(draft({ title: 'Open matter & run conflict check' }))).toBe(true)
    expect(isProtectedWorkflowStep(draft({ title: 'Send retainer to client' }))).toBe(true)
    expect(isProtectedWorkflowStep(draft({ title: 'Obtain HIPAA authorization' }))).toBe(true)
    expect(isProtectedWorkflowStep(draft({ title: 'Request police report' }))).toBe(false)
  })
})

describe('applyWorkflowAdaptPlan', () => {
  const base: WorkflowItemDraft[] = [
    draft({ title: 'Open matter & run conflict check', required: true, sortOrder: 0 }),
    draft({ title: 'Send retainer to client', stepType: 'document', sortOrder: 1 }),
    draft({ title: 'Request police / incident report', sortOrder: 2 }),
    draft({ title: 'Send client welcome packet', sortOrder: 3 }),
    draft({
      title: 'Treatment complete / MMI reached',
      stepType: 'ai_milestone',
      aiSignal: 'treatment_complete',
      dueOffsetDays: null,
      sortOrder: 4,
      stageName: 'Medical Treatment',
      stageOrder: 1,
    }),
  ]

  it('skips unprotected steps and rejects protected ones', () => {
    const result = applyWorkflowAdaptPlan(base, {
      rationale: 'No police report expected',
      ops: [
        { op: 'skip', matchTitle: 'Request police / incident report' },
        { op: 'skip', matchTitle: 'Send retainer to client' },
        { op: 'skip', matchTitle: 'Treatment complete / MMI reached' },
      ],
    })
    expect(result.applied).toHaveLength(1)
    expect(result.rejected.map((r) => r.reason)).toEqual(['protected_step', 'protected_step'])
    expect(result.items.find((i) => i.title.includes('police'))).toBeUndefined()
    expect(result.items.some((i) => i.title.includes('retainer'))).toBe(true)
  })

  it('adds a custom step after an anchor and renumbers sortOrder', () => {
    const result = applyWorkflowAdaptPlan(base, {
      rationale: 'Need HIPAA',
      ops: [
        {
          op: 'add',
          afterTitle: 'Send retainer to client',
          step: {
            title: 'Obtain HIPAA authorization',
            stepType: 'document',
            assigneeRole: 'paralegal',
            dueOffsetDays: 2,
          },
        },
      ],
    })
    expect(result.applied).toHaveLength(1)
    const titles = result.items.filter((i) => i.stageOrder === 0).map((i) => i.title)
    const retainerIdx = titles.indexOf('Send retainer to client')
    expect(titles[retainerIdx + 1]).toBe('Obtain HIPAA authorization')
    expect(result.items.find((i) => i.title === 'Obtain HIPAA authorization')?.custom).toBe(true)
  })

  it('renames and reschedules pending steps', () => {
    const start = new Date('2026-01-01T00:00:00.000Z')
    const result = applyWorkflowAdaptPlan(
      base,
      {
        rationale: 'Tighten welcome',
        ops: [
          {
            op: 'rename',
            matchTitle: 'Send client welcome packet',
            title: 'Send client welcome + treatment guidance',
          },
          { op: 'reschedule', matchTitle: 'Request police / incident report', dueOffsetDays: 1 },
        ],
      },
      start,
    )
    expect(result.applied).toHaveLength(2)
    expect(result.items.some((i) => i.title === 'Send client welcome + treatment guidance')).toBe(true)
    const police = result.items.find((i) => i.title.includes('police'))
    expect(police?.dueOffsetDays).toBe(1)
    expect(police?.dueDate?.toISOString().startsWith('2026-01-02')).toBe(true)
  })

  it('marks existing rows skipped instead of deleting them', () => {
    const withIds = base.map((b, i) => ({ ...b, id: `id_${i}`, status: 'pending' }))
    const result = applyWorkflowAdaptPlan(withIds, {
      rationale: 'skip welcome',
      ops: [{ op: 'skip', matchTitle: 'Send client welcome packet' }],
    })
    const welcome = result.items.find((i) => i.title.includes('welcome'))
    expect(welcome?.status).toBe('skipped')
    expect(result.items).toHaveLength(withIds.length)
  })

  it('annotates descriptions and retargets assignee roles on pending steps', () => {
    const result = applyWorkflowAdaptPlan(base, {
      rationale: 'Enrich police + welcome',
      ops: [
        {
          op: 'annotate',
          matchTitle: 'Request police / incident report',
          description: 'Call LAPD records; ask for CAD + traffic collision report.',
        },
        {
          op: 'retarget',
          matchTitle: 'Send client welcome packet',
          assigneeRole: 'intake_specialist',
        },
        {
          op: 'annotate',
          matchTitle: 'Send retainer to client',
          description: 'Include contingency fee schedule with welcome.',
        },
      ],
    })
    expect(result.applied).toHaveLength(3)
    expect(result.items.find((i) => i.title.includes('police'))?.description).toMatch(/LAPD/)
    expect(result.items.find((i) => i.title.includes('welcome'))?.assigneeRole).toBe(
      'intake_specialist',
    )
    expect(result.items.find((i) => i.title.includes('retainer'))?.description).toMatch(/contingency/)
  })

  it('rejects retarget on ai_milestone and invalid roles via sanitize path', () => {
    const result = applyWorkflowAdaptPlan(base, {
      rationale: 'bad retarget',
      ops: [
        {
          op: 'retarget',
          matchTitle: 'Treatment complete / MMI reached',
          assigneeRole: 'paralegal',
        },
      ],
    })
    expect(result.applied).toHaveLength(0)
    expect(result.rejected[0]?.reason).toBe('protected_step')
  })
})

describe('openGapFingerprint', () => {
  it('sorts open gap keys stably', async () => {
    const { openGapFingerprint } = await import('./workflow-adapt')
    expect(
      openGapFingerprint([
        { key: 'gap_b', resolved: false },
        { key: 'gap_a', resolved: false },
        { key: 'gap_c', resolved: true },
      ]),
    ).toBe('gap_a|gap_b')
  })
})
