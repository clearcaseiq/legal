import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAttorneyDashboard,
  getAttorneyProfilePerformance,
  getMyAttorneyProfile,
  updateAttorneyProfile,
} from '../../lib/api'
import { invalidateAttorneyDashboardSummary } from '../../hooks/useAttorneyDashboardSummary'
import {
  normalizeAttorneyProfile,
  toProfileUpdatePayload,
  type AttorneyProfileModel,
} from './attorneyProfileModel'

/**
 * Keep the cached `attorney` blob the site header renders from in step with a
 * renamed profile, then tell the header to re-read it.
 */
function syncStoredAttorneyName(name: string | null | undefined) {
  const trimmed = (name || '').trim()
  if (!trimmed || typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem('attorney')
    const stored = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    if (stored.name === trimmed) return
    window.localStorage.setItem('attorney', JSON.stringify({ ...stored, name: trimmed }))
    window.dispatchEvent(new Event('clearcaseiq:user-updated'))
  } catch {
    /* a malformed or unavailable cache is not worth failing a successful save */
  }
}

export type AttorneyPerformance = {
  leadMetrics?: {
    totalLeads?: number
    acceptanceRate?: number
    conversionRate?: number
    overallConversionRate?: number
  }
  financialMetrics?: {
    feesCollectedFromPayments?: number
    averageFee?: number
    platformSpend?: number
    roi?: number
  }
  reviews?: {
    totalReviews?: number
    averageRating?: number
  }
}

export type AttorneyDashboardSnapshot = {
  recentLeads?: Array<{ status?: string; submittedAt?: string }>
  activeCases?: {
    contacted?: number
    consultScheduled?: number
    retained?: number
    closed?: number
  }
  dashboard?: {
    totalLeadsReceived?: number
    totalLeadsAccepted?: number
    feesCollectedFromPayments?: number
  }
}

const REFRESH_INTERVAL_MS = 30000

/**
 * Loads the attorney profile and saves it back through a single path.
 *
 * `saveProfile(patch)` always sends the whole profile with the patch applied.
 * Anything the caller omits is written back as it was read, which is what keeps
 * one section of the page from clearing another section's fields.
 */
export function useAttorneyProfileModel() {
  const [profile, setProfile] = useState<AttorneyProfileModel | null>(null)
  const [performance, setPerformance] = useState<AttorneyPerformance | null>(null)
  const [dashboard, setDashboard] = useState<AttorneyDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  // The background refresh must not clobber a save that is still in flight.
  // Unsaved edits are the tabs' concern: each holds its own draft and ignores
  // an incoming server copy while it is dirty.
  const savingRef = useRef(saving)
  savingRef.current = saving

  /** Performance overrides a few profile counters, which are cached and can lag. */
  const applyPerformance = useCallback(
    (model: AttorneyProfileModel, perf: AttorneyPerformance | null): AttorneyProfileModel => {
      if (!perf) return model
      const next = { ...model }
      if (perf.reviews) {
        next.totalReviews = Number(perf.reviews.totalReviews ?? next.totalReviews)
        next.averageRating = Number(perf.reviews.averageRating ?? next.averageRating)
      }
      if (perf.leadMetrics) {
        next.totalCases = Number(perf.leadMetrics.totalLeads ?? next.totalCases)
        next.successRate = Number(perf.leadMetrics.conversionRate ?? next.successRate)
      }
      if (perf.financialMetrics) {
        next.totalSettlements = Number(
          perf.financialMetrics.feesCollectedFromPayments ?? next.totalSettlements,
        )
        next.averageSettlement = Number(perf.financialMetrics.averageFee ?? next.averageSettlement)
      }
      return next
    },
    [],
  )

  const load = useCallback(
    async ({ initial }: { initial: boolean }) => {
      try {
        if (initial) setLoading(true)
        else setRefreshing(true)
        const [profileData, performanceData, dashboardData] = await Promise.all([
          getMyAttorneyProfile(),
          getAttorneyProfilePerformance({ period: 'monthly' }).catch(() => null),
          getAttorneyDashboard().catch(() => null),
        ])
        setProfile(applyPerformance(normalizeAttorneyProfile(profileData), performanceData))
        setPerformance(performanceData)
        setDashboard(dashboardData as unknown as AttorneyDashboardSnapshot | null)
        setLastUpdatedAt(new Date())
        setError(null)
      } catch (err: any) {
        console.error('Failed to load attorney profile:', err)
        setError(err?.response?.data?.error || 'Failed to load your attorney profile.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [applyPerformance],
  )

  useEffect(() => {
    void load({ initial: true })
    const intervalId = window.setInterval(() => {
      if (savingRef.current) return
      void load({ initial: false })
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [load])

  useEffect(() => {
    if (!saveSuccess) return
    const timer = setTimeout(() => setSaveSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [saveSuccess])

  const saveProfile = useCallback(
    async (patch?: Partial<AttorneyProfileModel>): Promise<boolean> => {
      if (!profile) return false
      const next = patch ? { ...profile, ...patch } : profile
      try {
        setSaving(true)
        setError(null)
        const updated = await updateAttorneyProfile(toProfileUpdatePayload(next))
        const savedProfile = applyPerformance(normalizeAttorneyProfile(updated), performance)
        setProfile(savedProfile)
        setLastUpdatedAt(new Date())
        setSaveSuccess(true)
        // The dashboard header reads the name from a separately cached summary;
        // refresh it so a renamed attorney updates without a full page reload (#66).
        invalidateAttorneyDashboardSummary()
        // The site header reads the cached `attorney` blob written at sign-in,
        // which no save touched — so a rename showed on this page while every
        // other screen kept the old name until the next login. Update it here
        // and fire the event the header already listens for.
        syncStoredAttorneyName(savedProfile.attorney?.name)
        return true
      } catch (err: any) {
        console.error('Failed to save attorney profile:', err)
        setError(err?.response?.data?.error || err?.message || 'Failed to save profile changes.')
        return false
      } finally {
        setSaving(false)
      }
    },
    [applyPerformance, performance, profile],
  )

  return {
    dashboard,
    error,
    lastUpdatedAt,
    loading,
    performance,
    profile,
    refreshing,
    reload: load,
    saveProfile,
    saveSuccess,
    saving,
    setError,
    setProfile,
  }
}
