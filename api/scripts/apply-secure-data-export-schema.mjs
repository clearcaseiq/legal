import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

const CHANGE_ID = '20261116170000_add_secure_data_exports'
const sqlPath = path.resolve(process.cwd(), 'prisma', 'migrations', CHANGE_ID, 'migration.sql')
const databaseUrl = process.env.DATABASE_URL
const deployEnv = String(process.env.DEPLOY_ENV || '').trim().toLowerCase()

if (!databaseUrl) throw new Error('DATABASE_URL is required')
if (!deployEnv) throw new Error('DEPLOY_ENV is required so the target environment is explicit')
if (['prod', 'production'].includes(deployEnv) && process.env.ALLOW_PRODUCTION_SCHEMA_CHANGE !== 'true') {
  throw new Error(
    'Production schema change refused. Confirm a recoverable backup, then set ALLOW_PRODUCTION_SCHEMA_CHANGE=true for this one command.',
  )
}

function pgConfigFromPrismaUrl(value) {
  const url = new URL(value)
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
  return {
    connectionString: url.toString(),
    ssl,
    ...(schema && schema !== 'public' ? { options: `-c search_path=${schema}` } : {}),
  }
}

const sql = await fs.readFile(sqlPath, 'utf8')
const checksum = crypto.createHash('sha256').update(sql).digest('hex')
const client = new pg.Client(pgConfigFromPrismaUrl(databaseUrl))

async function verify() {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])`,
    [['data_export_runs', 'data_export_artifacts']],
  )
  if (tables.rowCount !== 2) throw new Error('Export schema is incomplete')
  const expiry = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'sync_api_keys' AND column_name = 'expiresAt'`,
  )
  if (expiry.rowCount !== 1) throw new Error('sync_api_keys.expiresAt is missing')
  const fk = await client.query(
    `SELECT confdeltype FROM pg_constraint
      WHERE conname = 'data_export_artifacts_exportRunId_fkey'`,
  )
  if (fk.rows[0]?.confdeltype !== 'c') throw new Error('Export artifact foreign key must cascade on run deletion')
}

try {
  await client.connect()
  const identity = await client.query('SELECT current_database() AS database, current_user AS username')
  console.log(`[data-export-schema] target=${identity.rows[0].database} user=${identity.rows[0].username}`)
  await client.query('SELECT pg_advisory_lock(hashtext($1))', [CHANGE_ID])
  await client.query(`
    CREATE TABLE IF NOT EXISTS "clearcaseiq_schema_changes" (
      "id" TEXT PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "appliedBy" TEXT NOT NULL
    )
  `)
  const recorded = await client.query(
    `SELECT "checksum" FROM "clearcaseiq_schema_changes" WHERE "id" = $1`,
    [CHANGE_ID],
  )
  if (recorded.rowCount) {
    if (recorded.rows[0].checksum !== checksum) throw new Error('Recorded migration checksum differs from checked-in SQL')
    await verify()
    console.log('[data-export-schema] already applied and verified')
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
      console.log('[data-export-schema] applied and verified')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
} finally {
  await client.query('SELECT pg_advisory_unlock(hashtext($1))', [CHANGE_ID]).catch(() => undefined)
  await client.end().catch(() => undefined)
}
