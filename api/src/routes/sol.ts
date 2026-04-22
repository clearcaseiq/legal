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
    logger.error('Failed to calculate SOL', { error })
    if (error instanceof Error && error.message.includes('No SOL rule found')) {
      res.status(400).json({ error: error.message })
    } else {
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
