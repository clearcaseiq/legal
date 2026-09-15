/**
 * A fake State Bar, so every verification outcome can be exercised without
 * borrowing a real attorney's identity.
 *
 * The live lookup can only be driven with real published bar numbers, which
 * means testing the "suspended licence" or "name mismatch" paths would require
 * finding a real suspended attorney and registering an account in their name.
 * These fixtures remove that: the numbers are shaped so they cannot collide
 * with a California licence, which is digits only.
 *
 * Reached only when `STATE_BAR_LOOKUP_MODE=mock`, which `env.ts` refuses in
 * production.
 */

/**
 * The test namespace.
 *
 * Matched on the raw trimmed input, because the live lookup's first act is to
 * strip non-digits — which would turn `TEST-CA-000001` into `000001` and send
 * it to calbar as a real query, exactly the failure this file prevents.
 */
const TEST_BAR_NUMBER = /^TEST-CA-\d{6}$/i

export interface MockBarRecord {
  /** Absent when the number resolves to nobody. */
  name?: string
  /** Verbatim status string, as the bar publishes it. */
  status?: string
  city?: string
  admissionDate?: string
  /** Simulates an upstream failure: the caller should treat this as "could not check". */
  throws?: boolean
}

/**
 * Deliberately includes the cases the live bar cannot be made to produce on
 * demand — non-active statuses, a name that does not match the registrant, and
 * two flavours of upstream failure.
 */
const RECORDS: Record<string, MockBarRecord> = {
  'TEST-CA-000001': {
    name: 'Ryan Garcia',
    status: 'Active',
    city: 'Los Angeles',
    admissionDate: 'June 15, 2018',
  },
  'TEST-CA-000002': {
    name: 'Dana Whitfield',
    status: 'Inactive',
    city: 'San Diego',
    admissionDate: 'January 4, 2009',
  },
  'TEST-CA-000003': {
    name: 'Marcus Feld',
    status: 'Suspended',
    city: 'Sacramento',
    admissionDate: 'September 22, 2011',
  },
  'TEST-CA-000004': {
    name: 'Priya Raghunathan',
    status: 'Active',
    city: 'San Francisco',
    admissionDate: 'March 2, 2015',
  },
  // Only meaningful against a registrant named something else — it is the
  // account name, not this record, that makes it a mismatch.
  'TEST-CA-000005': {
    name: 'Eleanor Vance',
    status: 'Active',
    city: 'Oakland',
    admissionDate: 'July 19, 2004',
  },
  // A maiden name: shares a surname with "Jennifer Okonkwo", so the lenient
  // token comparison should still clear it.
  'TEST-CA-000006': {
    name: 'Jennifer Barnes',
    status: 'Active',
    city: 'Fresno',
    admissionDate: 'May 30, 2013',
  },
  'TEST-CA-000007': { throws: true },
  'TEST-CA-000008': { throws: true },
  'TEST-CA-999999': {},
}

/** Whether this input is a test number, checked before any normalisation. */
export function isTestBarNumber(raw: string | null | undefined): boolean {
  return TEST_BAR_NUMBER.test(String(raw ?? '').trim())
}

/**
 * The fixture for a test number.
 *
 * An unlisted number inside the namespace resolves to nobody rather than
 * throwing, so adding a case to a test does not require editing this table.
 */
export function mockBarRecord(raw: string): MockBarRecord {
  return RECORDS[String(raw).trim().toUpperCase()] ?? {}
}
