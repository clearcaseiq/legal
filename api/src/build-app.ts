import type { Express } from 'express'
import { createServer } from './server'
import { logger } from './lib/logger'
import assessments from './routes/assessments'
import files from './routes/files'
import predict from './routes/predict'
import attorneys from './routes/attorneys'
import intros from './routes/intros'
import demands from './routes/demands'
import sol from './routes/sol'
import notifications from './routes/notifications'
import auth from './routes/auth'
import favorites from './routes/favorites'
import appointments from './routes/appointments'
import attorneyProfiles from './routes/attorney-profiles'
import messaging from './routes/messaging'
import caseTracker from './routes/case-tracker'
import aiCopilot from './routes/ai-copilot'
import financing from './routes/financing'
import recoveryHub from './routes/recovery-hub'
import smartRecommendations from './routes/smart-recommendations'
import verification from './routes/verification'
import attorneyDashboard from './routes/attorney-dashboard'
import leadQuality from './routes/lead-quality'
import attorneyProfile from './routes/attorney-profile'
import attorneyRegister from './routes/attorney-register'
import medicalProviders from './routes/medical-providers'
import evidence from './routes/evidence'
import oauth from './routes/oauth'
import consent from './routes/consent'
import chatgpt from './routes/chatgpt'
import admin from './routes/admin'
import firmDashboard from './routes/firm-dashboard'
import tierRouting from './routes/tier-routing'
import featureToggles from './routes/feature-toggles'
import compliance from './routes/compliance'
import smsWebhook from './routes/sms-webhook'
import caseInsights from './routes/case-insights'
import caseRouting from './routes/case-routing'
import rose from './routes/rose'
import adminCommunications from './routes/admin-communications'
import supportTickets from './routes/support-tickets'
import attorneyCalendar from './routes/attorney-calendar'

/**
 * Fully configured Express app (no listen). Used by index.ts and integration tests.
 */
export function buildApp(): Express {
  const app = createServer()

  app.use('/v1/auth', auth)
  app.use('/v1/favorites', favorites)
  app.use('/v1/appointments', appointments)
  app.use('/v1/attorney-profiles', attorneyProfiles)
  app.use('/v1/messaging', messaging)
  app.use('/v1/case-tracker', caseTracker)
  app.use('/v1/ai-copilot', aiCopilot)
  app.use('/v1/financing', financing)
  app.use('/v1/recovery-hub', recoveryHub)
  app.use('/v1/smart-recommendations', smartRecommendations)
  app.use('/v1/verification', verification)
  app.use('/v1/attorney-dashboard', attorneyDashboard)
  app.use('/v1/lead-quality', leadQuality)
  app.use('/v1/attorney-profile', attorneyProfile)
  app.use('/v1/attorney-register', attorneyRegister)
  app.use('/v1/medical-providers', medicalProviders)
  app.use('/v1/evidence', evidence)
  app.use('/v1/consent', consent)
  app.use('/v1/chatgpt', chatgpt)
  app.use('/v1/auth', oauth)
  app.use('/v1/assessments', assessments)
  app.use('/v1/rose', rose)
  app.use('/v1/case-insights', caseInsights)
  app.use('/v1/case-routing', caseRouting)
  app.use('/v1/files', files)
  app.use('/v1/predict', predict)
  app.use('/v1/attorneys', attorneys)
  app.use('/v1/intros', intros)
  app.use('/v1/demands', demands)
  app.use('/v1/sol', sol)
  app.use('/v1/notify', notifications)
  app.use('/v1/sms', smsWebhook)
  app.use('/v1/admin', admin)
  app.use('/v1/admin/communications', adminCommunications)
  app.use('/v1/support-tickets', supportTickets)
  app.use('/v1/firm-dashboard', firmDashboard)
  app.use('/v1/tier-routing', tierRouting)
  app.use('/v1/feature-toggles', featureToggles)
  app.use('/v1/compliance', compliance)
  app.use('/v1/attorney-calendar', attorneyCalendar)

  app.get('/', (req, res) => {
    res.json({
      name: 'Injury Intelligence API',
      version: '1.0.0',
      status: 'healthy',
      endpoints: {
        auth: '/v1/auth',
        favorites: '/v1/favorites',
        appointments: '/v1/appointments',
        attorneyProfiles: '/v1/attorney-profiles',
        messaging: '/v1/messaging',
        caseTracker: '/v1/case-tracker',
        aiCopilot: '/v1/ai-copilot',
        financing: '/v1/financing',
        recoveryHub: '/v1/recovery-hub',
        smartRecommendations: '/v1/smart-recommendations',
        verification: '/v1/verification',
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
