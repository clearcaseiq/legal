import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { Routes, Route, Navigate, Link, useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { GuestRoute, ProtectedRoute } from './components/AuthRoute'
import { useLanguage } from './contexts/LanguageContext'
import { ATTORNEY_ROUTE_PREFIXES } from './lib/layoutWidth'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const AttorneyLogin = lazy(() => import('./pages/AttorneyLogin'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const AttorneyRegister = lazy(() => import('./pages/AttorneyRegister'))
const ClaimProfile = lazy(() => import('./pages/ClaimProfile'))
const AttorneyNetwork = lazy(() => import('./pages/AttorneyNetwork'))
const AttorneyLicenseUpload = lazy(() => import('./pages/AttorneyLicenseUpload'))
const AttorneyOnboardingPayment = lazy(() => import('./pages/AttorneyOnboardingPayment'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const IntakeWizard = lazy(() => import('./pages/IntakeWizard'))
const IntakeWizardQuick = lazy(() => import('./pages/IntakeWizardQuick'))
const Results = lazy(() => import('./pages/Results'))
const Attorneys = lazy(() => import('./pages/Attorneys'))
const AttorneysEnhanced = lazy(() => import('./pages/AttorneysEnhanced'))
const FirmProfile = lazy(() => import('./pages/FirmProfile'))
const Firms = lazy(() => import('./pages/Firms'))
const CaseTracker = lazy(() => import('./pages/CaseTracker'))
const AICopilot = lazy(() => import('./pages/AICopilot'))
const Financing = lazy(() => import('./pages/Financing'))
const Messaging = lazy(() => import('./pages/Messaging'))
const RecoveryHub = lazy(() => import('./pages/RecoveryHub'))
const SmartRecommendations = lazy(() => import('./pages/SmartRecommendations'))
const AttorneyDashboard = lazy(() => import('./pages/AttorneyDashboard'))
// Two-domain attorney workspace (Lead Generation vs Case Management)
const AttorneyWorkspaceLayout = lazy(() => import('./features/shared/AttorneyWorkspaceLayout'))
const NewMatchesPage = lazy(() => import('./features/leadgen/NewMatchesPage'))
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
const AddContactPage = lazy(() => import('./pages/AddContactPage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const CaseDocumentsPage = lazy(() => import('./pages/CaseDocumentsPage'))
const TimeEntryPage = lazy(() => import('./pages/TimeEntryPage'))
const AddTaskPage = lazy(() => import('./pages/AddTaskPage'))
const AddNotePage = lazy(() => import('./pages/AddNotePage'))
const AddExpensePage = lazy(() => import('./pages/AddExpensePage'))
const CreateInvoicePage = lazy(() => import('./pages/CreateInvoicePage'))
const ScheduleConsultPage = lazy(() => import('./pages/ScheduleConsultPage'))
const DocumentRequestPage = lazy(() => import('./pages/DocumentRequestPage'))
const DraftMessagePage = lazy(() => import('./pages/DraftMessagePage'))
const EventsPage = lazy(() => import('./pages/EventsPage'))
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
  return (
    <Navigate
      to={assessmentId ? `/intake2?assessment=${assessmentId}&step=evidence` : '/assess'}
      replace
    />
  )
}
const DocumentPortal = lazy(() => import('./pages/DocumentPortal'))
const EvidenceDashboard = lazy(() => import('./pages/EvidenceDashboard'))
const Demand = lazy(() => import('./pages/Demand'))
const Drafts = lazy(() => import('./pages/Drafts'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Assessments = lazy(() => import('./pages/Assessments'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const ComplianceAdmin = lazy(() => import('./pages/ComplianceAdmin'))
const AdminUserRoles = lazy(() => import('./pages/AdminUserRoles'))
const AdminFeatureToggles = lazy(() => import('./pages/AdminFeatureToggles'))
const AdminFirmSettings = lazy(() => import('./pages/AdminFirmSettings'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const AdminCases = lazy(() => import('./pages/admin/AdminCases'))
const AdminCaseDetail = lazy(() => import('./pages/admin/AdminCaseDetail'))
const AdminRoutingQueue = lazy(() => import('./pages/admin/AdminRoutingQueue'))
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
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const CompleteConsent = lazy(() => import('./pages/CompleteConsent'))
const ConsentManagement = lazy(() => import('./pages/ConsentManagement'))
const TestConsent = lazy(() => import('./pages/TestConsent'))
const AuthDebug = lazy(() => import('./pages/AuthDebug'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Help = lazy(() => import('./pages/Help'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const AiMlConsent = lazy(() => import('./pages/AiMlConsent'))
const RoseIntake = lazy(() => import('./pages/RoseIntake'))
const HipaaAuthorization = lazy(() => import('./pages/HipaaAuthorization'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'))
const SeoLandingPage = lazy(() => import('./pages/SeoLandingPage'))

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
// workspace by default. Legacy deep links that carry a ?tab= param
// (profile/analytics/intake/overview) still render the classic dashboard.
function AttorneyDashboardEntry() {
  const location = useLocation()
  const hasLegacyTab = new URLSearchParams(location.search).get('tab')
  if (hasLegacyTab) return <AttorneyDashboard />
  return <Navigate to="/attorney-dashboard/leadgen/matches" replace />
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

// The attorney-facing product is English-only; switch back to English if the
// shared language picker was left on Spanish/Chinese from the plaintiff flow.
function AttorneyEnglishEnforcer() {
  const location = useLocation()
  const { language, setLanguage } = useLanguage()

  useEffect(() => {
    const isAttorneyRoute = ATTORNEY_ROUTE_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
    if (isAttorneyRoute && language !== 'en') {
      setLanguage('en')
    }
  }, [location.pathname, language, setLanguage])

  return null
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
      <AttorneyEnglishEnforcer />
      <Layout>
        <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
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
            <Route element={<ProtectedRoute role="plaintiff" />}>
              <Route path="/auth/complete-consent" element={<CompleteConsent />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/consent-management" element={<ConsentManagement />} />
              <Route path="/case-tracker" element={<CaseTracker />} />
              <Route path="/ai-copilot" element={<AICopilot />} />
              <Route path="/financing" element={<Financing />} />
              <Route path="/messaging" element={<Messaging />} />
              <Route path="/recovery-hub" element={<RecoveryHub />} />
              <Route path="/smart-recommendations/:assessmentId" element={<SmartRecommendations />} />
            </Route>
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="cases" element={<AdminCases />} />
                <Route path="cases/:id" element={<AdminCaseDetail />} />
                <Route path="routing-queue" element={<AdminRoutingQueue />} />
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
            <Route path="/help" element={<Help />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/attorney-network" element={<AttorneyNetwork />} />
            {/* Consolidated: the old marketing page now points at the single attorney landing page. */}
            <Route path="/for-attorneys" element={<Navigate to="/attorney-network" replace />} />
            <Route path="/claim/:token" element={<ClaimProfile />} />
            <Route path="/assessment/start" element={<Navigate to="/assess?fresh=1" replace />} />
            <Route path="/ai-ml-consent" element={<AiMlConsent />} />
            <Route path="/hipaa-authorization" element={<HipaaAuthorization />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/injuries/:slug" element={<SeoLandingPage />} />
            <Route path="/treatment/:slug" element={<SeoLandingPage />} />
            <Route path="/tools/:slug" element={<SeoLandingPage />} />
            <Route path="/settlements/:slug" element={<SeoLandingPage />} />
            <Route path="/insurance/:slug" element={<SeoLandingPage />} />
            <Route path="/liability/:slug" element={<SeoLandingPage />} />
            <Route path="/commercial/:slug" element={<SeoLandingPage />} />
            <Route path="/legal/:slug" element={<SeoLandingPage />} />
            <Route path="/education/:slug" element={<SeoLandingPage />} />
            <Route path="/case-strength/:slug" element={<SeoLandingPage />} />
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
            <Route path="/average-car-accident-settlement-california" element={<SeoLandingPage />} />
            <Route path="/average-whiplash-settlement-california" element={<SeoLandingPage />} />
            <Route path="/average-herniated-disc-settlement-california" element={<SeoLandingPage />} />
            <Route path="/average-tbi-settlement-california" element={<SeoLandingPage />} />
            <Route path="/average-back-surgery-settlement-california" element={<SeoLandingPage />} />
            <Route path="/average-motorcycle-settlement-california" element={<SeoLandingPage />} />
            <Route path="/when-to-hire-a-lawyer-after-accident" element={<SeoLandingPage />} />
            <Route path="/do-i-need-a-lawyer-after-a-car-accident" element={<SeoLandingPage />} />
            <Route path="/how-much-do-personal-injury-lawyers-charge" element={<SeoLandingPage />} />
            <Route path="/how-much-do-lawyers-take-from-settlement" element={<SeoLandingPage />} />
            <Route path="/can-i-switch-lawyers-during-my-case" element={<SeoLandingPage />} />
            <Route path="/case-strength-hit-and-run" element={<SeoLandingPage />} />
            <Route path="/case-strength-uninsured-driver" element={<SeoLandingPage />} />
            <Route path="/case-strength-commercial-truck" element={<SeoLandingPage />} />
            <Route path="/case-strength-rideshare-accident" element={<SeoLandingPage />} />
            <Route path="/case-strength-motorcycle-accident" element={<SeoLandingPage />} />
            <Route path="/case-strength-pedestrian-accident" element={<SeoLandingPage />} />
            <Route path="/california-statute-of-limitations-car-accident" element={<SeoLandingPage />} />
            <Route path="/california-statute-of-limitations-personal-injury" element={<SeoLandingPage />} />
            <Route path="/california-statute-of-limitations-wrongful-death" element={<SeoLandingPage />} />
            <Route path="/missed-the-statute-of-limitations" element={<SeoLandingPage />} />
            <Route path="/medical-records" element={<SeoLandingPage />} />
            <Route path="/how-to-organize-medical-records" element={<SeoLandingPage />} />
            <Route path="/how-to-build-a-medical-chronology" element={<SeoLandingPage />} />
            <Route path="/what-medical-records-do-lawyers-need" element={<SeoLandingPage />} />
            <Route path="/how-insurance-companies-review-medical-records" element={<SeoLandingPage />} />
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
                <Route path="/attorney-dashboard/cases/firm" element={<FirmDashboard />} />
                {/* Single-case workspace (canonical + plan alias) */}
                <Route path="/attorney-dashboard/lead/:leadId/:section" element={<CaseWorkspacePage />} />
                <Route path="/attorney-dashboard/cases/:leadId/:section" element={<CaseWorkspacePage />} />
              </Route>
              {/* Default landing → new two-domain workspace; ?tab= deep links
                  still render the legacy dashboard (see AttorneyDashboardEntry). */}
              <Route path="/attorney-dashboard" element={<AttorneyDashboardEntry />} />
              <Route path="/attorney-dashboard/contacts" element={<ContactsPage />} />
              <Route path="/attorney-dashboard/documents/:leadId" element={<CaseDocumentsPage />} />
              <Route path="/attorney-dashboard/add-contact/:leadId" element={<AddContactPage />} />
              <Route path="/attorney-dashboard/time-entry/:leadId" element={<TimeEntryPage />} />
              <Route path="/attorney-dashboard/add-task/:leadId" element={<AddTaskPage />} />
              <Route path="/attorney-dashboard/add-note/:leadId" element={<AddNotePage />} />
              <Route path="/attorney-dashboard/add-expense/:leadId" element={<AddExpensePage />} />
              <Route path="/attorney-dashboard/create-invoice/:leadId" element={<CreateInvoicePage />} />
              <Route path="/attorney-dashboard/schedule-consult/:leadId" element={<ScheduleConsultPage />} />
              <Route path="/attorney-dashboard/request-docs/:leadId" element={<DocumentRequestPage />} />
              <Route path="/attorney-dashboard/draft-message/:leadId" element={<DraftMessagePage />} />
              <Route path="/attorney-dashboard/events" element={<EventsPage />} />
              <Route path="/attorney-dashboard/calendar" element={<CalendarPage />} />
              <Route path="/firm-dashboard" element={<FirmDashboard />} />
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
          </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
