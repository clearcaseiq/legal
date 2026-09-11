/**
 * A real single-case Clio export, end to end through the parser and mapper.
 *
 * Kept verbatim from the file an attorney could not import. Every assertion
 * here failed before: saved as `.txt` it was read as a one-column CSV, and
 * even parsed as JSON the nested keys (`case.incident_date`,
 * `client.first_name`) matched no mapping rule, so the row was skipped for
 * having no date of loss and would have arrived with no name on it.
 */
import { describe, expect, it } from 'vitest'
import { parseTabularText } from './tabular-import'
import { normalizeImportedCase } from './import-mapping'

const CLIO_EXPORT = `{
  "case": {
    "case_id": "CASE-2026-00125",
    "case_name": "John Smith v. ABC Insurance Company",
    "case_type": "Personal Injury - Vehicle Accident",
    "status": "Open",
    "priority": "High",
    "open_date": "2026-08-15",
    "incident_date": "2026-07-28",
    "jurisdiction": "California, USA"
  },
  "client": {
    "client_id": "CL-100245",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "phone": "+1-555-010-2456",
    "address": {
      "street": "123 Sample Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "zip_code": "90012",
      "country": "USA"
    }
  },
  "attorney": {
    "name": "Sarah Johnson, Esq.",
    "firm": "Johnson Legal Group",
    "email": "sarah.johnson@examplelaw.com",
    "phone": "+1-555-010-7890"
  },
  "incident": {
    "type": "Motor Vehicle Accident",
    "description": "The client was involved in a vehicle accident when another driver failed to stop at a traffic signal and collided with the client's vehicle.",
    "location": "Los Angeles, California",
    "injuries_reported": [
      "Neck pain",
      "Lower back pain",
      "Shoulder injury"
    ]
  },
  "insurance": {
    "company": "ABC Insurance Company",
    "claim_number": "CLM-2026-785421",
    "policy_number": "POL-XXXX-123456",
    "claim_status": "Under Review"
  },
  "documents": [
    {
      "document_id": "DOC-001",
      "file_name": "Accident_Report.pdf",
      "document_type": "Police Report",
      "upload_date": "2026-08-16",
      "status": "Uploaded"
    },
    {
      "document_id": "DOC-002",
      "file_name": "Medical_Records.pdf",
      "document_type": "Medical Records",
      "upload_date": "2026-08-18",
      "status": "Uploaded"
    },
    {
      "document_id": "DOC-003",
      "file_name": "Insurance_Declaration.pdf",
      "document_type": "Insurance Document",
      "upload_date": "2026-08-20",
      "status": "Pending Review"
    }
  ],
  "notes": [
    {
      "note_id": "NOTE-001",
      "date": "2026-08-21",
      "author": "Sarah Johnson, Esq.",
      "content": "Initial case review completed. Waiting for additional medical documentation."
    }
  ],
  "created_at": "2026-08-15T10:30:00Z",
  "updated_at": "2026-08-21T14:45:00Z"
}
`

/** The one row the file describes, as the importer sees it. */
const imported = () => {
  const table = parseTabularText(CLIO_EXPORT)
  expect(table.rows).toHaveLength(1)
  return normalizeImportedCase('clio', table.rows[0])
}

describe('reading the file', () => {
  it('recognises JSON without being told, whatever the file is named', () => {
    // The attorney's copy was a `.txt`, which the old parser read as a CSV
    // whose single column was named `{`.
    expect(parseTabularText(CLIO_EXPORT).format).toBe('json')
  })

  it('survives the byte order mark a Windows editor adds', () => {
    expect(parseTabularText(`\uFEFF${CLIO_EXPORT}`).format).toBe('json')
  })

  it('treats the whole document as one case rather than one of its branches', () => {
    // Unwrapping to `case` would drop the client's email and the address, the
    // two things this file carries that nothing else would.
    const table = parseTabularText(CLIO_EXPORT)
    expect(table.rows).toHaveLength(1)
    expect(table.headers).toContain('case.incident_date')
    expect(table.headers).toContain('client.email')
  })

  it('joins a list of injuries into one cell', () => {
    const table = parseTabularText(CLIO_EXPORT)
    expect(table.rows[0]['incident.injuries_reported']).toBe(
      'Neck pain; Lower back pain; Shoulder injury',
    )
  })
})

describe('mapping the nested columns', () => {
  it('finds the date of loss', () => {
    // The blocker. Without this the row was skipped as having no incident
    // date, which is why the import appeared to do nothing at all.
    expect(imported().incidentDate).toBe('2026-07-28')
    expect(imported().incidentDateIssue).toBeNull()
  })

  it('finds the client', () => {
    expect(imported()).toMatchObject({
      plaintiffFirstName: 'John',
      plaintiffLastName: 'Smith',
      plaintiffEmail: 'john.smith@example.com',
      plaintiffPhone: '+1-555-010-2456',
    })
  })

  it('finds the case id, so a re-import dedupes instead of duplicating', () => {
    expect(imported().externalId).toBe('CASE-2026-00125')
  })

  it('reads the claim type as an auto case', () => {
    expect(imported().claimType).toBe('auto')
  })

  it('finds the venue state on the client address', () => {
    expect(imported().venueState).toBe('CA')
  })

  it('prefers the incident description over the notes array', () => {
    // Both are candidates for the narrative and `notes` is a top-level key, so
    // a whole-file-then-leaves match order would have written the notes JSON
    // into the case narrative.
    expect(imported().narrative).toContain('failed to stop at a traffic signal')
  })

  it('records the injuries the engine grades severity from', () => {
    expect(imported().injuryDiagnoses).toEqual(['Neck pain', 'Lower back pain', 'Shoulder injury'])
  })

  it('captures the claim number and carrier so the case can be valued', () => {
    expect(imported().factPaths).toMatchObject({
      'insurance.claim_number': 'CLM-2026-785421',
      'insurance.defendant_carrier': 'ABC Insurance Company',
    })
  })

  it('does not mistake the policy number for a policy limit', () => {
    expect(imported().factPaths['insurance.defendant_coverage_limits']).toBeUndefined()
  })
})
