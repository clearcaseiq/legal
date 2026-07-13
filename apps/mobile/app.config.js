/**
 * Expo app config. projectId is set when you run `eas init` (links to EAS project).
 * For push notifications, set EXPO_PUBLIC_PROJECT_ID in .env
 */
const { existsSync, readFileSync } = require('fs')
const path = require('path')

const hasGoogleServices = existsSync(path.join(__dirname, 'google-services.json'))

// projectId resolution order: env -> app.json (set by `eas init`) -> known EAS fallback.
function resolveProjectId() {
  if (process.env.EXPO_PUBLIC_PROJECT_ID) return process.env.EXPO_PUBLIC_PROJECT_ID
  try {
    const appJsonPath = path.join(__dirname, 'app.json')
    if (existsSync(appJsonPath)) {
      const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'))
      if (appJson.expo?.extra?.eas?.projectId) return appJson.expo.extra.eas.projectId
    }
  } catch (e) {}
  return '01675e85-c537-4222-b5f1-1483b73f3591'
}

const projectId = resolveProjectId()

module.exports = {
  expo: {
    name: 'ClearCaseIQ Attorney',
    slug: 'caseiq-attorney',
    version: '1.0.2',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    userInterfaceStyle: 'automatic',
    scheme: 'caseiq',
    privacy: 'unlisted',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      icon: './assets/icon.png',
      supportsTablet: false,
      bundleIdentifier: 'com.caseiq.attorney',
      buildNumber: '18',
      infoPlist: {
        NSFaceIDUsageDescription: 'Use Face ID to sign in to ClearCaseIQ',
        UIBackgroundModes: ['remote-notification'],
        ITSAppUsesNonExemptEncryption: false,
        UIDeviceFamily: [1],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.caseiq.attorney',
      versionCode: 5,
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
          color: '#0c1929',
          sounds: [],
          defaultChannel: 'default',
        },
      ],
    ],
    extra: {
      eas: {
        projectId,
      },
    },
  },
}
