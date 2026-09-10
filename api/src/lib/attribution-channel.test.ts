import { describe, expect, it } from 'vitest'
import { buildChannelReport, channelLabel, type AttributedLead } from './attribution-channel'

function lead(overrides: Partial<AttributedLead> = {}): AttributedLead {
  return {
    status: 'in_progress',
    assessmentId: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    gclid: null,
    referrer: null,
    ...overrides,
  }
}

describe('channelLabel', () => {
  it('prefers explicit utm tagging over everything else', () => {
    expect(
      channelLabel(lead({ utmSource: 'google', utmMedium: 'cpc', gclid: 'abc', referrer: 'https://x.com' })),
    ).toBe('google / cpc')
  })

  it('falls back to the source alone when no medium was tagged', () => {
    expect(channelLabel(lead({ utmSource: 'newsletter' }))).toBe('newsletter')
  })

  /**
   * Google Ads auto-tagging adds a click id without touching utm parameters, so
   * a bare gclid is an unambiguous paid click rather than an unknown.
   */
  it('reads a bare click id as paid Google traffic', () => {
    expect(channelLabel(lead({ gclid: 'Cj0KCQ' }))).toBe('google / cpc')
  })

  it('reports a referrer as a hostname rather than dressing it up as a channel', () => {
    expect(channelLabel(lead({ referrer: 'https://www.reddit.com/r/legal/xyz' }))).toBe(
      'referral / reddit.com',
    )
  })

  it('does not crash on a referrer that is not a URL', () => {
    expect(channelLabel(lead({ referrer: 'garbage' }))).toBe('referral / unknown')
  })

  it('calls an untagged arrival direct', () => {
    expect(channelLabel(lead())).toBe('direct')
  })
})

describe('buildChannelReport', () => {
  it('rolls leads up by channel and campaign', () => {
    const rows = buildChannelReport(
      [
        lead({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'brand' }),
        lead({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'brand' }),
        lead({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'injury' }),
      ],
      new Set(),
      new Set(),
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ channel: 'google / cpc', campaign: 'brand', leads: 2 })
    expect(rows[1]).toMatchObject({ campaign: 'injury', leads: 1 })
  })

  /**
   * Each column is "got at least this far", so the gap between columns reads as
   * the drop-off. A retained case therefore counts in every column.
   */
  it('counts the funnel cumulatively', () => {
    const rows = buildChannelReport(
      [lead({ utmSource: 'google', status: 'completed', assessmentId: 'a1' })],
      new Set(['a1']),
      new Set(['a1']),
    )

    expect(rows[0]).toMatchObject({ leads: 1, completed: 1, routed: 1, retained: 1 })
  })

  it('does not count an abandoned lead as completed', () => {
    const rows = buildChannelReport([lead({ utmSource: 'google' })], new Set(), new Set())
    expect(rows[0]).toMatchObject({ leads: 1, completed: 0, routed: 0, retained: 0 })
  })

  it('counts a routed case that has not been retained', () => {
    const rows = buildChannelReport(
      [lead({ utmSource: 'bing', status: 'completed', assessmentId: 'a2' })],
      new Set(['a2']),
      new Set(),
    )
    expect(rows[0]).toMatchObject({ completed: 1, routed: 1, retained: 0 })
  })

  it('separates direct traffic from tagged traffic', () => {
    const rows = buildChannelReport(
      [lead(), lead({ utmSource: 'google', utmMedium: 'cpc' })],
      new Set(),
      new Set(),
    )
    expect(rows.map((r) => r.channel).sort()).toEqual(['direct', 'google / cpc'])
  })

  it('returns nothing for no leads', () => {
    expect(buildChannelReport([], new Set(), new Set())).toEqual([])
  })
})
