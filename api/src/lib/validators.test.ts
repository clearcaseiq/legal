import { describe, it, expect } from 'vitest'
import {
  Venue,
  Incident,
  Damages,
  Consents,
  AssessmentWrite,
  AssessmentUpdate,
  PredictionRequest,
  SimulationRequest,
  AttorneySearch,
  IntroRequest,
  UserRegister,
  UserLogin,
  UserUpdate,
  FavoriteAttorneyRequest,
  CaseAcceleration,
  JurisdictionIntelligence,
  PlaintiffContext,
  ExpectationCheck,
} from './validators'

describe('Venue', () => {
  it('accepts state and county', () => {
    expect(Venue.safeParse({ state: 'CA', county: 'Orange' }).success).toBe(true)
  })
})

describe('Incident', () => {
  it('requires date; narrative is optional in API validator', () => {
    expect(
      Incident.safeParse({ date: '2026-01-01', narrative: 'At least ten chars for narrative here.' }).success
    ).toBe(true)
    expect(Incident.safeParse({ date: '2026-01-01' }).success).toBe(true)
  })
})

describe('Damages', () => {
  it('accepts partial numeric fields', () => {
    expect(Damages.safeParse({ med_charges: 1000 }).success).toBe(true)
    expect(Damages.safeParse({}).success).toBe(true)
  })
})

describe('Consents', () => {
  it('requires three boolean fields (truthy or falsy)', () => {
    expect(Consents.safeParse({ tos: true, privacy: true, ml_use: true }).success).toBe(true)
    expect(Consents.safeParse({ tos: false, privacy: true, ml_use: true }).success).toBe(true)
    expect(Consents.safeParse({ tos: true, privacy: true }).success).toBe(false)
  })
})

describe('CaseAcceleration', () => {
  it('accepts empty object', () => {
    expect(CaseAcceleration.safeParse({}).success).toBe(true)
  })
})

describe('JurisdictionIntelligence', () => {
  it('accepts partial fields', () => {
    expect(JurisdictionIntelligence.safeParse({ state: 'CA' }).success).toBe(true)
  })
})

describe('PlaintiffContext', () => {
  it('accepts employment enum', () => {
    expect(PlaintiffContext.safeParse({ employmentType: 'w2' }).success).toBe(true)
  })
})

describe('ExpectationCheck', () => {
  it('accepts priority', () => {
    expect(ExpectationCheck.safeParse({ priority: 'fair_compensation' }).success).toBe(true)
  })
})

describe('AssessmentWrite', () => {
  it('matches minimal valid intake', () => {
    const ok = AssessmentWrite.safeParse({
      claimType: 'auto',
      venue: { state: 'CA', county: 'Los Angeles' },
      incident: { date: '2026-01-01', narrative: 'Long enough description of incident.' },
      injuries: [{ x: 1 }],
      damages: {},
      consents: { tos: true, privacy: true, ml_use: true },
    })
    expect(ok.success).toBe(true)
  })
})

describe('AssessmentUpdate', () => {
  it('accepts partial patch', () => {
    expect(AssessmentUpdate.safeParse({ venue: { state: 'NY', county: 'Kings' } }).success).toBe(true)
  })
})

describe('PredictionRequest', () => {
  it('requires assessmentId', () => {
    expect(PredictionRequest.safeParse({ assessmentId: 'abc' }).success).toBe(true)
    expect(PredictionRequest.safeParse({}).success).toBe(false)
  })
})

describe('SimulationRequest', () => {
  it('requires base and toggles objects', () => {
    expect(SimulationRequest.safeParse({ base: {}, toggles: {} }).success).toBe(true)
  })
})

describe('AttorneySearch', () => {
  it('defaults limit', () => {
    const r = AttorneySearch.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.limit).toBe(10)
  })
})

describe('IntroRequest', () => {
  it('requires ids', () => {
    expect(IntroRequest.safeParse({ assessmentId: 'a', attorneyId: 'b' }).success).toBe(true)
  })
})

describe('UserRegister', () => {
  const ok = {
    email: 'u@v.com',
    password: '12345678',
    firstName: 'A',
    lastName: 'B',
  }

  it('validates email and password length', () => {
    expect(UserRegister.safeParse(ok).success).toBe(true)
    expect(
      UserRegister.safeParse({
        email: 'bad',
        password: '12345678',
        firstName: 'A',
        lastName: 'B',
      }).success
    ).toBe(false)
  })

  it('rejects password shorter than 8', () => {
    expect(UserRegister.safeParse({ ...ok, password: '1234567' }).success).toBe(false)
  })

  it('rejects empty first or last name', () => {
    expect(UserRegister.safeParse({ ...ok, firstName: '' }).success).toBe(false)
    expect(UserRegister.safeParse({ ...ok, lastName: '' }).success).toBe(false)
  })

  it('accepts optional phone', () => {
    expect(UserRegister.safeParse({ ...ok, phone: '+1 415 555 0100' }).success).toBe(true)
    expect(UserRegister.safeParse({ ...ok, phone: undefined }).success).toBe(true)
  })

  it('rejects missing required keys', () => {
    expect(UserRegister.safeParse({ email: ok.email }).success).toBe(false)
  })
})

describe('UserLogin', () => {
  it('requires credentials', () => {
    expect(UserLogin.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })

  it('trims and lowercases email', () => {
    const r = UserLogin.safeParse({ email: '  Jane@Firm.COM  ', password: 'secret123' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('jane@firm.com')
  })
})

describe('UserUpdate', () => {
  it('requires names', () => {
    expect(UserUpdate.safeParse({ firstName: 'A', lastName: 'B' }).success).toBe(true)
  })
})

describe('FavoriteAttorneyRequest', () => {
  it('accepts attorneyId', () => {
    expect(FavoriteAttorneyRequest.safeParse({ attorneyId: 'att-1' }).success).toBe(true)
  })
})
