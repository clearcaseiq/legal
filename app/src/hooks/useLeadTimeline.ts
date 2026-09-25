import { useEffect, useState } from 'react'
import { getLeadCasePreparation } from '../lib/api'

type Timeline = { minMonths: number; maxMonths: number }

const cache = new Map<string, Promise<Timeline | null>>()

function fetchTimeline(leadId: string): Promise<Timeline | null> {
  let pending = cache.get(leadId)
  if (!pending) {
    pending = getLeadCasePreparation(leadId)
      .then((prep: any) => {
        const t = prep?.timeline
        return t && Number.isFinite(t.minMonths) && Number.isFinite(t.maxMonths) ? { minMonths: t.minMonths, maxMonths: t.maxMonths } : null
      })
      .catch(() => {
        cache.delete(leadId)
        return null
      })
    cache.set(leadId, pending)
  }
  return pending
}

/**
 * The case's expected timeline as "12–20 months" — the same server estimate the
 * claimant's report shows. Null until loaded or when unavailable.
 */
export function useLeadTimeline(leadId: string | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setLabel(null)
    if (!leadId) return
    void fetchTimeline(leadId).then((t) => {
      if (!cancelled && t) setLabel(`${t.minMonths}–${t.maxMonths} months`)
    })
    return () => {
      cancelled = true
    }
  }, [leadId])
  return label
}
