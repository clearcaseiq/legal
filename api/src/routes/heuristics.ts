import { Router } from 'express'
import { getHeuristics } from '../lib/heuristics-config'
import { getMatchingRules, getQualityGateOptions } from '../lib/matching-rules-config'
import { logger } from '../lib/logger'

const router = Router()

/**
 * Public, read-only heuristics. These are non-sensitive display thresholds
 * (case-strength bands, acceptance/response labels, etc.) that the web app uses
 * to render consistent labels. Editing happens via the admin endpoints.
 *
 * Also exposes the lead-response SLA window (derived from the admin-configured
 * attorney quality gate) so clients can render a consistent "respond within Xh"
 * countdown without coupling to the private matching-rules endpoint.
 */
router.get('/', async (_req, res) => {
  try {
    const [config, matchingRules] = await Promise.all([getHeuristics(), getMatchingRules()])
    const responseSlaHours = getQualityGateOptions(matchingRules).maxResponseTimeHours
    res.json({ ...config, responseSlaHours })
  } catch (error: any) {
    logger.error('Failed to load heuristics', { error: error?.message })
    res.status(500).json({ error: 'Failed to load heuristics' })
  }
})

export default router
