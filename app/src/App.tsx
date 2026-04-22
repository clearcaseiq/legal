import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { GuestRoute, ProtectedRoute } from './components/AuthRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const AttorneyLogin = lazy(() => import('./pages/AttorneyLogin'))
const Register = lazy(() => import('./pages/Register'))
const AttorneyRegister = lazy(() => import('./pages/AttorneyRegister'))
const AttorneyLicenseUpload = lazy(() => import('./pages/AttorneyLicenseUpload'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const IntakeWizard = lazy(() => import('./pages/IntakeWizard'))
const IntakeWizardQuick = lazy(() => import('./pages/IntakeWizardQuick'))
const Results = lazy(() => import('./pages/Results'))
const Attorneys = lazy(() => import('./pages/Attorneys'))
const AttorneysEnhanced = lazy(() => import('./pages/AttorneysEnhanced'))
const CaseTracker = lazy(() => import('./pages/CaseTracker'))
const AICopilot = lazy(() => import('./pages/AICopilot'))
const Financing = lazy(() => import('./pages/Financing'))
const Messaging = lazy(() => import('./pages/Messaging'))
const RecoveryHub = lazy(() => import('./pages/RecoveryHub'))
const SmartRecommendations = lazy(() => import('./pages/SmartRecommendations'))
const AttorneyDashboard = lazy(() => import('./pages/AttorneyDashboard'))
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
const LeadQuality = lazy(() => import('./pages/LeadQuality'))
const AttorneyProfile = lazy(() => import('./pages/AttorneyProfile'))
const AttorneyPreferences = lazy(() => import('./pages/AttorneyPreferences'))
const MedicalProviders = lazy(() => import('./pages/MedicalProviders'))
const EvidenceUpload = lazy(() => import('./pages/EvidenceUpload'))
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
const ForAttorneys = lazy(() => import('./pages/ForAttorneys'))
const AiMlConsent = lazy(() => import('./pages/AiMlConsent'))
const RoseIntake = lazy(() => import('./pages/RoseIntake'))
const HipaaAuthorization = lazy(() => import('./pages/HipaaAuthorization'))

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

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
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
            <Route path="/test-consent" element={<TestConsent />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/for-attorneys" element={<ForAttorneys />} />
            <Route path="/assessment/start" element={<Navigate to="/assess?fresh=1" replace />} />
            <Route path="/ai-ml-consent" element={<AiMlConsent />} />
            <Route path="/hipaa-authorization" element={<HipaaAuthorization />} />
            <Route element={<ProtectedRoute role="attorney" />}>
              <Route path="/attorney-dashboard" element={<AttorneyDashboard />} />
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
              <Route path="/attorney-dashboard/lead/:leadId/:section" element={<AttorneyDashboard />} />
              <Route path="/firm-dashboard" element={<FirmDashboard />} />
              <Route path="/lead-quality" element={<LeadQuality />} />
              <Route path="/attorney-profile" element={<AttorneyProfile />} />
              <Route path="/attorney-preferences" element={<AttorneyPreferences />} />
              <Route path="/medical-providers" element={<MedicalProviders />} />
            </Route>
            <Route path="/evidence-upload/:assessmentId" element={<EvidenceUpload />} />
            <Route path="/evidence-dashboard/:assessmentId" element={<EvidenceDashboard />} />
            <Route path="/evidence-dashboard" element={<EvidenceDashboard />} />
            <Route path="/intake" element={<IntakeWizardQuick />} />
            <Route path="/assess" element={<IntakeWizardQuick />} />
            <Route path="/rose" element={<RoseIntake />} />
            <Route path="/edit-assessment/:assessmentId" element={<IntakeWizard />} />
            <Route path="/results/:assessmentId" element={<Results />} />
            <Route path="/attorneys" element={<Attorneys />} />
            <Route path="/attorneys-enhanced" element={<AttorneysEnhanced />} />
            <Route path="/case-tracker" element={<CaseTracker />} />
            <Route path="/ai-copilot" element={<AICopilot />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/messaging" element={<Messaging />} />
            <Route path="/recovery-hub" element={<RecoveryHub />} />
            <Route path="/smart-recommendations/:assessmentId" element={<SmartRecommendations />} />
            <Route path="/demand/:assessmentId" element={<Demand />} />
            <Route path="/drafts/:assessmentId" element={<Drafts />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
