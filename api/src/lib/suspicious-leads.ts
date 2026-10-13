/**
 * Suspicious intake leads, as a CSV the ad agency can act on.
 *
 * The agency needs enough to find bad traffic in Google Ads — when, from which
 * IP, which click and campaign — and nothing about who the person is. So the
 * file carries no name, email, phone, case detail or lead id (the id is the
 * credential behind a resume link), and can be sent under a service-provider
 * agreement without disclosing any claimant's information.
 */
import { prisma } from './prisma'

/** Default window, and the widest allowed: IPs are cleared after 180 days anyway. */
export const DEFAULT_WINDOW_DAYS = 30
export const MAX_WINDOW_DAYS = 180

/** Leads examined per export. Ordered newest first, so the cap drops the oldest. */
const MAX_LEADS = 20_000

/** This many leads from one IP in the window is flagged. */
export const SAME_IP_THRESHOLD = 3

/** A lead this old with no verified code and no finished intake is flagged. */
export const NO_RESPONSE_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export const SUSPICIOUS_LEAD_COLUMNS = [
  'created_at',
  'ip_address',
  'gclid',
  'utm_campaign',
  'device_type',
  'repeat_count',
  'leads_from_same_ip',
  'otp_verified',
  'captcha',
  'last_step',
  'steps_reached',
  'status',
  'reasons',
] as const

type LeadRow = {
  createdAt: Date
  ipAddress: string | null
  gclid: string | null
  utmCampaign: string | null
  deviceType: string | null
  repeatCount: number
  captchaPassed: boolean | null
  currentStep: string | null
  stepHistory: string | null
  status: string
  assessmentId: string | null
}

export type SuspiciousLeadRow = Record<(typeof SUSPICIOUS_LEAD_COLUMNS)[number], string | number>

/** Resolve `from`/`to` query values to a window, or an error message. */
export function resolveWindow(
  fromRaw: unknown,
  toRaw: unknown,
  now: Date = new Date(),
): { from: Date; to: Date } | { error: string } {
  const parse = (value: unknown): Date | null | undefined => {
    if (value === undefined || value === '') return undefined
    if (typeof value !== 'string') return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const toParsed = parse(toRaw)
  const fromParsed = parse(fromRaw)
  if (toParsed === null || fromParsed === null) return { error: 'from and to must be dates (YYYY-MM-DD).' }

  // A bare date for `to` means through the end of that day, not its first instant.
  let to = toParsed ?? now
  if (typeof toRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toRaw)) to = new Date(to.getTime() + DAY_MS - 1)
  const from = fromParsed ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS)

  if (from > to) return { error: 'from must be before to.' }
  if (to.getTime() - from.getTime() > MAX_WINDOW_DAYS * DAY_MS) {
    return { error: `The date range can be at most ${MAX_WINDOW_DAYS} days.` }
  }
  return { from, to }
}

function stepsReached(stepHistory: string | null): number {
  if (!stepHistory) return 0
  try {
    const parsed = JSON.parse(stepHistory)
    if (!Array.isArray(parsed)) return 0
    return new Set(parsed.map((entry) => (entry && typeof entry === 'object' ? entry.step : null)).filter(Boolean)).size
  } catch {
    return 0
  }
}

function captchaLabel(value: boolean | null): string {
  if (value === true) return 'passed'
  if (value === false) return 'not_checked_cloudflare_unavailable'
  return 'not_configured'
}

export async function buildSuspiciousLeads(window: { from: Date; to: Date }, now: Date = new Date()): Promise<SuspiciousLeadRow[]> {
  const leads: LeadRow[] = await prisma.intakeLead.findMany({
    where: { createdAt: { gte: window.from, lte: window.to } },
    select: {
      createdAt: true,
      ipAddress: true,
      gclid: true,
      utmCampaign: true,
      deviceType: true,
      repeatCount: true,
      captchaPassed: true,
      currentStep: true,
      stepHistory: true,
      status: true,
      assessmentId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_LEADS,
  })
  if (!leads.length) return []

  const perIp = new Map<string, number>()
  for (const lead of leads) {
    if (lead.ipAddress) perIp.set(lead.ipAddress, (perIp.get(lead.ipAddress) ?? 0) + 1)
  }

  const assessmentIds = leads.map((lead) => lead.assessmentId).filter((id): id is string => Boolean(id))
  const verifiedRows = assessmentIds.length
    ? await prisma.caseSubmitOtp.findMany({
        where: { assessmentId: { in: assessmentIds }, verifiedAt: { not: null } },
        select: { assessmentId: true },
      })
    : []
  const verified = new Set(verifiedRows.map((row) => row.assessmentId))

  const rows: SuspiciousLeadRow[] = []
  for (const lead of leads) {
    const sameIp = lead.ipAddress ? perIp.get(lead.ipAddress) ?? 0 : 0
    const otpVerified = Boolean(lead.assessmentId && verified.has(lead.assessmentId))
    const reasons: string[] = []
    if (lead.repeatCount >= 1) reasons.push('repeat_contact')
    if (sameIp >= SAME_IP_THRESHOLD) reasons.push('many_leads_same_ip')
    if (lead.captchaPassed === false) reasons.push('captcha_not_verified')
    if (
      !otpVerified &&
      lead.status !== 'completed' &&
      now.getTime() - lead.createdAt.getTime() > NO_RESPONSE_DAYS * DAY_MS
    ) {
      reasons.push('no_response_7_days')
    }
    if (!reasons.length) continue

    rows.push({
      created_at: lead.createdAt.toISOString(),
      ip_address: lead.ipAddress ?? '',
      gclid: lead.gclid ?? '',
      utm_campaign: lead.utmCampaign ?? '',
      device_type: lead.deviceType ?? '',
      repeat_count: lead.repeatCount,
      leads_from_same_ip: sameIp,
      otp_verified: otpVerified ? 'yes' : 'no',
      captcha: captchaLabel(lead.captchaPassed),
      last_step: lead.status === 'completed' ? 'completed' : lead.currentStep ?? '',
      steps_reached: stepsReached(lead.stepHistory),
      status: lead.status,
      reasons: reasons.join(';'),
    })
  }
  return rows
}

/**
 * One CSV cell.
 *
 * gclid and UTM values come from the query string of a page anyone can link to,
 * and this file is opened in a spreadsheet by someone outside the company, so a
 * leading formula character is neutralised rather than trusted.
 */
function csvCell(value: string | number): string {
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function suspiciousLeadsToCsv(rows: SuspiciousLeadRow[]): string {
  const lines = [SUSPICIOUS_LEAD_COLUMNS.join(',')]
  for (const row of rows) lines.push(SUSPICIOUS_LEAD_COLUMNS.map((column) => csvCell(row[column])).join(','))
  return `${lines.join('\n')}\n`
}
