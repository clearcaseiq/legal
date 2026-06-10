/**
 * ClearCaseIQ Attorney mobile — design tokens.
 *
 * Dark mode: the palette is selected from the OS color scheme at launch via
 * `Appearance.getColorScheme()`. Because most screens build their styles with
 * `StyleSheet.create` at module load, the active palette is resolved once at
 * startup (it follows the system setting; switching the OS theme applies on the
 * next launch). New/dynamic UI can use `useColors()` for live updates.
 */
import { Appearance } from 'react-native'

export const brand = {
  displayName: 'ClearCaseIQ',
  displayNameAttorney: 'ClearCaseIQ Attorney',
} as const

export type ColorTokens = {
  nav: string
  navElevated: string
  navDeep: string
  surface: string
  card: string
  border: string
  text: string
  textSecondary: string
  muted: string
  primary: string
  primaryDark: string
  brandAccent: string
  success: string
  successMuted: string
  danger: string
  dangerMuted: string
  warning: string
  warningMuted: string
  accent: string
  loginBg: string
  loginBgElevated: string
  loginFieldBg: string
  loginFieldBorder: string
}

export const lightColors: ColorTokens = {
  nav: '#0f172a',
  navElevated: '#1e293b',
  /** Splash / login hero (aligns with app.config splash) */
  navDeep: '#0c1929',
  surface: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#64748b',
  muted: '#94a3b8',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  /** Wordmark “IQ” and highlights */
  brandAccent: '#22d3ee',
  success: '#059669',
  successMuted: '#d1fae5',
  danger: '#dc2626',
  dangerMuted: '#fef2f2',
  warning: '#d97706',
  warningMuted: '#fffbeb',
  accent: '#0891b2',
  /** Login hero background — rich professional navy (replaces near-black) */
  loginBg: '#0f294d',
  loginBgElevated: '#16386a',
  /** Inputs on dark login screen */
  loginFieldBg: 'rgba(255,255,255,0.08)',
  loginFieldBorder: 'rgba(255,255,255,0.12)',
}

export const darkColors: ColorTokens = {
  // Navigation stays deep navy in both themes (brand chrome).
  nav: '#0b1220',
  navElevated: '#111c2e',
  navDeep: '#0c1929',
  surface: '#0b1220',
  card: '#111827',
  border: '#1f2937',
  text: '#f1f5f9',
  textSecondary: '#9aa7b8',
  muted: '#64748b',
  primary: '#38bdf8',
  primaryDark: '#0ea5e9',
  brandAccent: '#22d3ee',
  success: '#34d399',
  successMuted: 'rgba(16,185,129,0.16)',
  danger: '#f87171',
  dangerMuted: 'rgba(239,68,68,0.16)',
  warning: '#fbbf24',
  warningMuted: 'rgba(245,158,11,0.16)',
  accent: '#22d3ee',
  loginBg: '#0f294d',
  loginBgElevated: '#16386a',
  loginFieldBg: 'rgba(255,255,255,0.08)',
  loginFieldBorder: 'rgba(255,255,255,0.14)',
}

export const initialColorScheme: 'light' | 'dark' = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'

export function getColorsForScheme(scheme: 'light' | 'dark' | null | undefined): ColorTokens {
  return scheme === 'dark' ? darkColors : lightColors
}

/**
 * Active palette, frozen at startup to the OS color scheme. Existing screens
 * import this directly, so they pick up dark mode with no per-screen changes.
 */
export const colors: ColorTokens = getColorsForScheme(initialColorScheme)

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const typography = {
  hero: { fontSize: 28, fontWeight: '800' as const },
  title: { fontSize: 22, fontWeight: '800' as const },
  section: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
} as const

/** Card elevation — use on primary surfaces */
export const shadows = {
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  soft: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
} as const
