import { ENV } from '../env'

/** Emails allowed to use admin API routes and admin login (same list as ADMIN_EMAILS). */
export function isAdminEmail(email: string): boolean {
  const list = (ENV.ADMIN_EMAILS ?? 'admin@caseiq.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}
