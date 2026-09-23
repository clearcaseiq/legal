import { Router } from 'express'
import { countiesForZip } from '../lib/zip-county'

const router = Router()

/**
 * GET /v1/geo/zip/:zip
 * The state and counties for a ZIP code, so intake can ask for a ZIP instead of
 * a county. Public: the data is the Census relationship file.
 */
router.get('/zip/:zip', (req, res) => {
  const counties = countiesForZip(req.params.zip)
  if (counties.length === 0) {
    return res.status(404).json({ error: 'Unknown ZIP code' })
  }
  res.set('Cache-Control', 'public, max-age=86400')
  res.json({ zip: req.params.zip.trim().slice(0, 5), state: counties[0].state, counties })
})

export default router
