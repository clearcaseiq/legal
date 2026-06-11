/**
 * Generate idempotent, additive SQL to bring a database up to api/prisma/schema.prisma,
 * using a CSV export of the target's current columns (no DB connection required).
 *
 * 1. In the Supabase SQL Editor run:
 *      select table_name, column_name, data_type, is_nullable
 *      from information_schema.columns
 *      where table_schema = 'app_core'
 *      order by table_name, ordinal_position;
 *    then Download CSV and save it as api/tmp-supabase-schema.csv
 *
 * 2. From api/:  node ../node_modules/tsx/dist/cli.mjs scripts/generate-supabase-delta-sql.ts tmp-supabase-schema.csv
 *
 * Output: prints additive SQL (ALTER TABLE ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS)
 * for anything in the Prisma schema that is missing from the CSV. Review before running in the editor.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Prisma } from '@prisma/client'

const scalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'Bytes', 'BigInt'])
const TARGET_SCHEMA = process.env.TARGET_SCHEMA || 'app_core'

function pgType(field: { type: string }): string {
  switch (field.type) {
    case 'String':
      return 'TEXT'
    case 'Int':
      return 'INTEGER'
    case 'BigInt':
      return 'BIGINT'
    case 'Float':
      return 'DOUBLE PRECISION'
    case 'Decimal':
      return 'DECIMAL(65,30)'
    case 'Boolean':
      return 'BOOLEAN'
    case 'DateTime':
      return 'TIMESTAMP(3)'
    case 'Json':
      return 'JSONB'
    case 'Bytes':
      return 'BYTEA'
    default:
      return 'TEXT'
  }
}

function parseCsv(text: string): Array<{ table: string; column: string }> {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const rows: Array<{ table: string; column: string }> = []
  for (const line of lines) {
    const cells = line.split(',')
    const table = (cells[0] || '').trim().replace(/^"|"$/g, '')
    const column = (cells[1] || '').trim().replace(/^"|"$/g, '')
    if (!table || table.toLowerCase() === 'table_name') continue
    rows.push({ table, column })
  }
  return rows
}

function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: tsx scripts/generate-supabase-delta-sql.ts <path-to-csv>')
    process.exit(1)
  }
  const csvPath = resolve(process.cwd(), arg)
  const rows = parseCsv(readFileSync(csvPath, 'utf8'))

  const existingColumns = new Set(rows.map((r) => `${r.table}.${r.column}`))
  const existingTables = new Set(rows.map((r) => r.table))

  const missingTableSql: string[] = []
  const missingColumnSql: string[] = []
  let missingTableCount = 0
  let missingColumnCount = 0

  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name
    const scalarFields = model.fields.filter((f) => scalarTypes.has(f.type) && !f.relationName)

    if (!existingTables.has(table)) {
      missingTableCount += 1
      const cols = scalarFields.map((f) => {
        const col = f.dbName || f.name
        const nn = f.isRequired ? ' NOT NULL' : ''
        return `    "${col}" ${pgType(f)}${nn}`
      })
      const idField = scalarFields.find((f) => f.isId)
      const pk = idField ? `,\n    CONSTRAINT "${table}_pkey" PRIMARY KEY ("${idField.dbName || idField.name}")` : ''
      missingTableSql.push(`CREATE TABLE IF NOT EXISTS "${table}" (\n${cols.join(',\n')}${pk}\n);`)
      continue
    }

    for (const f of scalarFields) {
      const col = f.dbName || f.name
      if (!existingColumns.has(`${table}.${col}`)) {
        missingColumnCount += 1
        // Additive on a populated table: add as NULLABLE to avoid failures, even if the
        // Prisma field is required. Backfill + set NOT NULL separately if needed.
        missingColumnSql.push(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${pgType(f)};`)
      }
    }
  }

  const out: string[] = []
  out.push(`-- Auto-generated additive delta vs api/prisma/schema.prisma`)
  out.push(`-- Target schema: ${TARGET_SCHEMA}. Safe to re-run (IF NOT EXISTS). Review before applying.`)
  out.push(`-- Missing tables: ${missingTableCount}, missing columns: ${missingColumnCount}`)
  out.push(``)
  out.push(`CREATE SCHEMA IF NOT EXISTS ${TARGET_SCHEMA};`)
  out.push(`SET search_path TO ${TARGET_SCHEMA}, public;`)
  out.push(``)
  if (missingTableSql.length) {
    out.push(`-- ============ Missing tables ============`)
    out.push(missingTableSql.join('\n\n'))
    out.push(``)
  }
  if (missingColumnSql.length) {
    out.push(`-- ============ Missing columns ============`)
    out.push(missingColumnSql.join('\n'))
    out.push(``)
  }
  if (!missingTableSql.length && !missingColumnSql.length) {
    out.push(`-- Production already has every table and scalar column in schema.prisma. Nothing to do.`)
  }

  console.log(out.join('\n'))
  console.error(`\nDone. Missing tables: ${missingTableCount}, missing columns: ${missingColumnCount}`)
  console.error('Note: relations/foreign keys, indexes, defaults, and NOT NULL backfills are NOT auto-generated. Review output.')
}

main()
