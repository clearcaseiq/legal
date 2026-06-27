import { Router } from 'express'
import { calculateSOL, getSOLStatus } from '../lib/solRules'
import { logger } from '../lib/logger'
import { z } from 'zod'

const router = Router()

const SOLRequest = z.object({
  incidentDate: z.string(),
  venue: z.object({
    state: z.string(),
    county: z.string().optional()
  }),
  claimType: z.string()
})

// Calculate statute of limitations
router.post('/calculate', async (req, res) => {
  try {
    const parsed = SOLRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { incidentDate, venue, claimType } = parsed.data
    
    const result = calculateSOL(incidentDate, venue, claimType)
    const status = getSOLStatus(result.daysRemaining)
    
    logger.info('SOL calculated', { 
      venue: venue.state, 
      claimType, 
      daysRemaining: result.daysRemaining 
    })

    res.json({
      ...result,
      status,
      incident_date: incidentDate,
      venue,
      claim_type: claimType
    })
  } catch (error) {
    // "No SOL rule found" is an expected, handled condition (a venue/claim-type combo
    // we don't have a rule for) — return 400 and log at warn, not error, so it doesn't
    // pollute error monitoring. Anything else is a genuine server fault.
    if (error instanceof Error && error.message.includes('No SOL rule found')) {
      logger.warn('No SOL rule for requested venue/claim type', { message: error.message })
      res.status(400).json({
        // User-facing message: we only have statute-of-limitations rules for U.S.
        // states/DC, so anything else (e.g. an international jurisdiction) is
        // reported as unsupported rather than exposing the internal rule key.
        error: 'We currently calculate filing deadlines for U.S. states only. Please select a U.S. state to see your statute of limitations.',
        code: 'UNSUPPORTED_JURISDICTION',
      })
    } else {
      logger.error('Failed to calculate SOL', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// Get SOL rules for a state
router.get('/rules/:state', async (req, res) => {
  try {
    const { state } = req.params
    
    // Import SOL_RULES dynamically to avoid circular imports
    const { SOL_RULES } = await import('../lib/solRules')
    const rules = SOL_RULES[state.toUpperCase()]
    
    if (!rules) {
      return res.status(404).json({ error: `No SOL rules found for state ${state}` })
    }

    res.json({
      state: state.toUpperCase(),
      rules
    })
  } catch (error) {
    logger.error('Failed to get SOL rules', { error, state: req.params.state })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
