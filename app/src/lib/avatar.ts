const NAME_PREFIXES = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'hon'])
const NAME_SUFFIXES = new Set(['esq', 'esquire', 'jr', 'sr', 'ii', 'iii', 'iv', 'jd', 'phd', 'llm', 'md'])

/**
 * Initials for a placeholder avatar.
 *
 * Attorney names are commonly stored with an honorific ("Toya Marteen, Esq.").
 * ui-avatars derives its own initials from the first and last word, which turns
 * that into "TE" — the suffix instead of the surname — so callers compute the
 * initials here and hand ui-avatars the finished string instead of a full name.
 */
export function nameInitials(name: string): string {
  const words = name
    .split(/[\s,]+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .filter((word, index, all) => {
      const lower = word.toLowerCase()
      if (index === 0 && all.length > 1 && NAME_PREFIXES.has(lower)) return false
      if (index === all.length - 1 && all.length > 1 && NAME_SUFFIXES.has(lower)) return false
      return true
    })
  if (words.length === 0) return ''
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Placeholder avatar showing the attorney's real initials ("Jane Smith" -> "JS").
 * Passing the literal word "Attorney" made ui-avatars render the first two
 * letters of that single word, which is where the stray "AT" came from.
 */
export function fallbackAvatar(name?: string | null): string {
  const label = nameInitials((name || '').trim()) || 'A'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=e0f2fe&color=075985`
}
