/**
 * Short-lived signed state tokens for CMS OAuth round-trips, mirroring the
 * calendar-sync pattern. Encodes which connection/firm initiated the flow so
 * the callback can attribute the returned tokens.
 */
import jwt from 'jsonwebtoken'
import { ENV } from '../../env'
import type { CmsProviderId } from './types'

export interface CmsOAuthState {
  provider: CmsProviderId
  lawFirmId: string
  attorneyId?: string | null
  userId?: string | null
}

export function signCmsState(payload: CmsOAuthState): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '15m' })
}

export function verifyCmsState(token: string): CmsOAuthState {
  return jwt.verify(token, ENV.JWT_SECRET) as CmsOAuthState
}
