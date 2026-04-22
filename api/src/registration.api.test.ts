import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('bcryptjs', () => ({
  __esModule: true as const,
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedpasswordhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const plaintiffValid = {
  email: 'plaintiff.integration@test.local',
  password: 'password123',
  firstName: 'Paul',
  lastName: 'Plaintiff',
  phone: '+15555550123',
}

const attorneyValidMinimal = {
  email: 'attorney.integration@test.local',
  password: 'password123',
  firstName: 'Amy',
  lastName: 'Advocate',
  specialties: ['auto'],
  venues: ['CA'],
}

describe('Plaintiff registration POST /v1/auth/register', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('201 creates user and returns token shape', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-pl-1',
      email: plaintiffValid.email,
      firstName: plaintiffValid.firstName,
      lastName: plaintiffValid.lastName,
      phone: plaintiffValid.phone,
      createdAt: new Date(),
    } as any)

    const res = await request(app).post('/v1/auth/register').send(plaintiffValid)

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({
      id: 'user-pl-1',
      email: plaintiffValid.email,
      firstName: plaintiffValid.firstName,
      lastName: plaintiffValid.lastName,
    })
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(10)
    expect(prisma.user.create).toHaveBeenCalledOnce()
  })

  it('201 omits phone when not sent', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-pl-2',
      email: 'nophone@test.local',
      firstName: 'N',
      lastName: 'P',
      phone: null,
      createdAt: new Date(),
    } as any)

    const res = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'nophone@test.local',
        password: 'password123',
        firstName: 'N',
        lastName: 'P',
      })

    expect(res.status).toBe(201)
  })

  it('409 when email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any)

    const res = await request(app).post('/v1/auth/register').send(plaintiffValid)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('User already exists')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('400 invalid email', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ ...plaintiffValid, email: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid registration data')
  })

  it('400 password under 8 characters', async () => {
    const res = await request(app).post('/v1/auth/register').send({ ...plaintiffValid, password: 'short' })

    expect(res.status).toBe(400)
  })

  it('400 empty firstName', async () => {
    const res = await request(app).post('/v1/auth/register').send({ ...plaintiffValid, firstName: '' })

    expect(res.status).toBe(400)
  })

  it('400 empty lastName', async () => {
    const res = await request(app).post('/v1/auth/register').send({ ...plaintiffValid, lastName: '' })

    expect(res.status).toBe(400)
  })

  it('400 missing body fields', async () => {
    const res = await request(app).post('/v1/auth/register').send({ email: plaintiffValid.email })

    expect(res.status).toBe(400)
  })
})

