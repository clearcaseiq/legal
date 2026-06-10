/**
 * Compare Prisma schema vs local + Supabase DBs, and local columns vs Supabase columns.
 * Usage: pnpm exec tsx scripts/compare-local-supabase-schema.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { Prisma, PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const scalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'Bytes', 'BigInt'])

type ColumnRow = { table_name: string; column_name: string }

async function fetchColumns(url: string) {
  const schema = new URL(url).searchParams.get('schema') || 'public'
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const columns = await prisma.$queryRawUnsafe<ColumnRow[]>(
      'select table_name, column_name from information_schema.columns where table_schema = $1 order by table_name, column_name',
      schema
    )
    return { schema, columns }
  } finally {
    await prisma.$disconnect()
  }
}

function missingFromPrisma(columns: ColumnRow[]) {
  const existing = new Set(columns.map((c) => `${c.table_name}.${c.column_name}`))
  const missing: Array<{ model: string; table: string; field: string; column: string }> = []

  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name
    for (const field of model.fields) {
      if (!scalarTypes.has(field.type) || field.relationName) continue
      const column = field.dbName || field.name
      if (!existing.has(`${table}.${column}`)) {
        missing.push({ model: model.name, table, field: field.name, column })
      }
    }
  }

  return missing
}

function diffColumnSets(a: ColumnRow[], b: ColumnRow[]) {
  const setA = new Set(a.map((c) => `${c.table_name}.${c.column_name}`))
  const setB = new Set(b.map((c) => `${c.table_name}.${c.column_name}`))
  const onlyA = [...setA].filter((k) => !setB.has(k)).sort()
  const onlyB = [...setB].filter((k) => !setA.has(k)).sort()
  return { onlyA, onlyB }
}

async function main() {
  const localUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL

  if (!localUrl) throw new Error('Set DATABASE_URL or LOCAL_DATABASE_URL in api/.env')
  if (!supabaseUrl) throw new Error('Set SUPABASE_DATABASE_URL in api/.env')

  const [local, supabase] = await Promise.all([
    fetchColumns(localUrl),
    fetchColumns(supabaseUrl),
  ])

  const localMissing = missingFromPrisma(local.columns)
  const supabaseMissing = missingFromPrisma(supabase.columns)
  const cross = diffColumnSets(local.columns, supabase.columns)

  const assessmentKeys = ['assessments.lawFirmId', 'assessments.officeId', 'assessments.teamId'] as const
  const localSet = new Set(local.columns.map((c) => `${c.table_name}.${c.column_name}`))
  const supaSet = new Set(supabase.columns.map((c) => `${c.table_name}.${c.column_name}`))

  const report = {
    summary: {
      prismaModelCount: Prisma.dmmf.datamodel.models.length,
      local: {
        schema: local.schema,
        tables: new Set(local.columns.map((c) => c.table_name)).size,
        columns: local.columns.length,
        missingVsPrisma: localMissing.length,
      },
      supabase: {
        schema: supabase.schema,
        tables: new Set(supabase.columns.map((c) => c.table_name)).size,
        columns: supabase.columns.length,
        missingVsPrisma: supabaseMissing.length,
      },
      localVsSupabase: {
        onlyInLocalCount: cross.onlyA.length,
        onlyInSupabaseCount: cross.onlyB.length,
      },
      assessments: Object.fromEntries(
        assessmentKeys.map((key) => [key, { local: localSet.has(key), supabase: supaSet.has(key) }])
      ),
    },
    prismaMissingInLocal: localMissing,
    prismaMissingInSupabase: supabaseMissing,
    onlyInLocal: cross.onlyA,
    onlyInSupabase: cross.onlyB,
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
