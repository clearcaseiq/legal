/**
 * Expo app config. projectId is set when you run `eas init` (links to EAS project).
 * For push notifications, set EXPO_PUBLIC_PROJECT_ID in .env
 */
const { existsSync, readFileSync } = require('fs')
const path = require('path')

const hasGoogleServices = existsSync(path.join(__dirname, 'google-services.json'))

// projectId from env, or from app.json (set by `eas init`), or EAS-created project
let projectId =
  process.env.EXPO_PUBLIC_PROJECT_ID ||
  '01675e85-c537-4222-b5f1-1483b73f3591'
if (!projectId) {
  try {
    const appJsonPath = path.join(__dirname, 'app.json')
    if (existsSync(appJsonPath)) {
      const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'))
      projectId = appJson.expo?.extra?.eas?.projectId
    }
  } catch (e) {}
}

module.exports = {
  expo: {
    name: 'ClearCaseIQ Attorney',
    slug: 'caseiq-attorney',
    version: '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    userInterfaceStyle: 'automatic',
    scheme: 'caseiq',
    splash: { backgroundColor: '#1e3a5f' },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.caseiq.attorney',
      infoPlist: {
        NSFaceIDUsageDescription: 'Use Face ID to sign in to ClearCaseIQ',
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      adaptiveIcon: { backgroundColor: '#0c1929' },
      package: 'com.caseiq.attorney',
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
