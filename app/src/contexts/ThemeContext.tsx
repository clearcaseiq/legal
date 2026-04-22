import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'cciq-theme-workspace'

type ThemePreference = 'light' | 'dark'

function isWorkspacePath(pathname: string) {
  return (
    pathname.startsWith('/attorney-dashboard') ||
    pathname.startsWith('/attorney-profile') ||
    pathname.startsWith('/attorney-preferences') ||
    pathname.startsWith('/firm-dashboard') ||
    pathname.startsWith('/lead-quality') ||
    pathname.startsWith('/medical-providers') ||
    pathname.startsWith('/admin')
  )
}

type ThemeContextValue = {
  /** Effective dark mode (false on marketing / plaintiff pages). */
  darkMode: boolean
  /** Persisted preference; only applied on workspace routes. */
  preference: ThemePreference
  setPreference: (t: ThemePreference) => void
  toggle: () => void
  showWorkspaceThemeToggle: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'light'
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' ? 'dark' : 'light'
  })

  const showWorkspaceThemeToggle = isWorkspacePath(pathname)
  const darkMode = showWorkspaceThemeToggle && preference === 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const setPreference = useCallback((t: ThemePreference) => {
    setPreferenceState(t)
    localStorage.setItem(STORAGE_KEY, t)
  }, [])

  const toggle = useCallback(() => {
    setPreference(preference === 'dark' ? 'light' : 'dark')
  }, [preference, setPreference])

  const value = useMemo(
    () => ({ darkMode, preference, setPreference, toggle, showWorkspaceThemeToggle }),
    [darkMode, preference, setPreference, toggle, showWorkspaceThemeToggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
