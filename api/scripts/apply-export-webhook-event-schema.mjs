import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

const CHANGE_ID = '20261117195600_add_export_webhook_event_id'
const databaseUrl = process.env.DATABASE_URL
const deployEnv = String(process.env.DEPLOY_ENV || '').trim().toLowerCase()
if (!databaseUrl) throw new Error('DATABASE_URL is required')
if (!deployEnv) throw new Error('DEPLOY_ENV is required so the target environment is explicit')
if (['prod', 'production'].includes(deployEnv) && process.env.ALLOW_PRODUCTION_SCHEMA_CHANGE !== 'true') {
  throw new Error('Production schema change refused. Confirm a recoverable backup first.')
}

const url = new URL(databaseUrl)
const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase()
const schema = url.searchParams.get('schema')
for (const key of [
  'schema', 'connection_limit', 'pool_timeout', 'pgbouncer', 'statement_cache_size',
  'socket_timeout', 'connect_timeout', 'sslmode', 'sslaccept', 'sslcert',
  'sslidentity', 'sslpassword',
]) url.searchParams.delete(key)
const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
const ssl = sslmode === 'disable' || (local && !sslmode)
  ? false
  : sslmode === 'verify-full' ? true : { rejectUnauthorized: false }
const sql = await fs.readFile(path.resolve(process.cwd(), 'prisma', 'migrations', CHANGE_ID, 'migration.sql'), 'utf8')
const checksum = crypto.createHash('sha256').update(sql).digest('hex')
const client = new pg.Client({
  connectionString: url.toString(),
  ssl,
  ...(schema && schema !== 'public' ? { options: `-c search_path=${schema}` } : {}),
})

async function verify() {
  const column = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'data_export_runs' AND column_name = 'webhookEventId'`,
  )
  if (column.rowCount !== 1) throw new Error('data_export_runs.webhookEventId is missing')
  const index = await client.query(
    `SELECT 1 FROM pg_indexes
      WHERE schemaname = current_schema() AND indexname = 'data_export_runs_webhookEventId_key'`,
  )
  if (index.rowCount !== 1) throw new Error('Webhook event-id uniqueness index is missing')
}

try {
  await client.connect()
  await client.query('SELECT pg_advisory_lock(hashtext($1))', [CHANGE_ID])
  const recorded = await client.query(
    `SELECT "checksum" FROM "clearcaseiq_schema_changes" WHERE "id" = $1`,
    [CHANGE_ID],
  )
  if (recorded.rowCount) {
    if (recorded.rows[0].checksum !== checksum) throw new Error('Recorded migration checksum differs from checked-in SQL')
    await verify()
    console.log('[export-webhook-schema] already applied and verified')
  } else {
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await verify()
      await client.query(
        `INSERT INTO "clearcaseiq_schema_changes" ("id", "checksum", "appliedBy") VALUES ($1, $2, $3)`,
        [CHANGE_ID, checksum, process.env.GIT_COMMIT || process.env.USER || 'operator'],
      )
      await client.query('COMMIT')
      console.log('[export-webhook-schema] applied and verified')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
} finally {
  await client.query('SELECT pg_advisory_unlock(hashtext($1))', [CHANGE_ID]).catch(() => undefined)
  await client.end().catch(() => undefined)
}
