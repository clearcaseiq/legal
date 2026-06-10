/**
 * Minimal `react-native` stub for vitest (node environment). The real package
 * ships Flow-typed source that the test transformer cannot parse, so unit tests
 * that pull in modules importing `react-native` (e.g. theme tokens) alias to this.
 * Only the surface actually touched at module-load time needs to exist here.
 */
export const Appearance = {
  getColorScheme: (): 'light' | 'dark' | null => 'light',
  addChangeListener: () => ({ remove: () => {} }),
}

export const Platform = {
  OS: 'ios' as const,
  select: <T,>(spec: { ios?: T; android?: T; default?: T }): T | undefined =>
    spec.ios ?? spec.default,
}

export const useColorScheme = (): 'light' | 'dark' | null => 'light'

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
}
