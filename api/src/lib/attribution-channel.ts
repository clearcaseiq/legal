/**
 * Turning captured attribution into a channel-by-outcome report.
 *
 * This is the half of marketing measurement GA4 cannot do. GA4 knows a campaign
 * produced sessions; it never sees what became of them, because the intake
 * wizard and results page carry no tag. Our own database knows which cases were
 * retained but not where they came from — until `IntakeLead` started carrying
 * first-touch attribution. Joining the two is what makes cost per retained case
 * answerable.
 *
 * Kept out of the route so the channel-naming rules, which are judgement calls,
 * can be tested directly.
 */

export type AttributedLead = {
  status: string
  assessmentId: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  gclid: string | null
  /** Meta click id, from `attributionExtra` rather than a column of its own. */
  fbclid: string | null
  referrer: string | null
}

export type ChannelRow = {
  channel: string
  campaign: string | null
  leads: number
  completed: number
  routed: number
  retained: number
}

/**
 * What to call the channel a lead arrived from.
 *
 * Ordered by how much the signal can be trusted. An explicit `utm_source` was
 * put there deliberately by whoever built the link. A `gclid` with no utm tags
 * is an untagged Google Ads click, which is common and unambiguous — auto-
 * tagging adds the click id without touching utm parameters. A referrer is a
 * guess at best, so it is reported as a hostname rather than dressed up as a
 * channel name. Everything else is genuinely direct.
 *
 * `fbclid` sits below the referrer rather than beside `gclid`, and is not
 * called paid, because it is a weaker signal than it looks. Meta appends it to
 * every outbound link, organic posts included, so it says where a visit came
 * from and nothing about whether it was bought. Where a referrer survived, that
 * hostname is the better answer anyway — it distinguishes Instagram from
 * Facebook, which the click id does not. What this branch is for is the case
 * where no referrer survived, which is most of them: Meta's in-app browsers
 * routinely drop it, and those visits were being counted as direct.
 */
export function channelLabel(lead: AttributedLead): string {
  if (lead.utmSource) {
    return lead.utmMedium ? `${lead.utmSource} / ${lead.utmMedium}` : lead.utmSource
  }
  if (lead.gclid) return 'google / cpc'
  if (lead.referrer) return `referral / ${hostOf(lead.referrer)}`
  if (lead.fbclid) return 'meta'
  return 'direct'
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

/**
 * Roll leads up by channel and campaign.
 *
 * `routedAssessmentIds` and `retainedAssessmentIds` are passed in rather than
 * looked up here: `IntakeLead.assessmentId` is a bare column with no Prisma
 * relation behind it, so the join has to happen in the caller either way.
 *
 * Counts are deliberately cumulative down the funnel — a retained case is also
 * counted as routed, completed and a lead — so each column reads as "how many
 * got at least this far" and the drop between columns is the conversion.
 */
export function buildChannelReport(
  leads: AttributedLead[],
  routedAssessmentIds: Set<string>,
  retainedAssessmentIds: Set<string>,
): ChannelRow[] {
  const rows = new Map<string, ChannelRow>()

  for (const lead of leads) {
    const channel = channelLabel(lead)
    const campaign = lead.utmCampaign || null
    const key = `${channel}\u0000${campaign ?? ''}`

    let row = rows.get(key)
    if (!row) {
      row = { channel, campaign, leads: 0, completed: 0, routed: 0, retained: 0 }
      rows.set(key, row)
    }

    row.leads++
    if (lead.status === 'completed' || lead.assessmentId) row.completed++
    if (lead.assessmentId && routedAssessmentIds.has(lead.assessmentId)) row.routed++
    if (lead.assessmentId && retainedAssessmentIds.has(lead.assessmentId)) row.retained++
  }

  return [...rows.values()].sort((a, b) => b.leads - a.leads || a.channel.localeCompare(b.channel))
}
