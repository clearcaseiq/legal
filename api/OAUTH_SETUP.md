# OAuth Setup Guide

This guide explains how to set up Google and Apple OAuth authentication for the Injury Intelligence application, plus attorney calendar sync for Google Calendar and Microsoft Outlook.

## Google OAuth Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "Injury Intelligence"
   - User support email: your email
   - Developer contact information: your email
4. Add scopes: `../auth/userinfo.email` and `../auth/userinfo.profile`

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:4000/v1/auth/google/callback` (development)
   - `https://yourdomain.com/v1/auth/google/callback` (production)
5. Copy the Client ID and Client Secret

### 4. Environment Variables
Add these to your `.env` file:
```
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/v1/auth/google/callback"
```

## Google Calendar Sync Setup

### 1. Use the Same Google Cloud Project
1. Open the same Google Cloud project you used for Google login, or create a dedicated one for calendar sync.
2. Enable the Google Calendar API.

### 2. Add Calendar OAuth Scopes
Your OAuth consent screen must allow:
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`

### 3. Add Calendar Callback URI
Add these authorized redirect URIs to your Google OAuth client:
- `http://localhost:4000/v1/attorney-calendar/callback/google` (development)
- `https://yourdomain.com/v1/attorney-calendar/callback/google` (production)

### 4. Environment Variables
Add these to your API `.env` file:
```
GOOGLE_CALENDAR_CLIENT_ID="your-google-calendar-client-id"
GOOGLE_CALENDAR_CLIENT_SECRET="your-google-calendar-client-secret"
GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:4000/v1/attorney-calendar/callback/google"
GOOGLE_CALENDAR_WEBHOOK_URI="https://yourdomain.com/v1/attorney-calendar/webhooks/google"
```

Notes:
1. `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` can match your login OAuth app if you prefer.
2. `GOOGLE_CALENDAR_WEBHOOK_URI` must be a public `https://` URL in deployed environments. Google cannot post webhook events to `localhost`.

## Apple OAuth Setup

### 1. Apple Developer Account
1. Sign in to [Apple Developer Portal](https://developer.apple.com/)
2. Go to "Certificates, Identifiers & Profiles"

### 2. Create App ID
1. Go to "Identifiers" > "App IDs"
2. Create a new App ID
3. Enable "Sign In with Apple" capability
4. Note down the App ID (Client ID)

### 3. Create Service ID
1. Go to "Identifiers" > "Services IDs"
2. Create a new Service ID
3. Configure "Sign In with Apple"
4. Add domains and redirect URLs:
   - `http://localhost:4000/v1/auth/apple/callback` (development)
   - `https://yourdomain.com/v1/auth/apple/callback` (production)

### 4. Create Private Key
1. Go to "Keys"
2. Create a new key with "Sign In with Apple" enabled
3. Download the .p8 file
4. Note down the Key ID

### 5. Environment Variables
Add these to your `.env` file:
```
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_TEAM_ID="your-apple-team-id"
APPLE_KEY_ID="your-apple-key-id"
APPLE_PRIVATE_KEY="your-apple-private-key"
APPLE_REDIRECT_URI="http://localhost:4000/v1/auth/apple/callback"
```

## Microsoft Outlook Calendar Sync Setup

### 1. Register an App in Azure
1. Open the [Azure Portal](https://portal.azure.com/).
2. Go to "Microsoft Entra ID" > "App registrations".
3. Create or reuse a web app registration for ClearCaseIQ.

### 2. Add API Permissions
Grant these Microsoft Graph delegated permissions:
- `User.Read`
- `Calendars.Read`
- `Calendars.ReadWrite`
- `offline_access`

### 3. Add Calendar Callback URI
Add these redirect URIs to the app registration:
- `http://localhost:4000/v1/attorney-calendar/callback/microsoft` (development)
- `https://yourdomain.com/v1/attorney-calendar/callback/microsoft` (production)

### 4. Environment Variables
Add these to your API `.env` file:
```
MICROSOFT_CALENDAR_CLIENT_ID="your-microsoft-calendar-client-id"
MICROSOFT_CALENDAR_CLIENT_SECRET="your-microsoft-calendar-client-secret"
MICROSOFT_CALENDAR_REDIRECT_URI="http://localhost:4000/v1/attorney-calendar/callback/microsoft"
MICROSOFT_CALENDAR_WEBHOOK_URI="https://yourdomain.com/v1/attorney-calendar/webhooks/microsoft"
CALENDAR_WEBHOOK_RENEWAL_ENABLED="true"
CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS="900000"
```

Notes:
1. `MICROSOFT_CALENDAR_WEBHOOK_URI` must be a public `https://` URL.
2. The renewal loop refreshes expiring webhook subscriptions automatically; the default interval is 15 minutes.

## Frontend Configuration

### Environment Variables
Add to your frontend `.env` file:
```
NEXT_PUBLIC_API_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
```

## Testing

### Without OAuth Setup
If you haven't set up OAuth yet, you can still test the application using the traditional email/password login with the credentials:
- Email: `test@example.com`
- Password: `password123`

### With OAuth Setup
1. Make sure all environment variables are set
2. Restart both API and frontend servers
3. Visit the login page
4. Click "Continue with Google" or "Continue with Apple"
5. Complete the OAuth flow
6. You should be redirected back to the application and logged in

## Production Deployment

For production deployment:
1. Update all redirect URIs to use your production domain
2. Update environment variables with production URLs
3. Ensure HTTPS is enabled
4. Update CORS settings in `api/src/server.ts`
5. Set public webhook URLs for:
   - `GOOGLE_CALENDAR_WEBHOOK_URI`
   - `MICROSOFT_CALENDAR_WEBHOOK_URI`
6. Apply the Prisma schema changes:
   - `pnpm prisma generate`
   - `pnpm prisma db push`

## Troubleshooting

### Common Issues

1. **"OAuth authentication failed"**
   - Check that all environment variables are set correctly
   - Verify redirect URIs match exactly
   - Ensure the OAuth app is properly configured

2. **"Invalid client"**
   - Check that Client ID and Client Secret are correct
   - Verify the OAuth consent screen is configured

3. **"Redirect URI mismatch"**
   - Ensure the redirect URI in your OAuth app matches the one in your environment variables

4. **"Apple Sign In not working"**
   - Verify the Apple Developer account has the correct capabilities enabled
   - Check that the private key is properly formatted
   - Ensure the Team ID and Key ID are correct

5. **"Calendar auto-sync is not active yet"**
   - Verify the calendar webhook URI is public and uses HTTPS
   - Confirm your provider app includes the calendar callback URI
   - Run a manual "Sync now" after connecting the calendar

6. **"Calendar subscription keeps expiring"**
   - Check `CALENDAR_WEBHOOK_RENEWAL_ENABLED=true`
   - Verify the API process stays running long enough for the renewal loop to execute
   - Confirm the refresh token is still valid with the provider

### Debug Mode
To enable debug logging, add this to your `.env`:
```
DEBUG=passport:*
```

## Security Notes

1. Never commit OAuth credentials to version control
2. Use environment variables for all sensitive configuration
3. Regularly rotate OAuth secrets
4. Monitor OAuth usage in your provider dashboards
5. Implement proper session management
6. Use HTTPS in production