describe('Attorney registration POST /v1/attorney-register/register', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('201 creates user, attorney, profile and returns token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)

    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'u-att-1',
      email: attorneyValidMinimal.email,
      firstName: attorneyValidMinimal.firstName,
      lastName: attorneyValidMinimal.lastName,
      phone: null,
      role: 'attorney',
    } as any)

    vi.mocked(prisma.attorney.create).mockResolvedValue({
      id: 'att-1',
      name: 'Amy Advocate, Esq.',
      email: attorneyValidMinimal.email,
      phone: null,
      specialties: JSON.stringify(['auto']),
      venues: JSON.stringify(['CA']),
      isActive: true,
      isVerified: false,
    } as any)

    vi.mocked(prisma.attorneyProfile.create).mockResolvedValue({
      id: 'prof-1',
      firmName: null,
      minInjurySeverity: null,
      maxCasesPerWeek: null,
      maxCasesPerMonth: null,
      pricingModel: null,
      paymentModel: null,
    } as any)

    const res = await request(app).post('/v1/attorney-register/register').send(attorneyValidMinimal)

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe(attorneyValidMinimal.email)
    expect(res.body.attorney.specialties).toEqual(['auto'])
    expect(res.body.attorney.venues).toEqual(['CA'])
    expect(res.body.profile.jurisdictions).toEqual([
      { state: 'CA', counties: [], cities: [] },
    ])
    expect(typeof res.body.token).toBe('string')
    expect(prisma.user.create).toHaveBeenCalledOnce()
    expect(prisma.attorney.create).toHaveBeenCalledOnce()
    expect(prisma.attorneyProfile.create).toHaveBeenCalledOnce()
  })

  it('201 with extended profile fields', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)

    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u2', email: 'x@y.com', firstName: 'A', lastName: 'B' } as any)
    vi.mocked(prisma.attorney.create).mockResolvedValue({
      id: 'a2',
      name: 'A B, Esq.',
      email: 'x@y.com',
      phone: null,
      specialties: '[]',
      venues: '[]',
    } as any)

    vi.mocked(prisma.attorneyProfile.create).mockResolvedValue({
      id: 'p2',
      firmName: 'Law Offices',
      minInjurySeverity: 2,
      maxCasesPerWeek: 10,
      maxCasesPerMonth: 40,
      pricingModel: 'fixed_price',
      paymentModel: 'subscription',
    } as any)

    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({
        email: 'x@y.com',
        password: 'password123',
        firstName: 'A',
        lastName: 'B',
        firmName: 'Law Offices',
        firmWebsite: 'https://example.com',
        stateBarNumber: '12345',
        stateBarState: 'CA',
        specialties: ['auto', 'medmal'],
        venues: ['CA', 'NY'],
        jurisdictions: [
          { state: 'CA', counties: ['Los Angeles'], cities: [] },
          { state: 'NY', counties: [], cities: ['NYC'] },
        ],
        minInjurySeverity: 2,
        maxCasesPerWeek: 10,
        maxCasesPerMonth: 40,
        intakeHours: '24/7',
        intakeStatus: 'accept_immediately',
        preferredConsultationMethod: 'zoom',
        pricingModel: 'fixed_price',
        paymentModel: 'subscription',
        subscriptionTier: 'premium',
        insuranceRequired: true,
        mustHaveMedicalTreatment: true,
      })

    expect(res.status).toBe(201)
    expect(res.body.profile.firmName).toBe('Law Offices')
  })

  it('409 when user email exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'exists' } as any)

    const res = await request(app).post('/v1/attorney-register/register').send(attorneyValidMinimal)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Email already registered')
  })

  it('409 when attorney email exists (user path not taken)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue({ id: 'att-exists' } as any)

    const res = await request(app).post('/v1/attorney-register/register').send(attorneyValidMinimal)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Attorney with this email already exists')
  })

  it('400 missing specialties', async () => {
    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({ ...attorneyValidMinimal, specialties: [] })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid registration data')
  })

  it('400 missing venues', async () => {
    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({ ...attorneyValidMinimal, venues: [] })

    expect(res.status).toBe(400)
  })

  it('400 invalid firmWebsite', async () => {
    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({
        ...attorneyValidMinimal,
        firmWebsite: 'not-a-valid-url',
      })

    expect(res.status).toBe(400)
  })

  it('400 stateBarState wrong length when provided', async () => {
    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({
        ...attorneyValidMinimal,
        stateBarState: 'California',
      })

    expect(res.status).toBe(400)
  })

  it('400 intakeHours object with invalid dayOfWeek', async () => {
    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({
        ...attorneyValidMinimal,
        intakeHours: [{ dayOfWeek: 99, startTime: 9, endTime: 17 }],
      })

    expect(res.status).toBe(400)
  })

  it('400 subscriptionTier invalid enum', async () => {
    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({
        ...attorneyValidMinimal,
        subscriptionTier: 'gold',
      })

    expect(res.status).toBe(400)
  })

  it('accepts empty firmWebsite string', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.attorney.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u', email: 'e2@test.local', firstName: 'A', lastName: 'B' } as any)
    vi.mocked(prisma.attorney.create).mockResolvedValue({
      id: 'a',
      name: 'A B, Esq.',
      email: 'e2@test.local',
      phone: null,
      specialties: '[]',
      venues: '[]',
    } as any)
    vi.mocked(prisma.attorneyProfile.create).mockResolvedValue({
      id: 'p',
      firmName: null,
      minInjurySeverity: null,
      maxCasesPerWeek: null,
      maxCasesPerMonth: null,
      pricingModel: null,
      paymentModel: null,
    } as any)

    const res = await request(app)
      .post('/v1/attorney-register/register')
      .send({
        ...attorneyValidMinimal,
        email: 'e2@test.local',
        firmWebsite: '',
      })

    expect(res.status).toBe(201)
  })
})
