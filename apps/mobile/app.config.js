/**
 * Expo app config. Ships TWO branded apps from one codebase via APP_VARIANT:
 *   APP_VARIANT=attorney (default) -> "ClearCaseIQ Attorney" (com.caseiq.attorney)
 *   APP_VARIANT=plaintiff           -> "ClearCaseIQ"          (com.caseiq.client)
 *
 * projectId is set when you run `eas init` (links to EAS project).
 * For push notifications, set EXPO_PUBLIC_PROJECT_ID in .env.
 */
const { existsSync, readFileSync } = require('fs')
const path = require('path')

const hasGoogleServices = existsSync(path.join(__dirname, 'google-services.json'))

const APP_VARIANT = process.env.APP_VARIANT === 'plaintiff' ? 'plaintiff' : 'attorney'

const VARIANTS = {
  attorney: {
    name: 'ClearCaseIQ Attorney',
    slug: 'caseiq-attorney',
    scheme: 'caseiq',
    version: '1.0.3',
    bundleIdentifier: 'com.caseiq.attorney',
    androidPackage: 'com.caseiq.attorney',
    buildNumber: '22',
    versionCode: 6,
    fallbackProjectId: '01675e85-c537-4222-b5f1-1483b73f3591',
    notificationColor: '#0c1929',
  },
  plaintiff: {
    name: 'ClearCaseIQ',
    slug: 'caseiq-client',
    scheme: 'caseiqclient',
    version: '1.0.0',
    bundleIdentifier: 'com.caseiq.client',
    androidPackage: 'com.caseiq.client',
    buildNumber: '1',
    versionCode: 1,
    // EAS project @srid220/caseiq-client (created via `eas init`).
    fallbackProjectId: 'afbd7eb3-b93c-4c46-9e1f-e26e47bc33bc',
    notificationColor: '#0c1929',
  },
}

const variant = VARIANTS[APP_VARIANT]

// Plaintiff build prefers its own branding in assets/plaintiff/, but falls back
// to the shared assets until those PNGs are added (so builds never break).
function variantAsset(file) {
  if (APP_VARIANT === 'plaintiff') {
    const plaintiffPath = path.join(__dirname, 'assets', 'plaintiff', file)
    if (existsSync(plaintiffPath)) return `./assets/plaintiff/${file}`
  }
  return `./assets/${file}`
}

const iconPath = variantAsset('icon.png')
const splashPath = variantAsset('splash-icon.png')
const adaptiveIconPath = variantAsset('adaptive-icon.png')

// projectId resolution order: env -> app.json (attorney only) -> per-variant fallback.
function resolveProjectId() {
  if (process.env.EXPO_PUBLIC_PROJECT_ID) return process.env.EXPO_PUBLIC_PROJECT_ID
  if (APP_VARIANT === 'attorney') {
    try {
      const appJsonPath = path.join(__dirname, 'app.json')
      if (existsSync(appJsonPath)) {
        const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'))
        if (appJson.expo?.extra?.eas?.projectId) return appJson.expo.extra.eas.projectId
      }
    } catch (e) {}
  }
  return variant.fallbackProjectId
}

const projectId = resolveProjectId()

module.exports = {
  expo: {
    name: variant.name,
    slug: variant.slug,
    version: variant.version,
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    userInterfaceStyle: 'automatic',
    scheme: variant.scheme,
    privacy: 'unlisted',
    icon: iconPath,
    splash: {
      image: splashPath,
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      icon: iconPath,
      supportsTablet: false,
      bundleIdentifier: variant.bundleIdentifier,
      buildNumber: variant.buildNumber,
      infoPlist: {
        NSFaceIDUsageDescription: 'Use Face ID to sign in to ClearCaseIQ',
        UIBackgroundModes: ['remote-notification'],
        ITSAppUsesNonExemptEncryption: false,
        UIDeviceFamily: [1],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIconPath,
        backgroundColor: '#ffffff',
      },
      package: variant.androidPackage,
      versionCode: variant.versionCode,
      permissions: ['USE_BIOMETRIC', 'USE_FINGERPRINT', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
      ...(hasGoogleServices && { googleServicesFile: './google-services.json' }),
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ['expo-local-authentication', { faceIDPermission: 'Use Face ID to sign in to ClearCaseIQ' }],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow ClearCaseIQ to access your photos so you can upload injury pictures and case documents.',
          cameraPermission: 'Allow ClearCaseIQ to use your camera so you can take injury photos or scan records directly in the app.',
        },
      ],
      [
        'expo-notifications',
        {
          color: variant.notificationColor,
          sounds: [],
          defaultChannel: 'default',
        },
      ],
    ],
    extra: {
      appVariant: APP_VARIANT,
      eas: {
        projectId,
      },
    },
  },
}
