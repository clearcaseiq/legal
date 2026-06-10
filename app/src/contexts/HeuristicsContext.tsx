import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_HEURISTICS, type HeuristicsConfig } from '../lib/heuristics'
import { getHeuristics } from '../lib/api'

type HeuristicsContextValue = {
  heuristics: HeuristicsConfig
  loaded: boolean
}

const HeuristicsContext = createContext<HeuristicsContextValue>({
  heuristics: DEFAULT_HEURISTICS,
  loaded: false,
})

export function HeuristicsProvider({ children }: { children: ReactNode }) {
  const [heuristics, setHeuristics] = useState<HeuristicsConfig>(DEFAULT_HEURISTICS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getHeuristics()
      .then((config) => {
        if (!cancelled && config) setHeuristics(config)
      })
      .catch(() => {
        // Keep defaults if the endpoint is unavailable.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ heuristics, loaded }), [heuristics, loaded])

  return <HeuristicsContext.Provider value={value}>{children}</HeuristicsContext.Provider>
}

export function useHeuristics(): HeuristicsConfig {
  return useContext(HeuristicsContext).heuristics
}
