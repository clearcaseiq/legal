import Constants from 'expo-constants'

export type AppVariant = 'attorney' | 'plaintiff'

/**
 * Which branded build is running. Set at build time by APP_VARIANT in
 * app.config.js and surfaced through expo-constants `extra.appVariant`.
 * Defaults to 'attorney' so existing attorney builds are unaffected.
 */
export const APP_VARIANT: AppVariant =
  (Constants.expoConfig?.extra?.appVariant as AppVariant | undefined) === 'plaintiff'
    ? 'plaintiff'
    : 'attorney'

export const IS_PLAINTIFF_APP = APP_VARIANT === 'plaintiff'
export const IS_ATTORNEY_APP = APP_VARIANT === 'attorney'
