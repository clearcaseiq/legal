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
    buildNumber: '24',
    versionCode: 7,
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

// Plaintiff build prefers its own branding in assets/plaintiff/, falling back to
// the shared attorney assets so day-to-day dev builds never break. A release
// build refuses the fallback — see the guards below.
const brandingFallbacks = []

function variantAsset(file) {
  if (APP_VARIANT === 'plaintiff') {
    const plaintiffPath = path.join(__dirname, 'assets', 'plaintiff', file)
    if (existsSync(plaintiffPath)) return `./assets/plaintiff/${file}`
    brandingFallbacks.push(file)
  }
  return `./assets/${file}`
}

const iconPath = variantAsset('icon.png')
const splashPath = variantAsset('splash-icon.png')
const adaptiveIconPath = variantAsset('adaptive-icon.png')

/**
 * Release-only readiness checks.
 *
 * Both of the things guarded here used to degrade in silence: a missing Firebase
 * file produced an Android build whose push notifications simply never arrived,
 * and a plaintiff build with no branding shipped under the attorney's icon. Each
 * looks like a successful build, so nobody finds out until the app is in front
 * of a user. EAS sets these two variables only during a cloud build, which is
 * what keeps `expo start` and local runs unaffected.
 */
const BUILD_PROFILE = process.env.EAS_BUILD_PROFILE || ''
const BUILD_PLATFORM = process.env.EAS_BUILD_PLATFORM || ''
const IS_RELEASE_BUILD = BUILD_PROFILE.startsWith('production')

function refuseRelease(problem, fix) {
  throw new Error(
    `Refusing to build ${variant.name} on profile "${BUILD_PROFILE}".\n` +
      `  Problem: ${problem}\n` +
      `  Fix:     ${fix}`
  )
}

if (IS_RELEASE_BUILD && BUILD_PLATFORM === 'android' && !hasGoogleServices) {
  refuseRelease(
    'google-services.json is missing, so the build has no FCM configuration and push notifications would never be delivered.',
    'Download the file from the Firebase console for this package name and place it at apps/mobile/google-services.json (see PUSH_NOTIFICATIONS_SETUP.md).'
  )
}

if (IS_RELEASE_BUILD && APP_VARIANT === 'plaintiff' && brandingFallbacks.length > 0) {
  refuseRelease(
    `the claimant app has no branding of its own (${brandingFallbacks.join(', ')}), so it would ship under the attorney app's icon and splash.`,
    'Add the claimant artwork to apps/mobile/assets/plaintiff/, or build a non-production profile while the variant is still in progress.'
  )
}

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
