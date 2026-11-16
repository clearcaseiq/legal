import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

const CHANGE_ID = '20261116113000_add_prediction_lineage_and_attorney_feedback'
const sqlPath = path.resolve(process.cwd(), 'prisma', 'migrations', CHANGE_ID, 'migration.sql')
const databaseUrl = process.env.DATABASE_URL
const deployEnv = String(process.env.DEPLOY_ENV || '').trim().toLowerCase()

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}
if (!deployEnv) {
  throw new Error('DEPLOY_ENV is required so the target environment is explicit')
}
const production = ['prod', 'production'].includes(deployEnv)
const productionMutationAllowed = process.env.ALLOW_PRODUCTION_SCHEMA_CHANGE === 'true'

const sql = await fs.readFile(sqlPath, 'utf8')
const checksum = crypto.createHash('sha256').update(sql).digest('hex')
const client = new pg.Client({ connectionString: databaseUrl })

const predictionColumns = ['assessmentRevision', 'triggerEventId', 'inputHash', 'inputSnapshot']
const reviewColumns = [
  'predictionId',
  'liabilityDisagrees',
  'liabilityScore',
  'liabilityNotes',
  'evidenceDisagrees',
  'evidenceRecommendations',
  'evidenceNotes',
  'valuationDisagrees',
  'valuationNotes',
]

async function verifyAppliedSchema() {
  const columns = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (
          (table_name = 'predictions' AND column_name = ANY($1::text[]))
          OR
          (table_name = 'attorney_case_reviews' AND column_name = ANY($2::text[]))
        )`,
    [predictionColumns, reviewColumns],
  )
  const found = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`))
  const expected = [
    ...predictionColumns.map((column) => `predictions.${column}`),
    ...reviewColumns.map((column) => `attorney_case_reviews.${column}`),
  ]
  const missing = expected.filter((column) => !found.has(column))
  if (missing.length) throw new Error(`Lineage schema is incomplete; missing: ${missing.join(', ')}`)

  const constraints = await client.query(
    `SELECT conname, confdeltype
       FROM pg_constraint
      WHERE conname IN (
        'predictions_assessmentId_fkey',
        'predictions_triggerEventId_fkey',
        'attorney_case_reviews_predictionId_fkey'
      )`,
  )
  const byName = new Map(constraints.rows.map((row) => [row.conname, row.confdeltype]))
  if (byName.get('predictions_assessmentId_fkey') !== 'r') {
    throw new Error('Prediction retention constraint is not ON DELETE RESTRICT')
  }
  if (byName.get('predictions_triggerEventId_fkey') !== 'n') {
    throw new Error('Prediction trigger-event constraint is not ON DELETE SET NULL')
  }
  if (byName.get('attorney_case_reviews_predictionId_fkey') !== 'r') {
    throw new Error('Attorney review constraint is not ON DELETE RESTRICT')
  }

  const index = await client.query(
    `SELECT 1
       FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = 'predictions_lineage_dedupe_key'`,
  )
  if (index.rowCount !== 1) throw new Error('Prediction lineage deduplication index is missing')
}

try {
  await client.connect()
  const identity = await client.query(
    `SELECT current_database() AS database, current_user AS username, version() AS version`,
  )
  if (!String(identity.rows[0]?.version || '').includes('PostgreSQL')) {
    throw new Error('The target is not PostgreSQL')
  }
  console.log(`[lineage-schema] target=${identity.rows[0].database} user=${identity.rows[0].username}`)

  await client.query(`SELECT pg_advisory_lock(hashtext($1))`, [CHANGE_ID])
  const ledger = await client.query(
    `SELECT to_regclass(
       format('%I.%I', current_schema(), 'clearcaseiq_schema_changes')
     ) IS NOT NULL AS exists`,
  )
  const recorded = ledger.rows[0].exists
    ? await client.query(
        `SELECT "checksum" FROM "clearcaseiq_schema_changes" WHERE "id" = $1`,
        [CHANGE_ID],
      )
    : { rowCount: 0, rows: [] }

  if (recorded.rowCount) {
    if (recorded.rows[0].checksum !== checksum) {
      throw new Error('The recorded lineage migration checksum differs from the checked-in SQL')
    }
    await verifyAppliedSchema()
    console.log('[lineage-schema] already applied and verified')
    process.exitCode = 0
  } else {
    if (production && !productionMutationAllowed) {
      throw new Error(
        'Production schema change refused. Confirm a recoverable backup, then set ALLOW_PRODUCTION_SCHEMA_CHANGE=true for this one command.',
      )
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS "clearcaseiq_schema_changes" (
        "id" TEXT PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "appliedBy" TEXT NOT NULL
      )
    `)

    const existing = await client.query(
      `SELECT COUNT(*)::int AS count
         FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'predictions'
          AND column_name = ANY($1::text[])`,
      [predictionColumns],
    )
    const existingCount = existing.rows[0].count
    const predictionsBefore = await client.query(`SELECT COUNT(*)::bigint AS count FROM "predictions"`)

    await client.query('BEGIN')
    try {
      if (existingCount === 0) {
        await client.query(sql)
      } else if (existingCount !== predictionColumns.length) {
        throw new Error(
          `Refusing a partial lineage migration: found ${existingCount}/${predictionColumns.length} prediction columns`,
        )
      }
      await verifyAppliedSchema()
      const predictionsAfter = await client.query(`SELECT COUNT(*)::bigint AS count FROM "predictions"`)
      if (predictionsAfter.rows[0].count !== predictionsBefore.rows[0].count) {
        throw new Error('Prediction row count changed while applying the schema')
      }
      await client.query(
        `INSERT INTO "clearcaseiq_schema_changes" ("id", "checksum", "appliedBy")
         VALUES ($1, $2, $3)`,
        [CHANGE_ID, checksum, process.env.GIT_COMMIT || process.env.USER || 'operator'],
      )
      await client.query('COMMIT')
      console.log(
        existingCount === predictionColumns.length
          ? '[lineage-schema] adopted and verified an already-applied schema'
          : '[lineage-schema] applied and verified',
      )
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
} finally {
  await client.query(`SELECT pg_advisory_unlock(hashtext($1))`, [CHANGE_ID]).catch(() => undefined)
  await client.end().catch(() => undefined)
}
