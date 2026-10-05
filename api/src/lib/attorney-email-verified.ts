import { prisma } from './prisma'

/**
 * Whether each attorney's login account has confirmed its email address.
 *
 * Distinct from `Attorney.isVerified`, which is the credential/vetting gate for
 * routing: this only says the signup address was confirmed. Attorneys with no
 * login account (bulk directory imports) are absent from the map, so callers
 * treat them as not email-verified rather than as a failure.
 */
export async function emailVerifiedByAttorneyId(
  attorneys: Array<{ id: string; email?: string | null }>,
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
  const emails = [
    ...new Set(
      attorneys.map((a) => a.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e)),
    ),
  ]
  if (!emails.length) return result
  const users = await prisma.user.findMany({
    where: { email: { in: emails, mode: 'insensitive' }, role: 'attorney' },
    select: { email: true, emailVerified: true },
  })
  const byEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u.emailVerified]))
  for (const a of attorneys) {
    const email = a.email?.trim().toLowerCase()
    if (email && byEmail.has(email)) result.set(a.id, byEmail.get(email) === true)
  }
  return result
}

export async function isAttorneyEmailVerified(attorney: { id: string; email?: string | null }): Promise<boolean> {
  return (await emailVerifiedByAttorneyId([attorney])).get(attorney.id) === true
}
