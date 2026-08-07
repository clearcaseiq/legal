import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * True when the current route is rendered on the server (SEO landing pages).
 * The rest of the app still mounts client-only, so components need to know
 * which mode they are in before reading browser-only state during render.
 */
const ServerRenderedContext = createContext(false)

export function ServerRenderedProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <ServerRenderedContext.Provider value={value}>{children}</ServerRenderedContext.Provider>
}

export function useServerRendered() {
  return useContext(ServerRenderedContext)
}

/** False on the server and during the hydration render, true once mounted. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}

/**
 * Whether it is safe to read localStorage-backed state during render.
 *
 * On server-rendered routes this stays false until hydration finishes, so the
 * server markup and the first client render agree; the real values are picked
 * up on the next commit. Client-only routes are unaffected and read the values
 * immediately, so nothing flashes there.
 */
export function useBrowserStateReady() {
  const serverRendered = useServerRendered()
  const hydrated = useHydrated()
  if (typeof window === 'undefined') return false
  return serverRendered ? hydrated : true
}
