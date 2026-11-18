import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(join(__dirname, path), 'utf8')

describe('attorney onboarding route ownership', () => {
  const app = readSource('App.tsx')
  const guestStart = app.indexOf('<Route element={<GuestRoute role="attorney" />}>')
  const guestEnd = app.indexOf('<Route element={<GuestRoute role="admin" />}>', guestStart)
  const protectedStart = app.indexOf('<Route element={<ProtectedRoute role="attorney" />}>')
  const protectedEnd = app.indexOf('<Route path="/respond/documents/:token"', protectedStart)
  const guestRoutes = app.slice(guestStart, guestEnd)
  const protectedRoutes = app.slice(protectedStart, protectedEnd)

  it('keeps license and payment setup out of the attorney guest routes', () => {
    expect(guestRoutes).not.toContain('/attorney-license-upload')
    expect(guestRoutes).not.toContain('/attorney-onboarding/payment')
  })

  it('protects license and payment setup as attorney routes', () => {
    expect(protectedRoutes).toContain('path="/attorney-license-upload"')
    expect(protectedRoutes).toContain('path="/attorney-onboarding/payment"')
  })

  it('keeps payment setup optional', () => {
    const payment = readSource('pages/AttorneyOnboardingPayment.tsx')
    expect(payment).toContain("'Skip for now'")
    expect(payment).not.toContain('disabled={stripeEnabled && !savedCard}')
  })
})

describe('attorney workspace discoverability', () => {
  const workspace = readSource('features/shared/AttorneyWorkspaceLayout.tsx')
  const accountNav = readSource('components/Layout.tsx')

  it('exposes Overview and Analytics in workspace and account navigation', () => {
    expect(workspace).toContain("label: 'Overview'")
    expect(workspace).toContain("label: 'Analytics'")
    expect(accountNav.match(/\/attorney-dashboard\/overview/g)?.length).toBeGreaterThanOrEqual(2)
    expect(accountNav.match(/\/attorney-dashboard\/leadgen\/analytics/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('limits Integrations & Exports workspace navigation to firm admins', () => {
    expect(workspace).toMatch(
      /label: 'Integrations & Exports'[^}\n]*firmAdminOnly: true/,
    )
    expect(accountNav).toContain('{canManageIntegrations &&')
    expect(accountNav.match(/to="\/integrations"/g)).toHaveLength(2)
  })

  it('distinguishes client and platform billing on desktop and mobile', () => {
    expect(workspace).toContain("label: 'Client billing'")
    expect(accountNav.match(/ClearCaseIQ plan &amp; payments/g)).toHaveLength(2)
  })
})

describe('modern case workspace actions', () => {
  const workspace = readSource('features/casework/CaseWorkspacePage.tsx')

  it('mounts attorney prediction review in the Overview content', () => {
    expect(workspace).toContain('<AttorneyPredictionReviewPanel leadId={lead.id} />')
  })

  it('downloads the whole case through the existing ZIP API', () => {
    expect(workspace).toContain('await downloadLeadCaseFile(leadId)')
    expect(workspace).toContain('link.download = `case-file-${leadId}.zip`')
    expect(workspace).toContain("'Download case ZIP'")
  })
})
