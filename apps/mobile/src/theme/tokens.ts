/**
 * ClearCaseIQ Attorney mobile — design tokens.
 */
export const brand = {
  displayName: 'ClearCaseIQ',
  displayNameAttorney: 'ClearCaseIQ Attorney',
} as const

export const colors = {
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
  /** Inputs on dark login screen */
  loginFieldBg: 'rgba(255,255,255,0.08)',
  loginFieldBorder: 'rgba(255,255,255,0.12)',
} as const

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
