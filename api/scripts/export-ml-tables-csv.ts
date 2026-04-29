import { createWriteStream } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const DEFAULT_TABLES = [
  'assessments',
  'lead_submissions',
  'predictions',
  'case_tiers',
  'case_tasks',
  'files',
  'evidence_files',
  'demand_letters',
  'insurance_details',
  'lien_holders',
  'negotiation_events',
  'case_health_snapshots',
  'lead_analytics',
  'attorneys',
  'attorney_profiles',
  'users',
]

type ExportResult = {
  table: string
  file?: string
  rows: number
  skipped?: string
}

function getArg(name: string) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

function requireDatabaseUrl() {
  const source = getArg('source')
  const value =
    process.env.EXPORT_DATABASE_URL ||
    (source === 'local' ? process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL : undefined) ||
    (source === 'supabase' ? process.env.SUPABASE_DATABASE_URL : undefined) ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL

  if (!value) {
    throw new Error('Set SUPABASE_DATABASE_URL, EXPORT_DATABASE_URL, LOCAL_DATABASE_URL, or DATABASE_URL before running this export.')
  }
  return value
}

function getSchema(databaseUrl: string) {
  return getArg('schema') || new URL(databaseUrl).searchParams.get('schema') || 'public'
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function csvCell(value: unknown) {
  if (value == null) return ''
  const raw =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'bigint'
        ? value.toString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)

  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

function getTables() {
  const selectedTables = getArg('tables')
  if (!selectedTables) return DEFAULT_TABLES
  return selectedTables
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean)
}

function getOutputDirectory() {
  const output = getArg('out')
  if (output) return resolve(process.cwd(), output)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return resolve(__dirname, '../../data/ml-exports/raw', stamp)
}

async function tableExists(prisma: PrismaClient, schema: string, table: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    'select exists (select 1 from information_schema.tables where table_schema = $1 and table_name = $2) as exists',
    schema,
    table,
  )
  return Boolean(rows[0]?.exists)
}

async function getColumns(prisma: PrismaClient, schema: string, table: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    'select column_name from information_schema.columns where table_schema = $1 and table_name = $2 order by ordinal_position',
    schema,
    table,
  )
  return rows.map((row) => row.column_name)
}

async function getRowCount(prisma: PrismaClient, schema: string, table: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `select count(*)::bigint as count from ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`,
  )
  return Number(rows[0]?.count || 0)
}

function getLimit() {
  const raw = getArg('limit')
  if (!raw) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('--limit must be a positive integer.')
  }
  return value
}

function getRowsPerFile() {
  const raw = getArg('rows-per-file')
  if (!raw) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('--rows-per-file must be a positive integer.')
  }
  return value
}

function getWhereClause(table: string) {
  const prefilterLabel = getArg('prefilter-label')
  if (table === 'cases_raw' && prefilterLabel) {
    return {
      sql: ' where prefilter_label = $1',
      params: [prefilterLabel],
    }
  }

  return {
    sql: '',
    params: [] as string[],
  }
}

function getPartFile(outputDir: string, table: string, part: number) {
  return resolve(outputDir, `${table}_part_${String(part).padStart(4, '0')}.csv`)
}

function openCsvStream(file: string, columns: string[]) {
  const stream = createWriteStream(file, { encoding: 'utf8' })
  stream.write(`${columns.map(csvCell).join(',')}\n`)
  return stream
}

async function closeCsvStream(stream: ReturnType<typeof createWriteStream>) {
  await new Promise<void>((resolveStream, rejectStream) => {
    stream.once('error', rejectStream)
    stream.end(() => resolveStream())
  })
}

