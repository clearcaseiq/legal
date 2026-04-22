# Push Notifications Setup

This guide walks through enabling push notifications for the CaseIQ Attorney app.

> **Quick start:** Run `pnpm run setup:push:all` from `apps/mobile` to run the guided setup (opens browser for logins).

## Step 1: Create EAS Project (projectId)

**If you get "GraphQL request failed":** Usually a temporary Expo server or network issue. Try:
- Wait a few minutes and retry
- `eas logout` then `eas login`
- Different network (e.g. disable VPN)
- **Manual fallback:** Create project at [expo.dev](https://expo.dev) → Your projects → Create → copy the project ID → add to `apps/mobile/.env`: `EXPO_PUBLIC_PROJECT_ID=your-uuid`

**One-time:** Log in to Expo (browser will open):
```bash
cd apps/mobile
pnpm exec eas login
```

Then initialize the project:

1. Log in (if not already): `pnpm exec eas login`

2. Initialize EAS and link your project:
   ```bash
   pnpm exec eas init
   ```
   This creates an EAS project, adds `projectId` to your config, and creates/updates `eas.json`.

4. Alternatively, set `projectId` manually: add `EXPO_PUBLIC_PROJECT_ID=your-project-uuid` to `.env` in `apps/mobile/`.

## Step 2: Create Development Build

Use a development build instead of Expo Go (push notifications are not supported in Expo Go on SDK 53+).

**Option A: Build locally**
```bash
cd apps/mobile
pnpm exec expo run:android
# or
pnpm exec expo run:ios
```
Requires Android Studio (Android) or Xcode (iOS).

**Option B: Build with EAS (cloud)**
```bash
cd apps/mobile
pnpm exec eas build --profile development --platform android
# or for iOS
pnpm exec eas build --profile development --platform ios
```
Then install the generated APK/IPA on your device.

## Step 3: Configure Credentials

### Android (FCM)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).

2. Add an Android app with package name: `com.caseiq.attorney`

3. Download `google-services.json` and place it in `apps/mobile/google-services.json`.

4. Create a Service Account for FCM:
   - Firebase Console → Project settings → Service accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely (add to `.gitignore`)

5. Upload FCM credentials to EAS:
   ```bash
   cd apps/mobile
   pnpm exec eas credentials
   ```
   Select: Android → production (or development) → Google Service Account → Upload the JSON key.

### iOS (APNs)

EAS Build can automatically manage APNs credentials when you build for iOS. No manual setup needed if using EAS Build.

For local builds, you need:
- Apple Developer account
- Push Notifications capability enabled in Xcode
- APNs key or certificate uploaded to EAS: `pnpm exec eas credentials` → iOS

## Testing

1. Start the dev server: `pnpm start`
2. Open the development build on a physical device (push doesn't work on simulators).
3. Log in and grant notification permission.
4. Use [Expo Push Notifications Tool](https://expo.dev/notifications) to send a test notification using the device's push token.
