import { Router } from 'express'
import { z } from 'zod'
import { optionalAuthMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { extractIncidentDetails } from '../lib/incident-extraction'

const router = Router()

const ExtractRequest = z.object({
  narrative: z.string().min(1).max(6000),
  injuryType: z.string().max(64).optional(),
})

// POST /v1/incident-extraction
// Best-effort: turns a free-text narrative into structured incident facts the
// claimant can confirm. Returns { extraction: null } when unavailable so the
// client can silently fall back to the manual form.
router.post('/', optionalAuthMiddleware, async (req, res) => {
  const parsed = ExtractRequest.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  try {
    const extraction = await extractIncidentDetails(parsed.data)
    return res.json({ extraction })
  } catch (error: any) {
    logger.error('incident-extraction route failed', { error: error?.message })
    return res.json({ extraction: null })
  }
})

export default router
