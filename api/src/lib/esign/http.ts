import type { Response } from 'express'
import { ESignNotConfiguredError } from './types'

/**
 * Turn an e-signature failure into a response.
 *
 * "Nobody has connected a provider to this server" is not a gateway failure and
 * should not read like one. Every send route used to answer 502 with the raw
 * exception text in `detail`, so a firm with no provider configured was told
 * `E-signature provider "dropbox_sign" is not configured on this server` — a
 * vendor id they never chose, phrased as an outage, with nothing to act on
 * (CP-436). Not-configured is now a 503 carrying the actionable message and a
 * `code` the UI can branch on; genuine provider errors keep their 502.
 */
export function respondESignError(res: Response, error: unknown) {
  if (error instanceof ESignNotConfiguredError) {
    return res.status(503).json({ error: error.message, code: 'esign_not_configured' })
  }
  const detail = error instanceof Error ? error.message : String(error)
  return res.status(502).json({ error: 'E-signature provider error', detail })
}
