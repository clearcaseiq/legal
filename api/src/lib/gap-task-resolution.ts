/**
 * Missing-Information gaps that a completed task or workflow step closes.
 *
 * Gaps are derived from case data, but several of them (client coverage,
 * defendant identity, itemized specials) are confirmed by a person doing the
 * work rather than by a field the platform can read. Once the matching task is
 * done, the gap is crossed off instead of staying open next to a done task.
 */
import { prisma } from './prisma'

type GapRule = { key: string; match: RegExp; exclude?: RegExp }

/** Asking for something is not having it: these never close a gap. */
const REQUEST_ONLY = /^(send|request|order|follow[- ]up on)\b/

/** @internal exported for unit tests */
export const GAP_TASK_RULES: GapRule[] = [
  {
    key: 'first_party_coverage',
    match: /\b(um\/uim|uim|medpay|pip)\b|client'?s own .*coverage|first[- ]party coverage/,
  },
  { key: 'defendant_identity', match: /identify (the )?(defendant|at[- ]fault)|defendant identity/ },
  {
    key: 'defendant_carrier',
    match: /(defendant|at[- ]fault)\b.*\b(insurance )?carrier|identify .*insurance carrier|defendant('s)? insurer/,
  },
  { key: 'defendant_policy_limits', match: /policy limits?\b/ },
  {
    key: 'medical_specials_missing',
    match: /itemi[sz]e.*(medical|specials|damages|bills)|medical specials|special damages/,
  },
  {
    key: 'damages_ledger_empty',
    match: /itemi[sz]e.*(medical|specials|damages|bills)|medical specials|special damages/,
  },
  { key: 'claim_not_opened', match: /open (the )?insurance claim|open (the )?claim\b/ },
  {
    key: 'coverage_unconfirmed',
    match: /(verify|confirm) .*coverage/,
    exclude: /\b(um\/uim|uim|medpay|pip)\b|client'?s own|first[- ]party/,
  },
  { key: 'witness_statements', match: /witness/ },
  { key: 'prior_injuries', match: /prior (injur|medical|treatment)|pre-?existing/ },
  { key: 'employer_info', match: /employer/ },
]

/** Gap key → title of the completed task that closed it. */
export function gapKeysClosedByTitles(titles: string[]): Map<string, string> {
  const closed = new Map<string, string>()
  for (const raw of titles) {
    const title = String(raw || '').trim().toLowerCase().replace(/[’`]/g, "'")
    if (!title || REQUEST_ONLY.test(title)) continue
    for (const rule of GAP_TASK_RULES) {
      if (closed.has(rule.key)) continue
      if (!rule.match.test(title)) continue
      if (rule.exclude?.test(title)) continue
      closed.set(rule.key, String(raw).trim())
    }
  }
  return closed
}

export async function gapKeysClosedByCompletedWork(assessmentId: string): Promise<Map<string, string>> {
  const [tasks, workflow] = await Promise.all([
    prisma.caseTask
      .findMany({
        where: { assessmentId, mergedIntoId: null, status: 'done' },
        select: { title: true },
      })
      .catch(() => [] as Array<{ title: string }>),
    (prisma as any).caseWorkflow
      ?.findUnique({
        where: { assessmentId },
        include: {
          items: {
            where: { status: 'done', stepType: { not: 'ai_milestone' } },
            select: { title: true },
          },
        },
      })
      .catch(() => null),
  ])
  const titles = [
    ...tasks.map((t) => t.title),
    ...((workflow?.items as Array<{ title: string }> | undefined) ?? []).map((i) => i.title),
  ]
  return gapKeysClosedByTitles(titles)
}
