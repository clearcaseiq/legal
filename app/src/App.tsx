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
const AICopilot = lazy(() => import('./pages/AICopilot'))
const Messaging = lazy(() => import('./pages/Messaging'))
const RecoveryHub = lazy(() => import('./pages/RecoveryHub'))
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
const PublicTeamBookingPage = lazy(() => import('./features/public/PublicTeamBookingPage'))
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
const AttorneyPreferences = lazy(() => import('./pages/AttorneyPreferences'))
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
              <Route path="/ai-copilot" element={<AICopilot />} />
              {/* /financing is unrouted until there are signed funding partner
                  agreements. The page listed named lenders (Oasis Financial,
                  Law Cash) and lien-based clinics with interest rates, approval
                  rates and ratings that were invented placeholders, which is not
                  something to show injury claimants. Restore the route once
                  /v1/financing/partners returns real partners. */}
              <Route path="/messaging" element={<Messaging />} />
              <Route path="/recovery-hub" element={<RecoveryHub />} />
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
              <Route path="/attorney-preferences" element={<AttorneyPreferences />} />
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
            <Route path="/book/team/:firmSlug/:linkSlug" element={<PublicTeamBookingPage />} />
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
