import type { Express } from 'express'
import { createServer } from './server'
import { logger } from './lib/logger'
import { recordServerError } from './lib/error-rate-monitor'
import assessments from './routes/assessments'
import files from './routes/files'
import predict from './routes/predict'
import attorneys from './routes/attorneys'
import intros from './routes/intros'
import demands from './routes/demands'
import sol from './routes/sol'
import notifications from './routes/notifications'
import plaintiffNotifications from './routes/plaintiff-notifications'
import auth from './routes/auth'
import favorites from './routes/favorites'
import appointments from './routes/appointments'
import attorneyProfiles from './routes/attorney-profiles'
import messaging from './routes/messaging'
import caseTracker from './routes/case-tracker'
import financing from './routes/financing'
import smartRecommendations from './routes/smart-recommendations'
import attorneyDashboard from './routes/attorney-dashboard'
import leadQuality from './routes/lead-quality'
import attorneyProfile from './routes/attorney-profile'
import attorneyRegister from './routes/attorney-register'
import attorneyClaim from './routes/attorney-claim'
import medicalProviders from './routes/medical-providers'
import evidence from './routes/evidence'
import oauth from './routes/oauth'
import consent from './routes/consent'
import chatgpt from './routes/chatgpt'
import incidentExtraction from './routes/incident-extraction'
import admin from './routes/admin'
import firmDashboard from './routes/firm-dashboard'
import firms from './routes/firms'
import tierRouting from './routes/tier-routing'
import featureToggles from './routes/feature-toggles'
import compliance from './routes/compliance'
import smsWebhook from './routes/sms-webhook'
import snsWebhook from './routes/sns-webhook'
import caseInsights from './routes/case-insights'
import caseAssistance from './routes/case-assistance'
import caseRouting from './routes/case-routing'
import rose from './routes/rose'
import adminCommunications from './routes/admin-communications'
import supportTickets from './routes/support-tickets'
import contact from './routes/contact'
import blog from './routes/blog'
import supportChat from './routes/support-chat'
import attorneyCalendar from './routes/attorney-calendar'
import attorneyZoom from './routes/attorney-zoom'
import payments from './routes/payments'
import intakeLeads from './routes/intake-leads'
import heuristics from './routes/heuristics'
import integrations from './routes/integrations'
import cases from './routes/cases'
import sync from './routes/sync'
import documentPortal from './routes/document-portal'
import documents from './routes/documents'
import esignWebhook from './routes/esign-webhook'
import scheduling from './routes/scheduling'
import publicBooking from './routes/public-booking'
import calendarEvents from './routes/calendar-events'
import calls from './routes/calls'
import connectWebhook from './routes/connect-webhook'
import { authLimiter, intakeLimiter } from './lib/rate-limits'

/**
 * Fully configured Express app (no listen). Used by index.ts and integration tests.
 */
