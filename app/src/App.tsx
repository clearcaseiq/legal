import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Routes, Route, Navigate, Link, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { GuestRoute, ProtectedRoute } from './components/AuthRoute'
import { getStoredRole, getPostLoginRoute } from './lib/auth'
import {
  clearEvidenceReturnTo,
  plaintiffDashboardReturnTo,
  rememberEvidenceReturnTo,
  safeInternalReturnTo,
} from './lib/evidenceUploadNav'
// Definitions only: importing from `seoTopicHubs` here would pull the full text
// of all 173 landing pages into the chunk that loads on every route.
import { topicHubs } from './data/seoTopicHubDefs'
import { CALCULATOR_VARIANT_SLUGS } from './data/settlementCalculatorVariantSlugs'
import { LANDING_ES_SLUGS } from './data/seoLandingPagesEsSlugs'
import { LANDING_ZH_SLUGS } from './data/seoLandingPagesZhSlugs'
import { ensureAppMessages } from './i18n'

/**
 * Wraps a lazy route so its English strings arrive with its code.
 *
 * The intake, results and plaintiff-dashboard namespaces are loaded separately
 * from the rest of the dictionary (see `ensureAppMessages`), and these are the
 * only routes that read them. Awaiting the dictionary inside the `lazy` loader
 * means the wait is covered by the route's existing Suspense fallback and the
 * component can never render against a half-loaded dictionary. The two requests
 * are issued together, so the added latency is the slower of the two rather
 * than the sum.
 */
function withAppMessages<T>(loader: () => Promise<T>): () => Promise<T> {
  return async () => {
    const [module] = await Promise.all([loader(), ensureAppMessages()])
    return module
  }
}

/*
 * Routes the server renders are declared with `next/dynamic`, not `React.lazy`.
 *
 * `React.lazy` is wrong for these. The server renders the real markup, but on the
 * client the route's chunk has not arrived yet, so hydration hits a boundary it
 * cannot resolve, throws the server HTML away and renders `RouteFallback` in its
 * place — the whole page collapses to a spinner and then comes back. Measured on
 * production that blank lasted ~300ms, took the document from 4209px to the
 * viewport height and back, and cost 0.76 CLS on desktop (the footer is pulled
 * into view and shoved out again) plus seconds of LCP delay, because the largest
 * element cannot reach its final paint until after the restore. Mobile read 0
 * CLS only because its footer sits below the fold.
 *
 * `next/dynamic` fixes it by recording which chunks the server used and loading
 * them before hydration begins, so the boundary never suspends. Static imports
 * would also work but would pull all 149 landing pages' text into the chunk
 * every route pays for, which is what the lazy split existed to prevent.
 *
 * Each call has to be written out in full. Next reads the import path out of the
 * source to know which chunks the server used, so routing the loader through a
 * shared helper loses it: that version compiled, and rendered, but the client
 * put nothing where the server had content and React regenerated the tree.
 *
 * Client-only routes stay on `React.lazy`: nothing server-rendered exists for
 * them to discard, so the fallback is the correct first paint.
 */
