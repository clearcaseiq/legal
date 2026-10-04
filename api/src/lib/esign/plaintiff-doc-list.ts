/**
 * Envelope titles are written for the firm ("HIPAA authorization — Jane Doe").
 * The plaintiff reading their own task doesn't need their name repeated, and a
 * packet of several envelopes should read as a sentence, not "A + B".
 *
 *   ["HIPAA authorization — Jane", "Retainer agreement — Jane"]
 *     -> "HIPAA authorization and retainer agreement"
 */
export function plaintiffSignatureDocList(titles: Array<string | null | undefined>): string {
  const names: string[] = []
  for (const raw of titles) {
    const name = String(raw ?? '').split(' — ')[0].trim()
    if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) names.push(name)
  }
  if (names.length === 0) return 'documents'
  const parts = names.map((name, i) => (i === 0 ? name : lowerFirstWord(name)))
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

/** "Retainer agreement" -> "retainer agreement"; acronyms like "HIPAA" stay. */
function lowerFirstWord(name: string): string {
  const first = name.split(/\s/)[0]
  if (first.length > 1 && first === first.toUpperCase()) return name
  return name.charAt(0).toLowerCase() + name.slice(1)
}