export function buildApp(): Express {
  const app = createServer()

  app.use('/v1/auth', authLimiter, auth)
  app.use('/v1/favorites', favorites)
  app.use('/v1/appointments', appointments)
  app.use('/v1/attorney-profiles', attorneyProfiles)
  app.use('/v1/messaging', messaging)
  app.use('/v1/case-tracker', caseTracker)
  app.use('/v1/financing', financing)
  app.use('/v1/smart-recommendations', smartRecommendations)
  app.use('/v1/attorney-dashboard', attorneyDashboard)
  app.use('/v1/lead-quality', leadQuality)
  app.use('/v1/attorney-profile', attorneyProfile)
  app.use('/v1/attorney-register', attorneyRegister)
  app.use('/v1/attorney-claim', attorneyClaim)
  app.use('/v1/medical-providers', medicalProviders)
  // The tight upload limiter is applied per-route inside the evidence router to
  // only the expensive write/OCR endpoints (upload, upload-multiple, the two
  // prechecks, and process). Mounting it on the whole router also throttled the
  // list read, the status/jobs polling, and annotation reads that a single
  // evidence session fires many times, which exhausted the small budget and
  // returned "Server is busy" before the user had uploaded anything.
  app.use('/v1/evidence', evidence)
  app.use('/v1/consent', consent)
  app.use('/v1/chatgpt', chatgpt)
  app.use('/v1/incident-extraction', incidentExtraction)
  app.use('/v1/auth', authLimiter, oauth)
  app.use('/v1/assessments', assessments)
  app.use('/v1/intake-leads', intakeLimiter, intakeLeads)
  app.use('/v1/rose', rose)
  app.use('/v1/case-insights', caseInsights)
  app.use('/v1/case-assistance', caseAssistance)
  app.use('/v1/case-routing', caseRouting)
  app.use('/v1/files', files)
  app.use('/v1/predict', predict)
  app.use('/v1/attorneys', attorneys)
  app.use('/v1/intros', intros)
  app.use('/v1/demands', demands)
  app.use('/v1/sol', sol)
  app.use('/v1/notify', notifications)
  app.use('/v1/plaintiff/notifications', plaintiffNotifications)
  app.use('/v1/sms', smsWebhook)
  app.use('/v1/sms/sns', snsWebhook)
  app.use('/v1/admin', admin)
  app.use('/v1/admin/communications', adminCommunications)
  app.use('/v1/support-tickets', supportTickets)
  app.use('/v1/contact', contact)
  app.use('/v1/blog', blog)
  app.use('/v1/support/chat', supportChat)
  app.use('/v1/firm-dashboard', firmDashboard)
  app.use('/v1/firms', firms)
  app.use('/v1/tier-routing', tierRouting)
  app.use('/v1/feature-toggles', featureToggles)
  app.use('/v1/compliance', compliance)
  app.use('/v1/attorney-calendar', attorneyCalendar)
  app.use('/v1/attorney-zoom', attorneyZoom)
  app.use('/v1/payments', payments)
  app.use('/v1/heuristics', heuristics)
  app.use('/v1/integrations', integrations)
  app.use('/v1/cases', cases)
  app.use('/v1/sync', sync)
  app.use('/v1/public/document-requests', documentPortal)
  app.use('/v1/public/booking', publicBooking)
  app.use('/v1/scheduling', scheduling)
  app.use('/v1/calendar-events', calendarEvents)
  app.use('/v1/documents', documents)
  // Recorded calls: the webhook must mount before the auth-guarded /v1/calls
  // router so SNS can POST /v1/calls/connect/events without a token.
  app.use('/v1/calls/connect', connectWebhook)
  app.use('/v1/calls', calls)
  app.use('/v1/webhooks/esign', esignWebhook)

  app.get('/', (req, res) => {
    res.json({
      name: 'ClearCaseIQ API',
      version: '1.0.0',
      status: 'healthy',
      endpoints: {
        auth: '/v1/auth',
        favorites: '/v1/favorites',
        appointments: '/v1/appointments',
        attorneyProfiles: '/v1/attorney-profiles',
        messaging: '/v1/messaging',
        caseTracker: '/v1/case-tracker',
        financing: '/v1/financing',
        smartRecommendations: '/v1/smart-recommendations',
        attorneyDashboard: '/v1/attorney-dashboard',
        leadQuality: '/v1/lead-quality',
        attorneyProfile: '/v1/attorney-profile',
        medicalProviders: '/v1/medical-providers',
        evidence: '/v1/evidence',
        assessments: '/v1/assessments',
        files: '/v1/files',
        predict: '/v1/predict',
        attorneys: '/v1/attorneys',
        intros: '/v1/intros',
        demands: '/v1/demands',
        sol: '/v1/sol',
        notifications: '/v1/notify',
      },
    })
  })

  app.use((error: unknown, req: any, res: any, _next: any) => {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      requestId: req.id,
    })

    // Feeds the error-rate tripwire. The label is the error type plus the route
    // pattern rather than the message or URL, so a spike can be named in the
    // alert without putting request data or PII into an email.
    recordServerError(`${err.name} at ${req.method} ${req.route?.path ?? req.baseUrl ?? 'unknown'}`)

    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id,
    })
  })

  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.originalUrl,
      requestId: req.id,
    })
  })

  return app
}