const Home = dynamic(() => import('./pages/Home'), { ssr: true })
const Login = lazy(() => import('./pages/Login'))
const AttorneyLogin = lazy(() => import('./pages/AttorneyLogin'))
const StaffLogin = lazy(() => import('./pages/StaffLogin'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
// Reads the `intake.injuryType_*` labels so the practice-area picker matches the
// wording claimants saw during intake.
const AttorneyRegister = lazy(withAppMessages(() => import('./pages/AttorneyRegister')))
const ClaimProfile = lazy(() => import('./pages/ClaimProfile'))
const AttorneyNetwork = dynamic(() => import('./pages/AttorneyNetwork'), { ssr: true })
const AttorneyLicenseUpload = lazy(() => import('./pages/AttorneyLicenseUpload'))
const AttorneyOnboardingPayment = lazy(() => import('./pages/AttorneyOnboardingPayment'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const IntakeWizard = lazy(() => import('./pages/IntakeWizard'))
const IntakeWizardQuick = lazy(withAppMessages(() => import('./pages/IntakeWizardQuick')))
const Results = lazy(withAppMessages(() => import('./pages/Results')))
const Attorneys = dynamic(() => import('./pages/Attorneys'), { ssr: true })
const AttorneysEnhanced = lazy(() => import('./pages/AttorneysEnhanced'))
const FirmProfile = lazy(() => import('./pages/FirmProfile'))
const Firms = lazy(() => import('./pages/Firms'))
const CaseTracker = lazy(() => import('./pages/CaseTracker'))
const Messaging = lazy(() => import('./pages/Messaging'))
const SmartRecommendations = lazy(() => import('./pages/SmartRecommendations'))
// Two-domain attorney workspace (Lead Generation vs Case Management)
const AttorneyWorkspaceLayout = lazy(() => import('./features/shared/AttorneyWorkspaceLayout'))
const NewMatchesPage = lazy(() => import('./features/leadgen/NewMatchesPage'))
const AttorneyAnalyticsPage = lazy(() => import('./features/leadgen/AttorneyAnalyticsPage'))
const AttorneyOverviewPage = lazy(() => import('./features/leadgen/AttorneyOverviewPage'))
const AttorneyProfileSettingsPage = lazy(() => import('./features/casework/AttorneyProfileSettingsPage'))
const IntakePage = lazy(() => import('./features/leadgen/IntakePage'))
const MarketplacePerformancePage = lazy(() => import('./features/leadgen/MarketplacePerformancePage'))
const MatchQualityPage = lazy(() => import('./features/leadgen/MatchQualityPage'))
const ActiveCasesPage = lazy(() => import('./features/casework/ActiveCasesPage'))
const CaseWorkspacePage = lazy(() => import('./features/casework/CaseWorkspacePage'))
const CaseMessagesPage = lazy(() => import('./features/casework/MessagesPage'))
const TeamMessagesPage = lazy(() => import('./features/casework/TeamMessagesPage'))
const ActivityPage = lazy(() => import('./features/casework/ActivityPage'))
const NotificationsPage = lazy(() => import('./features/casework/NotificationsPage'))
const SchedulingSettingsPage = lazy(() => import('./features/casework/SchedulingSettingsPage'))
const PublicBookingPage = lazy(() => import('./features/public/PublicBookingPage'))
const BookingManagePage = lazy(() => import('./features/public/BookingManagePage'))
const CaseDocumentsHubPage = lazy(() => import('./features/casework/DocumentsPage'))
const CaseTasksPage = lazy(() => import('./features/casework/TasksPage'))
const CaseDeadlinesPage = lazy(() => import('./features/casework/DeadlinesPage'))
const CaseContactsPage = lazy(() => import('./features/casework/ContactsPage'))
const CaseBillingPage = lazy(() => import('./features/casework/BillingPage'))
const CaseCopilotPage = lazy(() => import('./features/casework/CopilotPage'))
const AiCaseManagerPage = lazy(() => import('./features/casework/AiCaseManagerPage'))
const AddContactPage = lazy(() => import('./pages/AddContactPage'))
const TimeEntryPage = lazy(() => import('./pages/TimeEntryPage'))
const AddTaskPage = lazy(() => import('./pages/AddTaskPage'))
const AddNotePage = lazy(() => import('./pages/AddNotePage'))
const AddExpensePage = lazy(() => import('./pages/AddExpensePage'))
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'))
const ScheduleConsultPage = lazy(() => import('./pages/ScheduleConsultPage'))
const DocumentRequestPage = lazy(() => import('./pages/DocumentRequestPage'))
const DraftMessagePage = lazy(() => import('./pages/DraftMessagePage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const FirmDashboard = lazy(() => import('./pages/FirmDashboard'))
const FirmSettings = lazy(() => import('./pages/FirmSettings'))
const AttorneyBilling = lazy(() => import('./pages/AttorneyBilling'))
const AttorneyProfile = lazy(() => import('./pages/AttorneyProfile'))
const Integrations = lazy(() => import('./pages/Integrations'))
const MedicalProviders = lazy(() => import('./pages/MedicalProviders'))
// The standalone Evidence Upload page is retired in favor of the richer intake
// "Supporting Documents" experience (readiness scoring, wrong-file & name-mismatch
// checks, HIPAA gate). Every /evidence-upload/:id link now forwards there.
function EvidenceUploadRedirect() {
  const { assessmentId } = useParams()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const token = searchParams.get('token')
  const returnTo = safeInternalReturnTo(searchParams.get('returnTo'), '')
  if (!assessmentId) return <Navigate to="/assess" replace />

  // Attorney-sent document-request emails use ?token=…. Land on Tasks, where
  // attorney document requests are listed (Requested Documents tab was folded in).
  if (token) {
    const qs = new URLSearchParams({
      case: assessmentId,
      tab: 'tasks',
      token,
    })
    return <Navigate to={`/dashboard?${qs.toString()}`} replace />
  }

  // Persist return target across the replace navigation into /intake2. Prefer an
  // explicit returnTo (e.g. dashboard?tab=tasks) over the generic case link.
  if (returnTo) {
    rememberEvidenceReturnTo(returnTo)
  } else if (from === 'dashboard') {
    rememberEvidenceReturnTo(plaintiffDashboardReturnTo(assessmentId))
  } else {
    clearEvidenceReturnTo()
  }

  const qs = new URLSearchParams({ assessment: assessmentId, step: 'evidence' })
  if (from) qs.set('from', from)
  if (returnTo) qs.set('returnTo', returnTo)
  const focus = searchParams.get('focus')
  if (focus) qs.set('focus', focus)
  const requestId = searchParams.get('requestId')
  if (requestId) qs.set('requestId', requestId)
  return <Navigate to={`/intake2?${qs.toString()}`} replace />
}
// The standalone per-case documents page is retired in favor of the case file's
// Evidence tab inside the workspace shell. Old /attorney-dashboard/documents/:leadId
// links now forward there.
function AttorneyCaseDocumentsRedirect() {
  const { leadId } = useParams()
  return (
    <Navigate
      to={leadId ? `/attorney-dashboard/cases/${leadId}/evidence` : '/attorney-dashboard/cases/active'}
      replace
    />
  )
}
const DocumentPortal = lazy(() => import('./pages/DocumentPortal'))
const EvidenceDashboard = lazy(() => import('./pages/EvidenceDashboard'))
const Demand = lazy(() => import('./pages/Demand'))
const Drafts = lazy(() => import('./pages/Drafts'))
const Dashboard = lazy(withAppMessages(() => import('./pages/Dashboard')))
const Assessments = lazy(() => import('./pages/Assessments'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const ComplianceAdmin = lazy(() => import('./pages/ComplianceAdmin'))
const AdminUserRoles = lazy(() => import('./pages/AdminUserRoles'))
const AdminFeatureToggles = lazy(() => import('./pages/AdminFeatureToggles'))
const AdminFirmSettings = lazy(() => import('./pages/AdminFirmSettings'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const AdminOpsInbox = lazy(() => import('./pages/admin/AdminOpsInbox'))
const AdminCases = lazy(() => import('./pages/admin/AdminCases'))
const AdminCaseDetail = lazy(() => import('./pages/admin/AdminCaseDetail'))
const AdminRoutingQueue = lazy(() => import('./pages/admin/AdminRoutingQueue'))
const AdminCaseFlow = lazy(() => import('./pages/admin/AdminCaseFlow'))
const AdminAttorneys = lazy(() => import('./pages/admin/AdminAttorneys'))
const AdminCaseResults = lazy(() => import('./pages/admin/AdminCaseResults'))
const AdminAttorneyDetail = lazy(() => import('./pages/admin/AdminAttorneyDetail'))
const AdminMatchingRules = lazy(() => import('./pages/admin/AdminMatchingRules'))
const AdminHeuristics = lazy(() => import('./pages/admin/AdminHeuristics'))
const AdminFieldMappings = lazy(() => import('./pages/admin/AdminFieldMappings'))
const AdminManualReview = lazy(() => import('./pages/admin/AdminManualReview'))
const AdminRoutingFeedback = lazy(() => import('./pages/admin/AdminRoutingFeedback'))
const AdminCommunications = lazy(() => import('./pages/admin/AdminCommunications'))
const AdminDocuments = lazy(() => import('./pages/admin/AdminDocuments'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'))
const AdminSystemStatus = lazy(() => import('./pages/admin/AdminSystemStatus'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const About = dynamic(() => import('./pages/About'), { ssr: true })
const PressPage = dynamic(() => import('./pages/PressPage'), { ssr: true })
const InsightsPage = dynamic(() => import('./pages/InsightsPage'), { ssr: true })
const PartnerBadgePage = dynamic(() => import('./pages/PartnerBadgePage'), { ssr: true })
const CaliforniaSolChecker = dynamic(() => import('./pages/CaliforniaSolChecker'), { ssr: true })
const MedicalRecordsChecklistTool = dynamic(
  () => import('./pages/MedicalRecordsChecklistTool'),
  { ssr: true }
)
const SettlementCalculator = dynamic(() => import('./pages/SettlementCalculator'), { ssr: true })
const CompleteConsent = lazy(() => import('./pages/CompleteConsent'))
const ConsentManagement = lazy(() => import('./pages/ConsentManagement'))
const TestConsent = lazy(() => import('./pages/TestConsent'))
const AuthDebug = lazy(() => import('./pages/AuthDebug'))
const TermsOfService = dynamic(() => import('./pages/TermsOfService'), { ssr: true })
const PrivacyPolicy = dynamic(() => import('./pages/PrivacyPolicy'), { ssr: true })
const Disclosures = dynamic(() => import('./pages/Disclosures'), { ssr: true })
const EditorialStandards = dynamic(() => import('./pages/EditorialStandards'), { ssr: true })
const Help = dynamic(() => import('./pages/Help'), { ssr: true })
const Contact = dynamic(() => import('./pages/Contact'), { ssr: true })
const HowItWorks = dynamic(() => import('./pages/HowItWorks'), { ssr: true })
const AiMlConsent = lazy(() => import('./pages/AiMlConsent'))
const RoseIntake = lazy(() => import('./pages/RoseIntake'))
const HipaaAuthorization = lazy(() => import('./pages/HipaaAuthorization'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'))
const SeoLandingPage = dynamic(() => import('./pages/SeoLandingPage'), { ssr: true })
const SeoLandingPageEs = dynamic(() => import('./pages/SeoLandingPageEs'), { ssr: true })
const TopicsEs = dynamic(() => import('./pages/TopicsEs'), { ssr: true })
const SeoLandingPageZh = dynamic(() => import('./pages/SeoLandingPageZh'), { ssr: true })
const TopicsZh = dynamic(() => import('./pages/TopicsZh'), { ssr: true })
const TopicHub = dynamic(() => import('./pages/TopicHub'), { ssr: true })

const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <span>Loading page...</span>
      </div>
    </div>
  )
}

// Attorneys landing on /attorney-dashboard should see the new two-domain
// workspace by default. The legacy AttorneyDashboard monolith is retired:
// every ?tab= deep link now forwards to the first-class route that owns that
// surface. Unknown tabs fall back to the default landing.
const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  leads: '/attorney-dashboard/leadgen/matches',
  intake: '/attorney-dashboard/cases/intake',
  analytics: '/attorney-dashboard/leadgen/analytics',
  overview: '/attorney-dashboard/overview',
  profile: '/attorney-dashboard/settings/profile',
}

function AttorneyDashboardEntry() {
  const location = useLocation()
  const tab = new URLSearchParams(location.search).get('tab')
  const target = (tab && LEGACY_TAB_REDIRECTS[tab]) || '/attorney-dashboard/leadgen/matches'
  return <Navigate to={target} replace />
}

// The marketing home page (and its "Start Free Case Assessment" CTA) is a
// plaintiff/guest surface. Signed-in attorneys, firm staff, and admins have no
// business creating claimant cases, so clicking the logo (which points at "/")
// should return them to their own workspace instead of the claimant funnel
// (CP-571). Guests and plaintiffs continue to see the marketing home.
function HomeRoute() {
  const role = getStoredRole()
  if (role === 'attorney' || role === 'admin' || role === 'staff') {
    return <Navigate to={getPostLoginRoute(role)} replace />
  }
  return <Home />
}

// Lightweight landing for the Zoom OAuth redirect. When opened as a popup (the
// Schedule Consultation "Connect Zoom" flow) it notifies the opener and closes
// itself; otherwise it forwards to the dashboard so the settings-card connect
// flow behaves exactly as before.
function ZoomOAuthComplete() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = params.get('zoom_sync') || 'error'
  const error = params.get('zoom_error') || undefined

  useEffect(() => {
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({ type: 'zoom_oauth', status, error }, window.location.origin)
      } catch {
        /* ignore cross-origin edge cases */
      }
      window.close()
      return
    }
    const to = new URLSearchParams()
    to.set('zoom_sync', status)
    if (error) to.set('zoom_error', error)
    navigate(`/attorney-dashboard?${to.toString()}`, { replace: true })
  }, [status, error, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center text-sm text-gray-600">
      {status === 'success'
        ? 'Zoom connected. You can close this window.'
        : 'Zoom connection failed. You can close this window and try again.'}
    </div>
  )
}

function ResultsRouteBoundary() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const location = useLocation()
  const normalizedAssessmentId =
    assessmentId && assessmentId !== 'undefined' && assessmentId !== 'null'
      ? assessmentId
      : null

  return (
    <ErrorBoundary
      key={normalizedAssessmentId || location.pathname}
      name="Results route"
      context={{
        route: '/results/:assessmentId',
        assessmentId: normalizedAssessmentId,
        pathname: location.pathname,
      }}
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <h2 className="text-lg font-semibold">We hit a problem loading this case report</h2>
            <p className="mt-2 text-sm">
              The report data may be incomplete or temporarily unavailable. Try refreshing this page or return to start a new assessment.
            </p>
            {normalizedAssessmentId && (
              <p className="mt-2 text-xs text-amber-800/80">Reference: {normalizedAssessmentId}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Refresh page
              </button>
              <Link
                to="/assess"
                className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Start new assessment
              </Link>
            </div>
          </div>
        </div>
      }
    >
      <Results />
    </ErrorBoundary>
  )
}

// Route-scoped boundary that lives inside <Layout> so a render crash on one
// page shows an inline, recoverable error (with the nav still usable) instead
// of blanking the whole app. Resetting on pathname change lets the user simply
// navigate away from a broken page.
function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <ErrorBoundary name="Route" resetKey={location.pathname}>
      {children}
    </ErrorBoundary>
  )
}

function App() {
  const allowLocalDevRoutes =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  return (
    <ErrorBoundary>
      <Layout>
        <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/oauth/zoom/complete" element={<ZoomOAuthComplete />} />
            {/* Public so a reset link works even if the user happens to be logged in. */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route element={<GuestRoute role="plaintiff" />}>
              <Route path="/login" element={<Login />} />
              <Route path="/login/plaintiff" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            <Route element={<GuestRoute role="attorney" />}>
              <Route path="/attorney-login" element={<AttorneyLogin />} />
              <Route path="/login/attorney" element={<AttorneyLogin />} />
              <Route path="/attorney-register" element={<AttorneyRegister />} />
              <Route path="/attorney-license-upload" element={<AttorneyLicenseUpload />} />
              <Route path="/attorney-onboarding/payment" element={<AttorneyOnboardingPayment />} />
            </Route>
            <Route element={<GuestRoute role="admin" />}>
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/login/admin" element={<AdminLogin />} />
            </Route>
            <Route element={<GuestRoute role="staff" />}>
              <Route path="/staff-login" element={<StaffLogin />} />
              <Route path="/login/staff" element={<StaffLogin />} />
            </Route>
            <Route element={<ProtectedRoute role="plaintiff" />}>
              <Route path="/auth/complete-consent" element={<CompleteConsent />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/consent-management" element={<ConsentManagement />} />
              <Route path="/case-tracker" element={<CaseTracker />} />
              {/* /ai-copilot and its `/v1/ai-copilot` router were removed. The page
                  answered legal questions with canned prose citing a "State Bar Legal
                  Database" that does not exist, reported statute-of-limitations
                  deadlines from a three-state table that silently fell back to
                  California for every other jurisdiction, and returned fixed
                  diagnoses, adjusters and coverage limits for uploaded documents
                  whose contents it never read. The attorney-side "AI Copilot" tab in
                  the case workspace is a separate feature and is unaffected. */}
              {/* /financing is unrouted until there are signed funding partner
                  agreements. The page listed named lenders (Oasis Financial,
                  Law Cash) and lien-based clinics with interest rates, approval
                  rates and ratings that were invented placeholders, which is not
                  something to show injury claimants. Restore the route once
                  /v1/financing/partners returns real partners. */}
              <Route path="/messaging" element={<Messaging />} />
              {/* /recovery-hub and its `/v1/recovery-hub` router were removed. No
                  recovery tables were ever added to the schema, so none of the seven
                  endpoints touched the database: the dashboard reported a fixed 68%
                  recovery figure and named providers who do not exist, pain trends
                  were 27 hardcoded values, and the entry and goal endpoints returned
                  201 "added successfully" while discarding the claimant's submission.
                  Rebuilding this needs RecoveryEntry/RecoveryGoal models first. */}
              <Route path="/smart-recommendations/:assessmentId" element={<SmartRecommendations />} />
            </Route>
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="ops-inbox" element={<AdminOpsInbox />} />
                <Route path="cases" element={<AdminCases />} />
                <Route path="cases/:id" element={<AdminCaseDetail />} />
                <Route path="routing-queue" element={<AdminRoutingQueue />} />
                <Route path="case-flow" element={<AdminCaseFlow />} />
                <Route path="attorneys" element={<AdminAttorneys />} />
                <Route path="case-results" element={<AdminCaseResults />} />
                <Route path="attorneys/:id" element={<AdminAttorneyDetail />} />
                <Route path="matching-rules" element={<AdminMatchingRules />} />
                <Route path="heuristics" element={<AdminHeuristics />} />
                <Route path="field-mappings" element={<AdminFieldMappings />} />
                <Route path="manual-review" element={<AdminManualReview />} />
                <Route path="routing-feedback" element={<AdminRoutingFeedback />} />
                <Route path="communications" element={<AdminCommunications />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="system-status" element={<AdminSystemStatus />} />
                <Route path="compliance" element={<ComplianceAdmin />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="users" element={<AdminUserRoles />} />
                <Route path="feature-toggles" element={<AdminFeatureToggles />} />
                <Route path="firm-settings" element={<AdminFirmSettings />} />
              </Route>
            </Route>
            {allowLocalDevRoutes && (
              <>
                <Route path="/test-consent" element={<TestConsent />} />
                <Route path="/auth-debug" element={<AuthDebug />} />
              </>
            )}
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/disclosures" element={<Disclosures />} />
            <Route path="/editorial-standards" element={<EditorialStandards />} />
            <Route path="/about" element={<About />} />
            <Route path="/press" element={<PressPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/partners/badge" element={<PartnerBadgePage />} />
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />
            {/* Topic index and per-category hubs: the route into the SEO landing
                pages. Hubs are enumerated rather than matched with a :param so an
                invented /topics/anything still 404s instead of answering 200. */}
            <Route path="/topics" element={<TopicHub />} />
            {topicHubs.map((hub) => (
              <Route key={hub.slug} path={hub.slug} element={<TopicHub />} />
            ))}
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/attorney-network" element={<AttorneyNetwork />} />
            {/* Spanish editions. Enumerated beside their English twins rather than
                generated from the registry, so the route table stays greppable and
                an invented /es/* still 404s. `marketingPagesEs.test.ts` fails if a
                registry entry has no route here, or a route no entry. */}
            <Route path="/es" element={<HomeRoute />} />
            <Route path="/es/como-funciona" element={<HowItWorks />} />
            <Route path="/es/quienes-somos" element={<About />} />
            <Route path="/es/contacto" element={<Contact />} />
            <Route path="/es/centro-de-ayuda" element={<Help />} />
            <Route path="/es/divulgaciones" element={<Disclosures />} />
            <Route path="/es/red-de-abogados" element={<AttorneyNetwork />} />
            {/* The Spanish landing pages and their hub. Separate template from the
                English pages: see the note in SeoLandingPageEs. */}
            <Route path="/es/temas" element={<TopicsEs />} />
            {LANDING_ES_SLUGS.map((slug) => (
              <Route key={slug} path={slug} element={<SeoLandingPageEs />} />
            ))}
            {/* Simplified Chinese editions, reusing the same components: their
                bodies are the translated chrome in zh.json, so no separate
                template is needed the way the Spanish landing pages needed one.
                Pinyin slugs rather than Chinese characters, which would be
                correct but arrive percent-encoded in logs and analytics. */}
            <Route path="/zh" element={<HomeRoute />} />
            <Route path="/zh/ruhe-yunzuo" element={<HowItWorks />} />
            <Route path="/zh/guanyu-women" element={<About />} />
            <Route path="/zh/lianxi-women" element={<Contact />} />
            <Route path="/zh/bangzhu-zhongxin" element={<Help />} />
            <Route path="/zh/pilu-shengming" element={<Disclosures />} />
            <Route path="/zh/lvshi-wangluo" element={<AttorneyNetwork />} />
            {/* The Chinese landing pages and their hub. A written template like the
                Spanish one, because the English template falls back to English prose
                the same way. See SeoLandingPageZh. */}
            <Route path="/zh/zhuti" element={<TopicsZh />} />
            {LANDING_ZH_SLUGS.map((slug) => (
              <Route key={slug} path={slug} element={<SeoLandingPageZh />} />
            ))}
            {/* Consolidated: the old marketing page now points at the single attorney landing page. */}
            <Route path="/for-attorneys" element={<Navigate to="/attorney-network" replace />} />
            <Route path="/claim/:token" element={<ClaimProfile />} />
            <Route path="/assessment/start" element={<Navigate to="/assess?fresh=1" replace />} />
            <Route path="/ai-ml-consent" element={<AiMlConsent />} />
            <Route path="/hipaa-authorization" element={<HipaaAuthorization />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            {/* Interactive public tools — must be registered before /tools/:slug SEO catch-all. */}
            <Route path="/tools/california-sol-checker" element={<CaliforniaSolChecker />} />
            <Route path="/tools/medical-records-checklist" element={<MedicalRecordsChecklistTool />} />
            <Route path="/tools/settlement-calculator" element={<SettlementCalculator />} />
            {/* Per-injury variants of the same calculator. Enumerated so an
                invented /tools/*-calculator still 404s. */}
            {CALCULATOR_VARIANT_SLUGS.map((slug) => (
              <Route key={slug} path={slug} element={<SettlementCalculator />} />
            ))}
            <Route path="/injuries/:slug" element={<SeoLandingPage />} />
            <Route path="/treatment/:slug" element={<SeoLandingPage />} />
            <Route path="/tools/:slug" element={<SeoLandingPage />} />
            <Route path="/settlements/:slug" element={<SeoLandingPage />} />
            <Route path="/insurance/:slug" element={<SeoLandingPage />} />
            <Route path="/liability/:slug" element={<SeoLandingPage />} />
            <Route path="/commercial/:slug" element={<SeoLandingPage />} />
            <Route path="/legal/:slug" element={<SeoLandingPage />} />
            <Route path="/education/:slug" element={<SeoLandingPage />} />
            <Route path="/case-strength" element={<SeoLandingPage />} />
            <Route path="/los-angeles-car-accident" element={<SeoLandingPage />} />
            <Route path="/orange-county-car-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-car-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-car-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-car-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-car-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-car-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-car-accident" element={<SeoLandingPage />} />
            <Route path="/irvine-car-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-car-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-car-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-car-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-car-accident" element={<SeoLandingPage />} />
            <Route path="/how-much-is-my-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-car-accident-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-whiplash-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-herniated-disc-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-tbi-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-back-surgery-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-motorcycle-accident-case-worth" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-pedestrian-accident-case-worth" element={<SeoLandingPage />} />
            {/* The six `/average-*-settlement-california` pages were retired into
                the case-worth guide for the same injury: "average settlement for
                X" and "how much is an X case worth" are one question asked twice,
                and answering it on two thin pages split both. No route here —
                they 301 in next.config.mjs before the app renders, and no
                internal link points at them. */}
            <Route path="/when-to-hire-a-lawyer-after-accident" element={<SeoLandingPage />} />
            <Route path="/how-much-do-personal-injury-lawyers-charge" element={<SeoLandingPage />} />
            <Route path="/can-i-switch-lawyers-during-my-case" element={<SeoLandingPage />} />
            <Route path="/california-statute-of-limitations-personal-injury" element={<SeoLandingPage />} />
            <Route path="/california-statute-of-limitations-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/missed-the-statute-of-limitations" element={<SeoLandingPage />} />
            {/* Dog-bite hub — first dedicated practice-area cluster (CP-678). */}
            <Route path="/how-much-is-a-dog-bite-case-worth" element={<SeoLandingPage />} />
            <Route path="/who-is-liable-for-a-dog-bite-in-california" element={<SeoLandingPage />} />
            <Route path="/california-dog-bite-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/when-to-hire-a-dog-bite-lawyer-in-california" element={<SeoLandingPage />} />
            {/* Slip-and-fall / premises-liability hub. */}
            <Route path="/how-much-is-a-slip-and-fall-case-worth" element={<SeoLandingPage />} />
            <Route path="/who-is-liable-for-a-slip-and-fall-in-california" element={<SeoLandingPage />} />
            <Route path="/california-slip-and-fall-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-slip-and-fall-in-california" element={<SeoLandingPage />} />
            {/* Product-liability (defective product) hub. */}
            <Route path="/how-much-is-a-defective-product-case-worth" element={<SeoLandingPage />} />
            <Route path="/who-is-liable-for-a-defective-product-in-california" element={<SeoLandingPage />} />
            <Route path="/california-product-liability-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-defective-product-claim-in-california" element={<SeoLandingPage />} />
            {/* Wrongful-death spokes (SOL page already registered above). */}
            <Route path="/how-much-is-a-wrongful-death-case-worth-in-california" element={<SeoLandingPage />} />
            <Route path="/who-can-file-a-wrongful-death-claim-in-california" element={<SeoLandingPage />} />
            {/* Rideshare spokes (coverage page lives at /insurance/rideshare-commercial-coverage). */}
            <Route path="/how-much-is-an-uber-or-lyft-accident-case-worth" element={<SeoLandingPage />} />
            <Route path="/california-rideshare-accident-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-an-uber-or-lyft-accident-in-california" element={<SeoLandingPage />} />
            {/* Bicycle hub. */}
            <Route path="/how-much-is-a-bicycle-accident-case-worth" element={<SeoLandingPage />} />
            <Route path="/who-is-at-fault-in-a-bicycle-accident-in-california" element={<SeoLandingPage />} />
            <Route path="/california-bicycle-accident-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-bicycle-accident-in-california" element={<SeoLandingPage />} />
            {/* Pedestrian spokes (value page already registered above). */}
            <Route path="/who-is-at-fault-in-a-pedestrian-accident-in-california" element={<SeoLandingPage />} />
            <Route path="/california-pedestrian-accident-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-pedestrian-accident-in-california" element={<SeoLandingPage />} />
            {/* Motorcycle spokes (value page already registered above). */}
            <Route path="/who-is-at-fault-in-a-motorcycle-accident-in-california" element={<SeoLandingPage />} />
            <Route path="/california-motorcycle-accident-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-motorcycle-accident-in-california" element={<SeoLandingPage />} />
            {/* Nursing home / elder abuse hub — legally distinct (Elder Abuse Act). */}
            <Route path="/how-much-is-a-nursing-home-abuse-case-worth-in-california" element={<SeoLandingPage />} />
            <Route path="/who-is-liable-for-nursing-home-abuse-in-california" element={<SeoLandingPage />} />
            <Route path="/california-nursing-home-abuse-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-nursing-home-abuse-in-california" element={<SeoLandingPage />} />
            {/* Truck accident hub — expands the thin /commercial/truck-accident-settlement page. */}
            <Route path="/how-much-is-a-truck-accident-case-worth-in-california" element={<SeoLandingPage />} />
            <Route path="/who-is-liable-for-a-truck-accident-in-california" element={<SeoLandingPage />} />
            <Route path="/truck-accident-evidence-and-statute-of-limitations-california" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-truck-accident-in-california" element={<SeoLandingPage />} />
            {/* Medical malpractice hub — MICRA-accurate. */}
            <Route path="/do-i-have-a-medical-malpractice-case-in-california" element={<SeoLandingPage />} />
            <Route path="/how-much-is-a-medical-malpractice-case-worth-in-california" element={<SeoLandingPage />} />
            <Route path="/how-to-prove-medical-malpractice-in-california" element={<SeoLandingPage />} />
            <Route path="/california-medical-malpractice-statute-of-limitations" element={<SeoLandingPage />} />
            {/* Third-party work-injury hub — scoped to non-employer liability (not workers' comp). */}
            <Route path="/can-i-sue-a-third-party-for-a-work-injury-in-california" element={<SeoLandingPage />} />
            <Route path="/workers-comp-vs-third-party-claim-in-california" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-for-a-third-party-work-injury-in-california" element={<SeoLandingPage />} />
            {/* Geo layer: practice x city — pedestrian & bicycle across top metros. */}
            <Route path="/los-angeles-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/los-angeles-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-bicycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 2: San Jose, Sacramento, Oakland. */}
            <Route path="/san-jose-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-bicycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 3: Fresno, Long Beach, Bakersfield, Anaheim. */}
            <Route path="/fresno-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-bicycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 4: motorcycle x top metros. */}
            <Route path="/los-angeles-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-motorcycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 5: rideshare x top metros. */}
            <Route path="/los-angeles-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-rideshare-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 6: Riverside, Stockton, Santa Ana, Irvine. */}
            <Route path="/riverside-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/stockton-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/santa-ana-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/irvine-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/stockton-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/santa-ana-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/irvine-bicycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 7: dog-bite x top metros. */}
            <Route path="/los-angeles-dog-bite" element={<SeoLandingPage />} />
            <Route path="/san-francisco-dog-bite" element={<SeoLandingPage />} />
            <Route path="/san-diego-dog-bite" element={<SeoLandingPage />} />
            <Route path="/sacramento-dog-bite" element={<SeoLandingPage />} />
            {/* Geo layer batch 8: slip-and-fall x top metros. */}
            <Route path="/los-angeles-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/san-francisco-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/san-diego-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/sacramento-slip-and-fall" element={<SeoLandingPage />} />
            {/* Geo layer batch 9: truck accident x freight corridors. */}
            <Route path="/riverside-truck-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-truck-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-truck-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-truck-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 10: motorcycle x remaining metros. */}
            <Route path="/long-beach-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-motorcycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 11: rideshare x remaining metros. */}
            <Route path="/san-jose-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-rideshare-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 12: bus/transit x transit-heavy metros. */}
            <Route path="/los-angeles-bus-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-muni-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-trolley-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-light-rail-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 13: e-scooter x micromobility metros. */}
            <Route path="/los-angeles-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-scooter-accident" element={<SeoLandingPage />} />
            {/* Niche wave 5 batch 2: scooter x San Jose, Sacramento, Oakland, Santa Monica. */}
            <Route path="/san-jose-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/santa-monica-scooter-accident" element={<SeoLandingPage />} />
            {/* Niche wave 5 batch 3: scooter to 12-metro standard (Fresno, Riverside, San Bernardino, Bakersfield, Anaheim). */}
            <Route path="/fresno-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-scooter-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-scooter-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 14: construction (third-party) x build-heavy metros. */}
            <Route path="/los-angeles-construction-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-construction-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-construction-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-construction-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-construction-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-construction-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-construction-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-construction-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-construction-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-construction-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-construction-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-construction-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 15: negligent security x metros. */}
            <Route path="/los-angeles-negligent-security" element={<SeoLandingPage />} />
            <Route path="/oakland-negligent-security" element={<SeoLandingPage />} />
            <Route path="/san-francisco-negligent-security" element={<SeoLandingPage />} />
            <Route path="/san-diego-negligent-security" element={<SeoLandingPage />} />
            <Route path="/sacramento-negligent-security" element={<SeoLandingPage />} />
            <Route path="/san-jose-negligent-security" element={<SeoLandingPage />} />
            <Route path="/fresno-negligent-security" element={<SeoLandingPage />} />
            <Route path="/long-beach-negligent-security" element={<SeoLandingPage />} />
            <Route path="/riverside-negligent-security" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-negligent-security" element={<SeoLandingPage />} />
            <Route path="/bakersfield-negligent-security" element={<SeoLandingPage />} />
            <Route path="/anaheim-negligent-security" element={<SeoLandingPage />} />
            {/* Geo layer batch 16: boating/watercraft x water metros. */}
            <Route path="/san-diego-boating-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-delta-boating-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-boating-accident" element={<SeoLandingPage />} />
            <Route path="/newport-beach-boating-accident" element={<SeoLandingPage />} />
            {/* Niche wave 6 batch 2: boating x Lake Tahoe, SF Bay, Shasta Lake, Marina del Rey. */}
            <Route path="/lake-tahoe-boating-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-bay-boating-accident" element={<SeoLandingPage />} />
            <Route path="/shasta-lake-boating-accident" element={<SeoLandingPage />} />
            <Route path="/marina-del-rey-boating-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 17: burn injury x metros. */}
            <Route path="/los-angeles-burn-injury" element={<SeoLandingPage />} />
            <Route path="/san-francisco-burn-injury" element={<SeoLandingPage />} />
            <Route path="/san-diego-burn-injury" element={<SeoLandingPage />} />
            <Route path="/sacramento-burn-injury" element={<SeoLandingPage />} />
            <Route path="/san-jose-burn-injury" element={<SeoLandingPage />} />
            <Route path="/fresno-burn-injury" element={<SeoLandingPage />} />
            <Route path="/long-beach-burn-injury" element={<SeoLandingPage />} />
            <Route path="/oakland-burn-injury" element={<SeoLandingPage />} />
            <Route path="/riverside-burn-injury" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-burn-injury" element={<SeoLandingPage />} />
            <Route path="/bakersfield-burn-injury" element={<SeoLandingPage />} />
            <Route path="/anaheim-burn-injury" element={<SeoLandingPage />} />
            {/* Geo layer batch 18: wrongful death x metros. */}
            <Route path="/los-angeles-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/san-francisco-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/san-diego-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/sacramento-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/san-jose-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/fresno-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/long-beach-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/oakland-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/riverside-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/bakersfield-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/anaheim-wrongful-death" element={<SeoLandingPage />} />
            {/* Geo layer batch 19: DUI victim x metros. */}
            <Route path="/los-angeles-dui-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-dui-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-dui-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-dui-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-dui-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-dui-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-dui-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-dui-accident" element={<SeoLandingPage />} />
            {/* Geo layer mid-tier batch 3: DUI-victim x SF, SB, Bakersfield, Anaheim. */}
            <Route path="/san-francisco-dui-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-dui-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-dui-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-dui-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 20: theme park / amusement ride injury x metros. */}
            <Route path="/anaheim-theme-park-injury" element={<SeoLandingPage />} />
            <Route path="/los-angeles-theme-park-injury" element={<SeoLandingPage />} />
            <Route path="/san-diego-theme-park-injury" element={<SeoLandingPage />} />
            <Route path="/santa-clara-theme-park-injury" element={<SeoLandingPage />} />
            {/* Geo layer batch 21: pool / drowning injury x hot inland metros. */}
            <Route path="/sacramento-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/fresno-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/bakersfield-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/riverside-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/los-angeles-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/san-diego-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/san-jose-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/long-beach-pool-drowning-injury" element={<SeoLandingPage />} />
            {/* Geo layer mid-tier batch 3: pool/drowning x SF, Oakland, SB, Anaheim. */}
            <Route path="/san-francisco-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/oakland-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-pool-drowning-injury" element={<SeoLandingPage />} />
            <Route path="/anaheim-pool-drowning-injury" element={<SeoLandingPage />} />
            {/* Geo layer batch 22: delivery-van / gig-delivery accident x metros. */}
            <Route path="/los-angeles-delivery-truck-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-delivery-truck-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-delivery-truck-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-delivery-truck-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 23: uninsured / hit-and-run motorist x high-uninsured metros. */}
            <Route path="/los-angeles-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-uninsured-motorist-accident" element={<SeoLandingPage />} />
            {/* Geo layer mid-tier batch 3: uninsured motorist x SF, Riverside, LB, Anaheim. */}
            <Route path="/san-francisco-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-uninsured-motorist-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-uninsured-motorist-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 24: food poisoning / foodborne illness x metros. */}
            <Route path="/los-angeles-food-poisoning" element={<SeoLandingPage />} />
            <Route path="/san-francisco-food-poisoning" element={<SeoLandingPage />} />
            <Route path="/san-diego-food-poisoning" element={<SeoLandingPage />} />
            <Route path="/fresno-food-poisoning" element={<SeoLandingPage />} />
            {/* Geo layer batch 25: wildfire / utility-caused fire x fire-prone regions. */}
            <Route path="/los-angeles-wildfire-claim" element={<SeoLandingPage />} />
            <Route path="/santa-rosa-wildfire-claim" element={<SeoLandingPage />} />
            <Route path="/chico-paradise-wildfire-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-wildfire-claim" element={<SeoLandingPage />} />
            {/* Niche wave 6B batch 2: wildfire x Redding, Napa, San Bernardino, Ventura. */}
            <Route path="/redding-wildfire-claim" element={<SeoLandingPage />} />
            <Route path="/napa-wildfire-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-wildfire-claim" element={<SeoLandingPage />} />
            <Route path="/ventura-wildfire-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 26: dangerous roadway / public property x metros. */}
            <Route path="/los-angeles-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-dangerous-road-accident" element={<SeoLandingPage />} />
            {/* Geo layer mid-tier batch 3: dangerous roadway x SF, SB, LB, Anaheim. */}
            <Route path="/san-francisco-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-dangerous-road-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-dangerous-road-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 27: nursing home / elder abuse x metros. */}
            <Route path="/los-angeles-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/santa-ana-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            {/* Geo layer mid-tier batch 3: elder abuse x SF, Oakland, SB, Bakersfield. */}
            <Route path="/san-francisco-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-nursing-home-abuse-claim" element={<SeoLandingPage />} />
            <Route path="/los-angeles-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/santa-ana-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/stockton-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/modesto-medical-malpractice-claim" element={<SeoLandingPage />} />
            <Route path="/chula-vista-medical-malpractice-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 28: apartment / landlord premises injury x metros. */}
            <Route path="/los-angeles-apartment-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-apartment-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-apartment-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-apartment-injury-claim" element={<SeoLandingPage />} />
            {/* Niche hub 4->8: apartment injury x SD, SJ, Fresno, Riverside. */}
            <Route path="/san-diego-apartment-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-apartment-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-apartment-injury-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-apartment-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 29: train / railroad & grade-crossing x metros. */}
            <Route path="/los-angeles-train-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-train-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-train-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-train-accident" element={<SeoLandingPage />} />
            {/* Niche wave 6 batch 2: train x Oakland, Anaheim, Fresno, Riverside. */}
            <Route path="/oakland-train-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-train-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-train-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-train-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 30: warehouse / logistics third-party injury x metros. */}
            <Route path="/riverside-warehouse-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-warehouse-injury-claim" element={<SeoLandingPage />} />
            <Route path="/stockton-warehouse-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-warehouse-injury-claim" element={<SeoLandingPage />} />
            {/* Niche hub 4->8: warehouse injury x Ontario, Fontana, Bakersfield, Tracy. */}
            <Route path="/ontario-warehouse-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fontana-warehouse-injury-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-warehouse-injury-claim" element={<SeoLandingPage />} />
            <Route path="/tracy-warehouse-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 31: agricultural / farm equipment injury x metros. */}
            <Route path="/fresno-farm-injury-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-farm-injury-claim" element={<SeoLandingPage />} />
            <Route path="/salinas-farm-injury-claim" element={<SeoLandingPage />} />
            <Route path="/modesto-farm-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 6B batch 2: farm injury x Stockton, Visalia, Merced, Oxnard. */}
            <Route path="/stockton-farm-injury-claim" element={<SeoLandingPage />} />
            <Route path="/visalia-farm-injury-claim" element={<SeoLandingPage />} />
            <Route path="/merced-farm-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oxnard-farm-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 32: birth injury / labor & delivery x metros. */}
            <Route path="/los-angeles-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-birth-injury-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-birth-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 33: traumatic brain injury (TBI) x metros. */}
            <Route path="/los-angeles-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-brain-injury-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-brain-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 34: spinal cord injury / paralysis x metros. */}
            <Route path="/los-angeles-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/bakersfield-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-spinal-cord-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 35: daycare / school child injury x metros. */}
            <Route path="/los-angeles-daycare-school-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-daycare-school-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-daycare-school-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-daycare-school-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 36: defective vehicle / crashworthiness x metros. */}
            <Route path="/los-angeles-defective-vehicle-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-defective-vehicle-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-defective-vehicle-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-defective-vehicle-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 37: carbon monoxide poisoning x metros. */}
            <Route path="/los-angeles-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            {/* Niche wave 5 batch 2: carbon monoxide x San Diego, San Jose, Fresno, Long Beach. */}
            <Route path="/san-diego-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-carbon-monoxide-poisoning-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 38: trampoline park / FEC injury x metros. */}
            <Route path="/los-angeles-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 39: aviation (GA / helicopter / charter) x metros. */}
            <Route path="/los-angeles-aviation-accident-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-aviation-accident-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-aviation-accident-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-aviation-accident-claim" element={<SeoLandingPage />} />
            {/* Niche wave 6 batch 2: aviation x Oakland, Long Beach, Fresno, Riverside. */}
            <Route path="/oakland-aviation-accident-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-aviation-accident-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-aviation-accident-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-aviation-accident-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 40: electrocution / power-line & utility injury x metros. */}
            <Route path="/los-angeles-electrocution-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-electrocution-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-electrocution-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-electrocution-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 41: security guard / bouncer excessive force x metros. */}
            <Route path="/los-angeles-security-guard-assault-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-security-guard-assault-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-security-guard-assault-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-security-guard-assault-claim" element={<SeoLandingPage />} />
            {/* Niche wave 5 batch 2: security-force x Oakland, Fresno, Long Beach, Anaheim. */}
            <Route path="/oakland-security-guard-assault-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-security-guard-assault-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-security-guard-assault-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-security-guard-assault-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 42: escalator / elevator injury x metros. */}
            <Route path="/los-angeles-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 43: toxic mold / uninhabitable rental x metros. */}
            <Route path="/los-angeles-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            {/* Niche wave 5 batch 2: mold/habitability x San Diego, San Jose, Sacramento, Fresno. */}
            <Route path="/san-diego-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-toxic-mold-apartment-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 44: ATV / off-road / dirt-bike injury x regions. */}
            <Route path="/bakersfield-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            {/* Niche wave 6 batch 2: off-road x LA, San Diego, Sacramento, Imperial County (Glamis). */}
            <Route path="/los-angeles-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            <Route path="/imperial-county-atv-off-road-accident-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 45: dram shop / over-service (bar & nightclub) x metros. */}
            <Route path="/los-angeles-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 46: defective product / lithium-battery fire x metros. */}
            <Route path="/los-angeles-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 47: hotel bedbug & guest injury x tourism metros. */}
            <Route path="/anaheim-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            <Route path="/los-angeles-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            {/* Niche hub 4->8: hotel bedbug x SJ, Sacramento, LB, Oakland. */}
            <Route path="/san-jose-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-hotel-bedbug-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 48: gym / fitness-facility injury x metros. */}
            <Route path="/los-angeles-gym-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-gym-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-gym-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-gym-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 49: concert / festival / crowd-crush injury x event metros. */}
            <Route path="/indio-festival-crowd-injury-claim" element={<SeoLandingPage />} />
            <Route path="/los-angeles-concert-crowd-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-festival-crowd-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-festival-crowd-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 50: short-term vacation rental (Airbnb/Vrbo) injury x metros. */}
            <Route path="/los-angeles-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            <Route path="/palm-springs-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-francisco-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            {/* Niche hub 4->8: vacation rental x Tahoe, Big Bear, Santa Cruz, Mammoth. */}
            <Route path="/south-lake-tahoe-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            <Route path="/big-bear-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            <Route path="/santa-cruz-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            <Route path="/mammoth-lakes-vacation-rental-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 2 batch 2: gym injury x Sacramento, Fresno, Long Beach, Anaheim. */}
            <Route path="/sacramento-gym-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-gym-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-gym-injury-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-gym-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 2 batch 2: theme park x Buena Park, Valencia, Vallejo, Gilroy. */}
            <Route path="/buena-park-theme-park-injury" element={<SeoLandingPage />} />
            <Route path="/valencia-theme-park-injury" element={<SeoLandingPage />} />
            <Route path="/vallejo-theme-park-injury" element={<SeoLandingPage />} />
            <Route path="/gilroy-theme-park-injury" element={<SeoLandingPage />} />
            {/* Niche wave 2 batch 2: trampoline park x Fresno, Long Beach, Anaheim, Oakland. */}
            <Route path="/fresno-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-trampoline-park-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 2 batch 2: event crowd x San Diego, Sacramento, Oakland, San Jose. */}
            <Route path="/san-diego-concert-crowd-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-festival-crowd-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-concert-crowd-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-concert-crowd-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 3 batch 2: child/daycare/school x Fresno, Long Beach, Oakland, Anaheim. */}
            <Route path="/fresno-daycare-school-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-daycare-school-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-daycare-school-injury-claim" element={<SeoLandingPage />} />
            <Route path="/anaheim-daycare-school-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 3 batch 2: dram-shop x San Jose, Fresno, Long Beach, Oakland. */}
            <Route path="/san-jose-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-bar-overservice-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 3 batch 2: food poisoning x San Jose, Sacramento, Long Beach, Oakland. */}
            <Route path="/san-jose-food-poisoning" element={<SeoLandingPage />} />
            <Route path="/sacramento-food-poisoning" element={<SeoLandingPage />} />
            <Route path="/long-beach-food-poisoning" element={<SeoLandingPage />} />
            <Route path="/oakland-food-poisoning" element={<SeoLandingPage />} />
            {/* Niche wave 3 batch 2: consumer product/battery fire x San Jose, Sacramento, Fresno, Long Beach. */}
            <Route path="/san-jose-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-defective-product-battery-fire-claim" element={<SeoLandingPage />} />
            {/* Niche wave 4 batch 2: defective vehicle x San Jose, Fresno, Long Beach, Oakland. */}
            <Route path="/san-jose-defective-vehicle-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-defective-vehicle-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-defective-vehicle-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-defective-vehicle-claim" element={<SeoLandingPage />} />
            {/* Niche wave 4 batch 2: delivery vehicle x San Diego, San Jose, Fresno, Long Beach. */}
            <Route path="/san-diego-delivery-truck-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-delivery-truck-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-delivery-truck-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-delivery-truck-accident" element={<SeoLandingPage />} />
            {/* Niche wave 4 batch 2: electrocution x San Jose, Fresno, Long Beach, Riverside. */}
            <Route path="/san-jose-electrocution-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-electrocution-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-electrocution-injury-claim" element={<SeoLandingPage />} />
            <Route path="/riverside-electrocution-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 4 batch 2: elevator/escalator x San Jose, Oakland, Long Beach, Fresno. */}
            <Route path="/san-jose-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            <Route path="/oakland-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            <Route path="/long-beach-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-elevator-escalator-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 51: ski / snowboard resort injury x mountain resorts. */}
            <Route path="/south-lake-tahoe-ski-injury-claim" element={<SeoLandingPage />} />
            <Route path="/big-bear-ski-injury-claim" element={<SeoLandingPage />} />
            <Route path="/mammoth-ski-injury-claim" element={<SeoLandingPage />} />
            <Route path="/truckee-ski-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 6B batch 2: ski x Wrightwood, Olympic Valley, Bear Valley, Shaver Lake. */}
            <Route path="/wrightwood-ski-injury-claim" element={<SeoLandingPage />} />
            <Route path="/olympic-valley-ski-injury-claim" element={<SeoLandingPage />} />
            <Route path="/bear-valley-ski-injury-claim" element={<SeoLandingPage />} />
            <Route path="/shaver-lake-ski-injury-claim" element={<SeoLandingPage />} />
            {/* Geo layer batch 52: equestrian / horseback-riding injury x metros. */}
            <Route path="/los-angeles-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-diego-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            <Route path="/temecula-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            <Route path="/sacramento-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            {/* Niche wave 6B batch 2: equestrian x Riverside, San Jose, Fresno, Norco. */}
            <Route path="/riverside-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            <Route path="/san-jose-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            <Route path="/fresno-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            <Route path="/norco-horseback-riding-injury-claim" element={<SeoLandingPage />} />
            {/* Missing-vertical hub: e-bike collision, deepened to the 12-metro standard. */}
            <Route path="/los-angeles-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/fresno-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-e-bike-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-e-bike-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 53: dog-bite city guides (batch 2) x metros. */}
            <Route path="/san-jose-dog-bite" element={<SeoLandingPage />} />
            <Route path="/fresno-dog-bite" element={<SeoLandingPage />} />
            <Route path="/long-beach-dog-bite" element={<SeoLandingPage />} />
            <Route path="/oakland-dog-bite" element={<SeoLandingPage />} />
            {/* Geo layer batch 54: slip-and-fall city guides (batch 2) x metros. */}
            <Route path="/san-jose-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/fresno-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/long-beach-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/oakland-slip-and-fall" element={<SeoLandingPage />} />
            {/* Geo layer batch 55: truck accident city guides (batch 2) x metros. */}
            <Route path="/los-angeles-truck-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-truck-accident" element={<SeoLandingPage />} />
            <Route path="/sacramento-truck-accident" element={<SeoLandingPage />} />
            <Route path="/stockton-truck-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-truck-accident" element={<SeoLandingPage />} />
            <Route path="/san-jose-truck-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-truck-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-truck-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 56: bus/transit city guides (batch 2) x metros. */}
            <Route path="/san-jose-vta-accident" element={<SeoLandingPage />} />
            <Route path="/oakland-ac-transit-accident" element={<SeoLandingPage />} />
            <Route path="/long-beach-bus-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-octa-bus-accident" element={<SeoLandingPage />} />
            {/* Geo layer mid-tier batch 3: transit x Fresno, Riverside, SB, Bakersfield. */}
            <Route path="/fresno-fax-bus-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-rta-bus-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-omnitrans-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-get-bus-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 57: rideshare city guides (batch 3) x Central Valley / Inland Empire. */}
            <Route path="/fresno-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/riverside-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-rideshare-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 58: motorcycle city guides (batch 3) x metros. */}
            <Route path="/san-francisco-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/anaheim-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/santa-ana-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/bakersfield-motorcycle-accident" element={<SeoLandingPage />} />
            {/* Geo layer batch 59: dog-bite city guides (batch 3) x metros. */}
            <Route path="/riverside-dog-bite" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-dog-bite" element={<SeoLandingPage />} />
            <Route path="/bakersfield-dog-bite" element={<SeoLandingPage />} />
            <Route path="/anaheim-dog-bite" element={<SeoLandingPage />} />
            {/* Geo layer batch 60: slip-and-fall city guides (batch 3) x metros. */}
            <Route path="/riverside-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/san-bernardino-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/bakersfield-slip-and-fall" element={<SeoLandingPage />} />
            <Route path="/anaheim-slip-and-fall" element={<SeoLandingPage />} />
            {/* Geo layer: practice x city (pedestrian + bicycle across top metros). */}
            <Route path="/los-angeles-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/san-francisco-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/los-angeles-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/san-diego-bicycle-accident" element={<SeoLandingPage />} />
            <Route path="/medical-records" element={<SeoLandingPage />} />
            <Route path="/how-to-organize-medical-records" element={<SeoLandingPage />} />
            <Route path="/how-to-build-a-medical-chronology" element={<SeoLandingPage />} />
            <Route path="/what-medical-records-do-lawyers-need" element={<SeoLandingPage />} />
            <Route path="/how-insurance-companies-review-medical-records" element={<SeoLandingPage />} />
            {/* Firm workspace is shared by firm attorneys/admins and non-attorney
                staff (paralegals, case managers, etc.); the page scopes its tabs
                by the member's permissions. */}
            <Route element={<ProtectedRoute role={['attorney', 'staff']} />}>
              <Route path="/firm-dashboard" element={<FirmDashboard />} />
            </Route>
            <Route element={<ProtectedRoute role="attorney" />}>
              {/* Two-domain workspace shell (Lead Generation vs Case Management).
                  Each route mounts the shared sidebar layout and a focused page. */}
              <Route element={<AttorneyWorkspaceLayout />}>
                {/* Lead Generation */}
                <Route path="/attorney-dashboard/leadgen/matches" element={<NewMatchesPage />} />
                {/* Pre-acceptance / expired review stays inside Lead Generation (read-only
                    snapshot) — it must never open the Case Management case file. */}
                <Route path="/attorney-dashboard/leadgen/matches/:leadId/:section" element={<NewMatchesPage />} />
                <Route path="/attorney-dashboard/leadgen/quality" element={<MatchQualityPage />} />
                <Route path="/attorney-dashboard/leadgen/marketplace" element={<MarketplacePerformancePage />} />
                <Route path="/attorney-dashboard/leadgen/analytics" element={<AttorneyAnalyticsPage />} />
                {/* Standalone homes for the retired legacy dashboard tabs. */}
                <Route path="/attorney-dashboard/overview" element={<AttorneyOverviewPage />} />
                <Route path="/attorney-dashboard/settings/profile" element={<AttorneyProfileSettingsPage />} />
                {/* Intake now lives under Case Management; keep the old leadgen path as a redirect. */}
                <Route path="/attorney-dashboard/leadgen/intake" element={<Navigate to="/attorney-dashboard/cases/intake" replace />} />
                {/* Case Management */}
                <Route path="/attorney-dashboard/cases/intake" element={<IntakePage />} />
                <Route path="/attorney-dashboard/cases/active" element={<ActiveCasesPage />} />
                {/* Case Workspace launcher folded into Active Cases ("Jump back in" strip). */}
                <Route path="/attorney-dashboard/cases/workspace" element={<Navigate to="/attorney-dashboard/cases/active" replace />} />
                <Route path="/attorney-dashboard/cases/calendar" element={<CalendarPage />} />
                <Route path="/attorney-dashboard/cases/scheduling" element={<SchedulingSettingsPage />} />
                <Route path="/attorney-dashboard/cases/messages" element={<CaseMessagesPage />} />
                <Route path="/attorney-dashboard/cases/team" element={<TeamMessagesPage />} />
                <Route path="/attorney-dashboard/cases/activity" element={<ActivityPage />} />
                <Route path="/attorney-dashboard/notifications" element={<NotificationsPage />} />
                <Route path="/attorney-dashboard/cases/documents" element={<CaseDocumentsHubPage />} />
                <Route path="/attorney-dashboard/cases/tasks" element={<CaseTasksPage />} />
                <Route path="/attorney-dashboard/cases/deadlines" element={<CaseDeadlinesPage />} />
                <Route path="/attorney-dashboard/cases/contacts" element={<CaseContactsPage />} />
                <Route path="/attorney-dashboard/cases/billing" element={<CaseBillingPage />} />
                <Route path="/attorney-dashboard/cases/copilot" element={<CaseCopilotPage />} />
                <Route path="/attorney-dashboard/cases/ai-manager" element={<AiCaseManagerPage />} />
                <Route path="/attorney-dashboard/cases/firm" element={<FirmDashboard />} />
                {/* Single-case workspace (canonical + plan alias) */}
                <Route path="/attorney-dashboard/lead/:leadId/:section" element={<CaseWorkspacePage />} />
                <Route path="/attorney-dashboard/cases/:leadId/:section" element={<CaseWorkspacePage />} />
              </Route>
              {/* Default landing → new two-domain workspace; legacy ?tab= deep
                  links redirect to their first-class route (see AttorneyDashboardEntry). */}
              <Route path="/attorney-dashboard" element={<AttorneyDashboardEntry />} />
              <Route path="/attorney-dashboard/contacts" element={<Navigate to="/attorney-dashboard/cases/contacts" replace />} />
              <Route path="/attorney-dashboard/documents/:leadId" element={<AttorneyCaseDocumentsRedirect />} />
              <Route path="/attorney-dashboard/add-contact/:leadId" element={<AddContactPage />} />
              <Route path="/attorney-dashboard/time-entry/:leadId" element={<TimeEntryPage />} />
              <Route path="/attorney-dashboard/add-task/:leadId" element={<AddTaskPage />} />
              <Route path="/attorney-dashboard/add-note/:leadId" element={<AddNotePage />} />
              <Route path="/attorney-dashboard/add-expense/:leadId" element={<AddExpensePage />} />
              <Route path="/attorney-dashboard/create-invoice/:leadId" element={<CreateInvoicePage />} />
              <Route path="/attorney-dashboard/schedule-consult/:leadId" element={<ScheduleConsultPage />} />
              <Route path="/attorney-dashboard/request-docs/:leadId" element={<DocumentRequestPage />} />
              <Route path="/attorney-dashboard/draft-message/:leadId" element={<DraftMessagePage />} />
              <Route path="/attorney-dashboard/calendar" element={<Navigate to="/attorney-dashboard/cases/calendar" replace />} />
              <Route path="/firm-settings" element={<FirmSettings />} />
              <Route path="/attorney-billing" element={<AttorneyBilling />} />
              <Route path="/attorney-profile" element={<AttorneyProfile />} />
              {/* Retired standalone preferences page: every setting it owned now
                  lives in dashboard settings. Kept as a redirect for bookmarks. */}
              <Route path="/attorney-preferences" element={<Navigate to="/attorney-dashboard/settings/profile" replace />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/medical-providers" element={<MedicalProviders />} />
            </Route>
            <Route path="/respond/documents/:token" element={<DocumentPortal />} />
            <Route path="/evidence-upload/:assessmentId" element={<EvidenceUploadRedirect />} />
            <Route path="/evidence-upload" element={<EvidenceUploadRedirect />} />
            <Route path="/evidence-dashboard/:assessmentId" element={<EvidenceDashboard />} />
            <Route path="/evidence-dashboard" element={<EvidenceDashboard />} />
            <Route path="/demand/:assessmentId" element={<Demand />} />
            <Route path="/drafts/:assessmentId" element={<Drafts />} />
            <Route path="/intake" element={<IntakeWizardQuick />} />
            <Route path="/assess" element={<IntakeWizardQuick />} />
            <Route path="/intake2" element={<IntakeWizardQuick />} />
            <Route path="/rose" element={<RoseIntake />} />
            <Route path="/edit-assessment/:assessmentId" element={<IntakeWizard />} />
            <Route path="/results/:assessmentId" element={<ResultsRouteBoundary />} />
            <Route path="/attorneys" element={<Attorneys />} />
            <Route path="/attorneys-enhanced" element={<AttorneysEnhanced />} />
            <Route path="/firms" element={<Firms />} />
            <Route path="/firms/:slug" element={<FirmProfile />} />
            {/* Public "Calendly-style" booking (no auth required). */}
            <Route path="/book/:slug" element={<PublicBookingPage />} />
            <Route path="/book/:slug/:eventSlug" element={<PublicBookingPage />} />
            <Route path="/booking/manage/:token" element={<BookingManagePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
