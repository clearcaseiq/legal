import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file with explicit path resolution
const envPath = resolve(process.cwd(), '.env')
config({ path: envPath })

// Also try loading from the API directory
const apiEnvPath = resolve(process.cwd(), 'api/.env')
config({ path: apiEnvPath })

function req(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  /** Bind address — use 0.0.0.0 so phones on the same Wi‑Fi can reach the API (LAN IP). */
  HOST: process.env.HOST ?? '0.0.0.0',
  DATABASE_URL: req('DATABASE_URL'),
  FILE_BUCKET: process.env.FILE_BUCKET ?? 'local',
  JWT_SECRET: req('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ML_SERVICE_URL: process.env.ML_SERVICE_URL,
  ML_PREDICTION_MODE: process.env.ML_PREDICTION_MODE ?? 'fallback',
  ML_REQUEST_TIMEOUT_MS: Number(process.env.ML_REQUEST_TIMEOUT_MS ?? 5000),
  ML_RETRIEVAL_ENABLED: process.env.ML_RETRIEVAL_ENABLED === 'true',
  ML_RETRIEVAL_TOP_K: Number(process.env.ML_RETRIEVAL_TOP_K ?? 4),
  ML_PROMPT_VERSION: process.env.ML_PROMPT_VERSION ?? 'legal-grounded-v1',
  API_URL: process.env.API_URL ?? 'http://localhost:4000',
  WEB_URL: process.env.WEB_URL ?? 'http://localhost:5174',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  GOOGLE_CALENDAR_CLIENT_SECRET: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  GOOGLE_CALENDAR_REDIRECT_URI: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  GOOGLE_CALENDAR_WEBHOOK_URI: process.env.GOOGLE_CALENDAR_WEBHOOK_URI,
  MICROSOFT_CALENDAR_CLIENT_ID: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
  MICROSOFT_CALENDAR_CLIENT_SECRET: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
  MICROSOFT_CALENDAR_REDIRECT_URI: process.env.MICROSOFT_CALENDAR_REDIRECT_URI,
  MICROSOFT_CALENDAR_WEBHOOK_URI: process.env.MICROSOFT_CALENDAR_WEBHOOK_URI,
  CALENDAR_WEBHOOK_RENEWAL_ENABLED: process.env.CALENDAR_WEBHOOK_RENEWAL_ENABLED !== 'false',
  CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS: Number(process.env.CALENDAR_WEBHOOK_RENEWAL_INTERVAL_MS ?? 15 * 60 * 1000),
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
  /** Comma-separated emails treated as admin in JWT role resolution */
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? 'admin@caseiq.com',
  /** When true, sensitive plaintiff routes require user.emailVerified */
  REQUIRE_EMAIL_VERIFICATION: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
}
