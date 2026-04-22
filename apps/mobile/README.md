# ClearCaseIQ Attorney Mobile App

Expo (React Native) app for iOS and Android: **dashboard**, **case inbox**, **accept / decline** with structured decline reasons (aligned with web routing).

## Features

- **Home tab** – Pipeline stats, unread messages summary, review queue
- **Cases tab** – All leads or **Needs review** filter, pull-to-refresh, open case detail
- **Account tab** – Profile, sign out
- **Case detail** – Venue, plaintiff, evidence count, viability, narrative snippet; **Accept** with confirm; **Decline** sheet with same reason codes as web
- **Haptics** – Light feedback on accept / decline
- **Biometric login** – After first password sign-in
- **Safe areas** – Home indicator–aware bottom actions on case screen
- **Push** – Scaffold in `NotificationContext` (wire token to your API)

## Setup

1. **Install**
   ```bash
   cd apps/mobile && pnpm install
   ```

2. **API URL** – Copy `.env.example` to `.env`. On a **physical device**, use your PC’s LAN IP (e.g. `http://192.168.1.50:4000`), not `localhost`.

3. **Run**
   ```bash
   pnpm start
   ```
   Or from repo root: `pnpm mobile`

## Project structure

```
app/
  _layout.tsx              # SafeAreaProvider, auth, notifications
  index.tsx                # → login or app tabs
  (auth)/login.tsx
  (app)/
    _layout.tsx            # Stack: tabs + lead/[id]
    (tabs)/
      _layout.tsx          # Bottom tabs: Home, Cases, Account
      index.tsx            # Dashboard
      inbox.tsx            # Lead list + filters
      account.tsx
    lead/[id].tsx          # Detail + accept / decline
src/
  lib/api.ts
  lib/formatLead.ts
  theme/tokens.ts
  constants/declineReasons.ts
  contexts/...
```

## Next steps (backend / product)

- Register Expo push token per attorney and send notifications on new routes
- Deep link from notification to `/(app)/lead/:id`
- Optional: AsyncStorage cache + offline queue for decisions
