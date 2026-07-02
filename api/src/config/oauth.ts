import '../load-env'

export const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/v1/auth/google/callback',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKey: process.env.APPLE_PRIVATE_KEY || '',
    redirectUri: process.env.APPLE_REDIRECT_URI || 'http://localhost:4000/v1/auth/apple/callback',
  },
  // Microsoft Entra ID (Azure AD) login. Distinct from the calendar-sync
  // MICROSOFT_CALENDAR_* credentials. `tenant` defaults to "common" so both
  // work and personal Microsoft accounts can sign in (#74).
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    tenant: process.env.MICROSOFT_TENANT || 'common',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4000/v1/auth/microsoft/callback',
  },
}

export const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
