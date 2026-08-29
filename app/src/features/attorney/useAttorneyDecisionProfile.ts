import { useCallback, useEffect, useState } from 'react'
import { getAttorneyDecisionProfile, saveAttorneyDecisionProfile } from '../../lib/api'

/**
 * The attorney's negotiation style and risk tolerance.
 *
 * Split out of `useAttorneyDecisionSupport`, whose loader is gated on a selected
 * lead. That gate is correct for the per-case decision tools it also owns, but
 * it meant the settings screen -- which never has a lead selected -- rendered
 * both dropdowns empty no matter what was stored, and saving from there wrote
 * whatever the empty form held. Loading unconditionally is the whole point of
 * this copy.
 */
export function useAttorneyDecisionProfile() {
  const [negotiationStyle, setNegotiationStyle] = useState('')
  const [riskTolerance, setRiskTolerance] = useState('')
  const [decisionProfileLoading, setDecisionProfileLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setDecisionProfileLoading(true)
        const profile = await getAttorneyDecisionProfile()
        if (cancelled) return
        setNegotiationStyle(profile?.negotiationStyle || '')
        setRiskTolerance(profile?.riskTolerance || '')
      } catch (err) {
        console.error('Failed to load decision profile:', err)
      } finally {
        if (!cancelled) setDecisionProfileLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveDecisionProfile = useCallback(async () => {
    try {
      setDecisionProfileLoading(true)
      const saved = await saveAttorneyDecisionProfile({
        negotiationStyle: negotiationStyle || undefined,
        riskTolerance: riskTolerance || undefined,
      })
      setNegotiationStyle(saved?.negotiationStyle || negotiationStyle)
      setRiskTolerance(saved?.riskTolerance || riskTolerance)
    } catch (err) {
      console.error('Failed to save decision profile:', err)
    } finally {
      setDecisionProfileLoading(false)
    }
  }, [negotiationStyle, riskTolerance])

  return {
    decisionProfileLoading,
    handleSaveDecisionProfile,
    negotiationStyle,
    riskTolerance,
    setNegotiationStyle,
    setRiskTolerance,
  }
}