async function exportTable(prisma: PrismaClient, schema: string, table: string, outputDir: string, limit?: number): Promise<ExportResult> {
  if (!(await tableExists(prisma, schema, table))) {
    return { table, rows: 0, skipped: 'table not found' }
  }

  const columns = await getColumns(prisma, schema, table)
  if (columns.length === 0) {
    return { table, rows: 0, skipped: 'no columns' }
  }

  const where = getWhereClause(table)
  const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `select count(*)::bigint as count from ${quoteIdentifier(schema)}.${quoteIdentifier(table)}${where.sql}`,
    ...where.params,
  )
  const totalRows = Math.min(Number(countRows[0]?.count || 0), limit ?? Number.MAX_SAFE_INTEGER)
  const file = resolve(outputDir, `${table}.csv`)
  const rowsPerFile = table === 'cases_raw' ? getRowsPerFile() : undefined
  let stream = openCsvStream(rowsPerFile ? getPartFile(outputDir, table, 1) : file, columns)
  let currentPart = 1
  let rowsInCurrentFile = 0

  const batchSize = 1000
  const selectedColumns = columns.map(quoteIdentifier).join(', ')
  let exportedRows = 0

  const writeRow = async (row: Record<string, unknown>) => {
    if (rowsPerFile && rowsInCurrentFile >= rowsPerFile) {
      await closeCsvStream(stream)
      currentPart += 1
      rowsInCurrentFile = 0
      stream = openCsvStream(getPartFile(outputDir, table, currentPart), columns)
    }

    if (!stream.write(`${columns.map((column) => csvCell(row[column])).join(',')}\n`)) {
      await new Promise<void>((resolveDrain) => stream.once('drain', resolveDrain))
    }
    exportedRows += 1
    rowsInCurrentFile += 1
  }

  try {
    if (table === 'cases_raw' && columns.includes('case_id')) {
      let lastCaseId = ''
      while (exportedRows < totalRows) {
        const currentBatchSize = Math.min(batchSize, totalRows - exportedRows)
        const keysetSql = where.sql
          ? `${where.sql} and case_id > $${where.params.length + 1}`
          : ` where case_id > $${where.params.length + 1}`
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `select ${selectedColumns} from ${quoteIdentifier(schema)}.${quoteIdentifier(table)}${keysetSql} order by case_id limit ${currentBatchSize}`,
          ...where.params,
          lastCaseId,
        )
        if (rows.length === 0) break
        for (const row of rows) {
          await writeRow(row)
        }
        lastCaseId = String(rows[rows.length - 1]?.case_id || lastCaseId)
        if (exportedRows % 10000 === 0 || exportedRows >= totalRows) {
          console.log(`  ${table}: exported ${exportedRows}/${totalRows} row(s)`)
        }
      }
    } else {
      for (let offset = 0; offset < totalRows; offset += batchSize) {
        const remaining = totalRows - offset
        const currentBatchSize = Math.min(batchSize, remaining)
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `select ${selectedColumns} from ${quoteIdentifier(schema)}.${quoteIdentifier(table)}${where.sql} limit ${currentBatchSize} offset ${offset}`,
          ...where.params,
        )
        for (const row of rows) {
          await writeRow(row)
        }
      }
    }
  } finally {
    await closeCsvStream(stream)
  }

  return { table, file, rows: exportedRows }
}

async function main() {
  const databaseUrl = requireDatabaseUrl()
  const schema = getSchema(databaseUrl)
  const outputDir = getOutputDirectory()
  const tables = getTables()
  const limit = getLimit()
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })

  await mkdir(outputDir, { recursive: true })

  const target = new URL(databaseUrl)
  console.log(
    `Exporting ${tables.length} table(s) from ${target.hostname}/${target.pathname.replace(/^\//, '')} schema "${schema}".`,
  )
  console.log('Warning: raw ML exports may contain PII. Keep data/ml-exports local and do not commit it.')

  const results: ExportResult[] = []
  try {
    for (const table of tables) {
      const result = await exportTable(prisma, schema, table, outputDir, limit)
      results.push(result)
      console.log(
        result.skipped
          ? `- ${table}: skipped (${result.skipped})`
          : `- ${table}: exported ${result.rows} row(s)`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }

  await writeFile(
    resolve(outputDir, 'manifest.json'),
    `${JSON.stringify({ exportedAt: new Date().toISOString(), schema, tables: results }, null, 2)}\n`,
    'utf8',
  )
  console.log(`Done. Files written to ${outputDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
