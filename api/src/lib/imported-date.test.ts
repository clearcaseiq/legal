import { describe, expect, it } from 'vitest'
import { parseIncidentDate } from './imported-date'

/** Fixed so the future-date rule is not a clock-dependent test. */
const TODAY = new Date(Date.UTC(2026, 8, 11))

const parse = (value: string) => parseIncidentDate(value, TODAY)

/** The date, or the reason, whichever the parse produced. */
const result = (value: string) => {
  const parsed = parse(value)
  return parsed.ok ? parsed.date : `rejected: ${parsed.reason}`
}

describe('the spellings a CMS export actually uses', () => {
  it('reads an ISO date', () => {
    expect(result('2024-03-04')).toBe('2024-03-04')
  })

  it('reads an ISO timestamp as the day it falls on', () => {
    expect(result('2024-03-04T00:00:00.000Z')).toBe('2024-03-04')
    expect(result('2024-03-04 09:30:00')).toBe('2024-03-04')
  })

  it('reads a US date', () => {
    expect(result('3/4/2024')).toBe('2024-03-04')
    expect(result('12/25/2024')).toBe('2024-12-25')
  })

  it('accepts dots and dashes as separators', () => {
    expect(result('12.25.2024')).toBe('2024-12-25')
    expect(result('12-25-2024')).toBe('2024-12-25')
  })

  it('reads a year-first date', () => {
    expect(result('2024/03/04')).toBe('2024-03-04')
  })

  it('reads a written month', () => {
    expect(result('Jan 5, 2024')).toBe('2024-01-05')
    expect(result('January 5th 2024')).toBe('2024-01-05')
    expect(result('5 Jan 2024')).toBe('2024-01-05')
    expect(result('5th September, 2024')).toBe('2024-09-05')
    expect(result('Sept 5, 2024')).toBe('2024-09-05')
  })

  it('pads a single-digit month and day', () => {
    expect(result('2024-1-5')).toBe('2024-01-05')
  })
})

describe('day-first exports', () => {
  it('reads day-first when the first number cannot be a month', () => {
    // The old parser returned undefined for this, so a whole UK or Canadian
    // export skipped every row dated after the 12th.
    expect(result('25/12/2024')).toBe('2024-12-25')
  })

  it('flags a date that could be read either way', () => {
    const parsed = parse('03/04/2024')
    expect(parsed).toMatchObject({ ok: true, date: '2024-03-04', ambiguous: true })
  })

  it('does not flag a date only one reading fits', () => {
    expect(parse('25/12/2024')).toMatchObject({ ambiguous: false })
    expect(parse('12/25/2024')).toMatchObject({ ambiguous: false })
    expect(parse('2024-03-04')).toMatchObject({ ambiguous: false })
  })

  it('rejects a date where neither number can be a month', () => {
    expect(result('25/13/2024')).toMatch(/not a real calendar date/)
  })
})

describe('two-digit years', () => {
  it('reads a recent one as this century', () => {
    expect(result('3/4/24')).toBe('2024-03-04')
  })

  it('reads one that would be in the future as last century', () => {
    // 98 as 2098 would be rejected as future-dated, which is not what a file
    // recording a 1998 date of loss means.
    expect(result('3/4/98')).toBe('1998-03-04')
  })
})

describe('Excel serials', () => {
  it('converts a serial in the plausible range', () => {
    // 45000 is 2023-03-15. The old parser read this as the year 45000 and
    // imported the case, giving it an SOL deadline forty millennia out.
    expect(result('45000')).toBe('2023-03-15')
  })

  it('lands on the right day at both ends of the range', () => {
    expect(result('20000')).toBe('1954-10-03')
    expect(result('44927')).toBe('2023-01-01')
  })

  it('reads a serial written with a trailing decimal', () => {
    expect(result('45000.0')).toBe('2023-03-15')
  })

  it('names a bare year as a year rather than converting it', () => {
    expect(result('2024')).toMatch(/is a year, not a date/)
  })

  it('rejects a number too large to be a date', () => {
    expect(result('8675309')).toMatch(/is a number, not a date/)
  })

  it('tells the attorney how to fix an unformatted date column', () => {
    const parsed = parse('123')
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason).toContain('format it as a date')
  })
})

describe('values we refuse to guess at', () => {
  it('reports a missing date as missing', () => {
    const parsed = parse('')
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason).toContain('No incident date')
  })

  it('treats whitespace as missing', () => {
    expect(parse('   ').ok).toBe(false)
  })

  it('rejects prose', () => {
    expect(result('last spring')).toMatch(/not a date we can read/)
    expect(result('TBD')).toMatch(/not a date we can read/)
    expect(result('n/a')).toMatch(/not a date we can read/)
  })

  it('rejects a day that does not exist in that month', () => {
    expect(result('02/30/2024')).toMatch(/not a real calendar date/)
    expect(result('2023-02-29')).toMatch(/not a real calendar date/)
  })

  it('accepts a real leap day', () => {
    expect(result('2024-02-29')).toBe('2024-02-29')
  })

  it('rejects a future date of loss', () => {
    // Almost always a mistyped year, and every SOL and treatment-gap
    // calculation on the case would be measured from it.
    expect(result('2027-01-05')).toMatch(/is in the future/)
  })

  it('accepts today', () => {
    expect(result('2026-09-11')).toBe('2026-09-11')
  })

  it('rejects a year before 1900 as a typo', () => {
    expect(result('1885-04-02')).toMatch(/before 1900/)
  })

  it('quotes the offending value so the row can be found', () => {
    const parsed = parse('40/40/4040')
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason).toContain('40/40/4040')
  })

  it('does not paste a whole paragraph into the error list', () => {
    const parsed = parse('x'.repeat(400))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.reason.length).toBeLessThan(160)
  })
})

describe('timezones', () => {
  it('reads both spellings of one day as the same day', () => {
    // These used to differ: ISO parsed as UTC midnight and the slashed form as
    // local midnight, so west of Greenwich they landed a day apart.
    expect(result('2024-03-04')).toBe(result('3/4/2024'))
  })
})
