import { ZIP_TO_COUNTIES } from './zip-county.generated'

export type ZipCounty = { state: string; county: string }

/**
 * Counties a ZIP code falls in, largest share of its land area first. Empty for
 * a malformed or unknown ZIP. More than one entry means the ZIP crosses a county
 * line and the claimant has to choose.
 */
export function countiesForZip(input: string): ZipCounty[] {
  const zip = String(input ?? '').trim().slice(0, 5)
  if (!/^\d{5}$/.test(zip)) return []
  const raw = ZIP_TO_COUNTIES[zip]
  if (!raw) return []
  return raw.split(';').map((pair) => {
    const [state, county] = pair.split('|')
    return { state, county }
  })
}
