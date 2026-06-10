import React, { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { colors as frozenColors, getColorsForScheme, initialColorScheme, type ColorTokens } from '../theme/tokens'

type ThemeContextValue = {
  /** Palette frozen at launch — matches the static StyleSheets across screens. */
  colors: ColorTokens
  /** Live OS color scheme (may differ from `scheme` if the user toggled mid-session). */
  liveScheme: 'light' | 'dark'
  /** Scheme the static palette was built for at launch. */
  scheme: 'light' | 'dark'
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const live = useColorScheme()
  const liveScheme: 'light' | 'dark' = live === 'dark' ? 'dark' : 'light'

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: frozenColors,
      liveScheme,
      scheme: initialColorScheme,
      isDark: initialColorScheme === 'dark',
    }),
    [liveScheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Returns the active palette. Defaults to the launch-frozen palette so dynamic
 * components stay visually consistent with the rest of the app. Pass `live: true`
 * for chrome that can safely re-render on an OS theme change.
 */
export function useColors(opts?: { live?: boolean }): ColorTokens {
  const ctx = useContext(ThemeContext)
  if (!ctx) return frozenColors
  return opts?.live ? getColorsForScheme(ctx.liveScheme) : ctx.colors
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { colors: frozenColors, liveScheme: initialColorScheme, scheme: initialColorScheme, isDark: initialColorScheme === 'dark' }
  }
  return ctx
}
