import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'

/**
 * The path every dollar takes: a claimant completes intake, picks a firm and
 * authorizes sharing, the case is routed to that firm, the attorney accepts the
 * participation agreement, starts the routing-fee payment and accepts the case.
 *
 * Runs against the API directly, so the web dev server is not needed. Create
 * the test attorney first; it is reset on every run:
 *
 *   pnpm --filter caseiq-api exec tsx scripts/e2e-money-path-fixture.ts ../e2e/.sessions.money-path.json
 *   E2E_MONEY_PATH=e2e/.sessions.money-path.json pnpm test:e2e e2e/money-path.e2e.spec.ts
 *
 * E2E_API_URL defaults to http://localhost:4000. The submit step needs the
 * one-time code: locally the API hands it back when no email/SMS provider is
 * configured, and a server with CASE_SUBMIT_OTP_REQUIRED=false skips it. With
 * a live provider and no override the test stops there and says so.
 */

type Fixture = {
  attorney: { token: string; attorneyId: string; user: { email: string } }
}

const fixturePath = resolve(process.env.E2E_MONEY_PATH || 'e2e/.sessions.money-path.json')
const fixture: Fixture | null = existsSync(fixturePath) ? JSON.parse(readFileSync(fixturePath, 'utf8')) : null
const apiUrl = (process.env.E2E_API_URL || 'http://localhost:4000').replace(/\/$/, '')

async function json(response: APIResponse, label: string) {
  const text = await response.text()
  expect(response.ok(), `${label} -> ${response.status()} ${text.slice(0, 500)}`).toBe(true)
  return text ? JSON.parse(text) : {}
}

test.describe('money path: intake to paid acceptance', () => {
  test.skip(!fixture, `No attorney fixture at ${fixturePath}; run api/scripts/e2e-money-path-fixture.ts first`)
  test.setTimeout(120_000)

  let api: APIRequestContext
  const attorneyHeaders = () => ({ Authorization: `Bearer ${fixture!.attorney.token}` })

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: apiUrl })
  })
  test.afterAll(async () => {
    await api?.dispose()
  })

  test('claimant routes a case to a firm that pays and accepts it', async () => {
    const runId = Date.now()
    const claimantEmail = `e2e-claimant-${runId}@clearcaseiq.test`
    const attorneyId = fixture!.attorney.attorneyId

    const created = await json(
      await api.post('/v1/assessments', {
        data: {
          claimType: 'auto',
          venue: { state: 'CA', county: 'Los Angeles' },
          incident: {
            date: new Date(runId - 30 * 86_400_000).toISOString().slice(0, 10),
            narrative: 'Stopped at a red light on Wilshire when another driver rear-ended my car at speed.',
          },
          injuries: [{ description: 'Neck and lower back pain, treated at urgent care' }],
          damages: { med_charges: 4200 },
          consents: { tos: true, privacy: true, ml_use: true },
          platformDisclosureAckAt: new Date().toISOString(),
        },
      }),
      'create assessment',
    )
    const assessmentId: string = created.assessment_id
    expect(assessmentId).toBeTruthy()

    const contact = { firstName: 'E2E', email: claimantEmail, preferredContactMethod: 'email' as const }
    const otp = await json(await api.post(`/v1/assessments/${assessmentId}/submit-otp`, { data: contact }), 'request submit code')
    test.skip(
      otp.required !== false && !otp.devCode,
      'The API delivered the submit code by email/SMS; run locally without a provider or set CASE_SUBMIT_OTP_REQUIRED=false',
    )

    const submitted = await json(
      await api.post(`/v1/assessments/${assessmentId}/submit-for-review`, {
        data: {
          ...contact,
          hipaa: true,
          rankedAttorneyIds: [attorneyId],
          attorneyShareAuthorized: true,
          ...(otp.devCode ? { otpCode: otp.devCode } : {}),
        },
      }),
      'submit case to chosen firm',
    )
    expect(submitted.submitted).toBe(true)

    // Routing runs after the submit response, so wait for the offer to land.
    let lead: { id: string; assessmentId: string } | undefined
    await expect
      .poll(
        async () => {
          const body = await json(
            await api.get('/v1/attorney-dashboard/leads/filtered?limit=50', { headers: attorneyHeaders() }),
            'attorney lead list',
          )
          const leads: Array<{ id: string; assessmentId: string }> = body.leads ?? body.items ?? []
          lead = leads.find((row) => row.assessmentId === assessmentId)
          return Boolean(lead)
        },
        { timeout: 60_000, intervals: [1_000, 2_000, 3_000] },
      )
      .toBe(true)
    const leadId = lead!.id

    // The fixture withdraws any earlier acceptance; rerunning the spec without
    // it leaves the agreement accepted, and probing the gate would then accept
    // the case for real.
    const agreement = await json(await api.get('/v1/attorney-agreement/status', { headers: attorneyHeaders() }), 'agreement status')
    if (agreement.accepted) {
      test.info().annotations.push({ type: 'skipped-check', description: 'Agreement gate not exercised: re-run the fixture to reset it' })
    } else {
      const blocked = await api.post(`/v1/attorney-dashboard/leads/${leadId}/decision`, {
        headers: attorneyHeaders(),
        data: { decision: 'accept', conflictAcknowledged: true },
      })
      expect(blocked.status()).toBe(403)
      expect((await blocked.json()).code).toBe('AGREEMENT_REQUIRED')
      await json(
        await api.post('/v1/attorney-agreement/accept', { headers: attorneyHeaders(), data: { version: agreement.version } }),
        'accept agreement',
      )
    }

    const fee = await json(
      await api.post('/v1/payments/platform/routing-fee-session', { headers: attorneyHeaders(), data: { leadId } }),
      'routing fee session',
    )
    // Which of these comes back is configuration (fee off, payments off,
    // subscription credit, live checkout); any other answer is a broken path.
    expect([
      'not_required',
      'skipped_payments_disabled',
      'skipped_stripe_not_configured',
      'subscription_applied',
      'checkout_required',
    ]).toContain(fee.status)
    if (fee.status === 'checkout_required') expect(fee.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    const decision = await json(
      await api.post(`/v1/attorney-dashboard/leads/${leadId}/decision`, {
        headers: attorneyHeaders(),
        data: { decision: 'accept', conflictAcknowledged: true },
      }),
      'accept case',
    )
    expect(JSON.stringify(decision)).not.toContain('"error"')

    const after = await json(
      await api.get('/v1/attorney-dashboard/leads/filtered?limit=50', { headers: attorneyHeaders() }),
      'attorney lead list after accept',
    )
    const accepted = (after.leads ?? after.items ?? []).find((row: { id: string }) => row.id === leadId)
    expect(accepted?.assignedAttorneyId).toBe(attorneyId)
  })
})
