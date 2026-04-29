import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type TableCount = {
  table: string
  count: number
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required. Add it to api/.env before running this script.`)
  }
  return value
}

function getSchema(databaseUrl: string) {
  return new URL(databaseUrl).searchParams.get('schema') || 'public'
}

function summarizeTarget(databaseUrl: string) {
  const url = new URL(databaseUrl)
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace(/^\//, ''),
    schema: getSchema(databaseUrl),
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

async function getTableCounts(client: PrismaClient, schema: string): Promise<TableCount[]> {
  const tables = await client.$queryRawUnsafe<Array<{ table_name: string }>>(
    "select table_name from information_schema.tables where table_schema = $1 and table_type = 'BASE TABLE' order by table_name",
    schema,
  )

  const counts: TableCount[] = []
  for (const { table_name: table } of tables) {
    const rows = await client.$queryRawUnsafe<Array<{ count: number | bigint }>>(
      `select count(*)::bigint as count from ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`,
    )
    counts.push({ table, count: Number(rows[0]?.count || 0) })
  }

  return counts
}

async function main() {
  const localUrl = process.env.LOCAL_DATABASE_URL || requireEnv('DATABASE_URL')
  const supabaseUrl = requireEnv('SUPABASE_DATABASE_URL')
  const localSchema = getSchema(localUrl)
  const supabaseSchema = getSchema(supabaseUrl)

  const local = new PrismaClient({ datasources: { db: { url: localUrl } } })
  const supabase = new PrismaClient({ datasources: { db: { url: supabaseUrl } } })

  try {
    const [localCounts, supabaseCounts] = await Promise.all([
      getTableCounts(local, localSchema),
      getTableCounts(supabase, supabaseSchema),
    ])

    const localByTable = new Map(localCounts.map((item) => [item.table, item.count]))
    const supabaseByTable = new Map(supabaseCounts.map((item) => [item.table, item.count]))
    const allTables = Array.from(new Set([...localByTable.keys(), ...supabaseByTable.keys()])).sort()

    const differences = allTables
      .map((table) => {
        const localCount = localByTable.get(table) ?? 0
        const supabaseCount = supabaseByTable.get(table) ?? 0
        return {
          table,
          localCount,
          supabaseCount,
          delta: supabaseCount - localCount,
        }
      })
      .filter((item) => item.delta !== 0)

    console.log(
      JSON.stringify(
        {
          local: summarizeTarget(localUrl),
          supabase: summarizeTarget(supabaseUrl),
          summary: {
            localTableCount: localCounts.length,
            supabaseTableCount: supabaseCounts.length,
            differingTableCount: differences.length,
          },
          differences,
        },
        null,
        2,
      ),
    )
  } finally {
    await Promise.all([local.$disconnect(), supabase.$disconnect()])
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
