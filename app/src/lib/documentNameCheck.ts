/**
 * Client-side twin of the API's `compareToClaimant` (claimant-identity-check.ts):
 * two names match when they share any significant token. Deliberately lax so a
 * maiden name or a nickname never raises a warning — only a document naming an
 * entirely different person does.
 */
const NAME_NOISE = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
  'jr', 'sr', 'ii', 'iii', 'iv', 'v',
  'md', 'do', 'rn', 'lpn', 'np', 'pa', 'dds', 'phd', 'esq',
])

export function nameTokens(name: string | null | undefined): string[] {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !NAME_NOISE.has(token))
}

/** True only when both names are readable and share no significant token. */
export function namesConflict(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = nameTokens(a)
  const right = nameTokens(b)
  if (left.length === 0 || right.length === 0) return false
  return !left.some((token) => right.includes(token))
}

/** The signed-in plaintiff's full name, or '' for guests and other roles. */
export function storedPlaintiffName(): string {
  if (typeof window === 'undefined') return ''
  try {
    if (!localStorage.getItem('auth_token')) return ''
    const user = JSON.parse(localStorage.getItem('user') || 'null') as
      | { firstName?: string; lastName?: string; role?: string }
      | null
    if (!user || (user.role && !['client', 'plaintiff'].includes(user.role.toLowerCase()))) return ''
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  } catch {
    return ''
  }
}
