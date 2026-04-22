import { test, expect } from '@playwright/test'

test.describe('Plaintiff dashboard consult lifecycle', () => {
  test('books, reschedules, waitlists, preps, reviews, and cancels a consult', async ({ page }) => {
    test.setTimeout(90000)

    let availabilityCallCount = 0
    let scheduledAt: string | null = null
    let waitlistStatus: string | null = null
    let reviewEligible = false
    let prepNotes = ''
    let prepItems = [
      { id: 'apt-1:consult_goal', label: 'Write down your top three questions for the attorney', status: 'pending', isRequired: true },
      { id: 'apt-1:medical_records', label: 'Upload any medical records or visit summaries', status: 'pending', isRequired: true },
    ]

    const routingStatus = () => ({
      lifecycleState: 'attorney_matched',
      statusMessage: 'Attorney interested in your case',
      attorneysRouted: 1,
      attorneysReviewing: 0,
      attorneyMatched: {
        id: 'att-1',
        name: 'Alex Attorney',
        email: 'alex@example.com',
        phone: '555-111-2222',
        firmName: 'Justice Law Group',
        specialties: JSON.stringify(['auto']),
        yearsExperience: 12,
        responseTimeHours: 6,
      },
      attorneyActivity: [],
      caseMessages: [],
      caseChatRoomId: 'chat-1',
      upcomingAppointment: scheduledAt
        ? {
            id: 'apt-1',
            scheduledAt,
            type: 'phone',
            attorney: { id: 'att-1', name: 'Alex Attorney' },
            preparation: {
              checkInStatus: prepNotes ? 'completed' : 'pending',
              preparationNotes: prepNotes,
              prepItems,
              waitlistStatus,
            },
            reviewEligible,
          }
        : null,
    })

    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'header.payload.signature')
      localStorage.setItem('auth_role', 'plaintiff')
      localStorage.setItem('user', JSON.stringify({
        id: 'user-pl-1',
        email: 'plaintiff@test.local',
        firstName: 'Pat',
        lastName: 'Lee',
        role: 'client',
      }))
    })

    await page.route('**/v1/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()

      if (url.includes('/v1/auth/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-pl-1',
            email: 'plaintiff@test.local',
            firstName: 'Pat',
            lastName: 'Lee',
            emailVerified: true,
            _count: { assessments: 1, favoriteAttorneys: 0 },
            createdAt: '2026-04-01T00:00:00.000Z',
          }),
        })
      }

      if (url.includes('/v1/consent/plaintiff/user-pl-1/compliance')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ allRequiredConsentsGranted: true, missingConsents: [] }),
        })
      }

      if (url.endsWith('/v1/assessments') && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'asm-1',
            claimType: 'auto',
            venue: { state: 'CA', county: 'Los Angeles' },
            status: 'SUBMITTED',
            created_at: '2026-04-10T00:00:00.000Z',
            submittedForReview: true,
          }]),
        })
      }

      if (url.includes('/v1/assessments/asm-1/document-requests')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ assessmentId: 'asm-1', evidenceCount: 0, requests: [] }),
        })
      }

      if (url.includes('/v1/assessments/asm-1') && method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'asm-1',
            claimType: 'auto',
            venue: { state: 'CA', county: 'Los Angeles' },
            venueState: 'CA',
            facts: JSON.stringify({
              incident: {
                narrative: 'Rear-end collision on the freeway.',
                location: 'Los Angeles, CA',
              },
              injuries: [{ type: 'soft_tissue' }],
              treatment: [{ provider: 'Urgent Care' }],
              damages: {},
            }),
            latest_prediction: {
              viability: { overall: 0.72, liability: 0.8 },
              value_bands: { p25: 15000, median: 28000, p75: 45000 },
            },
            submittedForReview: true,
          }),
        })
      }

      if (url.includes('/v1/evidence?assessmentId=asm-1')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }

      if (url.includes('/v1/case-routing/assessment/asm-1/status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(routingStatus()),
        })
      }

      if (url.includes('/v1/appointments/attorney/att-1/availability')) {
        availabilityCallCount += 1
        const slots = availabilityCallCount >= 3
          ? []
          : [
              { start: availabilityCallCount === 2 ? '2026-04-22T17:00:00.000Z' : '2026-04-21T16:00:00.000Z', end: '2026-04-21T16:30:00.000Z', available: true },
              { start: availabilityCallCount === 2 ? '2026-04-22T18:00:00.000Z' : '2026-04-21T17:00:00.000Z', end: '2026-04-21T17:30:00.000Z', available: true },
            ]
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ slots }),
        })
      }

      if (url.endsWith('/v1/appointments') && method === 'POST') {
        const body = route.request().postDataJSON() as Record<string, string>
        scheduledAt = String(body.scheduledAt)
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            appointment_id: 'apt-1',
            type: 'phone',
            scheduled_at: scheduledAt,
            duration: 30,
            status: 'SCHEDULED',
            attorney: { id: 'att-1', name: 'Alex Attorney' },
          }),
        })
      }

      if (url.includes('/v1/appointments/apt-1') && method === 'PUT' && !url.endsWith('/prep')) {
        const body = route.request().postDataJSON() as Record<string, string>
        scheduledAt = String(body.scheduledAt)
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointment_id: 'apt-1',
            type: 'phone',
            scheduled_at: scheduledAt,
            duration: 30,
            status: 'SCHEDULED',
            attorney: { id: 'att-1', name: 'Alex Attorney' },
          }),
        })
      }

      if (url.endsWith('/v1/appointments/waitlist') && method === 'POST') {
        waitlistStatus = 'active'
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ waitlistId: 'wait-1', status: 'active' }),
        })
      }

      if (url.endsWith('/v1/appointments/apt-1/prep') && method === 'PUT') {
        const body = route.request().postDataJSON() as {
          preparationNotes?: string
          checkInStatus?: string
          items?: Array<{ id: string; status: string }>
        }
        if (body.items?.length) {
          prepItems = prepItems.map((item) =>
            item.id === body.items?.[0]?.id ? { ...item, status: body.items?.[0]?.status || item.status } : item,
          )
        }
        if (typeof body.preparationNotes === 'string') {
          prepNotes = body.preparationNotes
          reviewEligible = true
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(routingStatus().upcomingAppointment?.preparation || {}),
        })
      }

      if (url.endsWith('/v1/attorney-profiles/att-1/reviews') && method === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ review_id: 'rev-1', isVerified: true }),
        })
      }

      if (url.endsWith('/v1/appointments/apt-1') && method === 'DELETE') {
        scheduledAt = null
        return route.fulfill({ status: 204, body: '' })
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /hi pat/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /^attorney match$/i })).toBeVisible()

    await page.getByRole('button', { name: /^schedule consultation$/i }).first().click()
    const scheduleModal = page.locator('.fixed.inset-0.z-50').last()
    await expect(scheduleModal.getByRole('heading', { name: /^schedule consultation$/i })).toBeVisible()
    await scheduleModal.locator('.grid.grid-cols-2.gap-2').nth(1).locator('button').first().click()
    await scheduleModal.getByRole('button', { name: /schedule call/i }).click()
    await expect(page.getByText(/consultation scheduled/i)).toBeVisible()

    await page.getByRole('button', { name: /reschedule/i }).click()
    const rescheduleModal = page.locator('.fixed.inset-0.z-50').last()
    await rescheduleModal.locator('.grid.grid-cols-2.gap-2').nth(1).locator('button').nth(1).click()
    await rescheduleModal.getByRole('button', { name: /confirm reschedule/i }).click()
    await expect(page.getByText(/consultation rescheduled/i)).toBeVisible()

    await page.getByRole('button', { name: /reschedule/i }).click()
    const waitlistModal = page.locator('.fixed.inset-0.z-50').last()
    await expect(waitlistModal.getByRole('button', { name: /join earlier-slot waitlist/i })).toBeVisible()
    await waitlistModal.getByRole('button', { name: /join earlier-slot waitlist/i }).click()
    await waitlistModal.getByRole('button', { name: /^cancel$/i }).click()
    await expect(page.getByText(/earlier-slot waitlist: active/i)).toBeVisible()

    await page.getByRole('button', { name: /mark done/i }).first().click()
    await page.getByPlaceholder(/add any questions or notes/i).fill('Ask about treatment timeline and next legal steps.')
    await page.getByRole('button', { name: /save prep/i }).click()
    await expect(page.getByText(/consultation prep saved/i)).toBeVisible()

    await page.getByRole('button', { name: /leave a verified review/i }).click()
    await page.getByPlaceholder(/short review title/i).fill('Helpful first consult')
    await page.getByPlaceholder(/share how the consultation went/i).fill('The attorney explained next steps clearly and answered my questions.')
    await page.getByRole('button', { name: /submit review/i }).click()
    await expect(page.getByText(/thank you for sharing your review/i)).toBeVisible()

    await page.getByRole('button', { name: /^cancel$/i }).last().click()
    await expect(page.getByRole('heading', { name: /^schedule consultation$/i }).last()).toBeVisible()
  })
})
