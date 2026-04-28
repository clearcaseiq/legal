import { config } from 'dotenv'
import { resolve } from 'path'
import { Prisma, PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

const prisma = new PrismaClient()
const scalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'Bytes', 'BigInt'])

async function main() {
  const schema = new URL(process.env.DATABASE_URL || '').searchParams.get('schema') || 'public'
  const columns = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
    'select table_name, column_name from information_schema.columns where table_schema = $1 order by table_name, column_name',
    schema
  )
  const existingColumns = new Set(columns.map((column) => `${column.table_name}.${column.column_name}`))
  const missing = []

  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name
    for (const field of model.fields) {
      if (!scalarTypes.has(field.type) || field.relationName) continue
      const column = field.dbName || field.name
      if (!existingColumns.has(`${table}.${column}`)) {
        missing.push({
          model: model.name,
          table,
          field: field.name,
          column,
          type: field.type,
          required: field.isRequired,
          list: field.isList,
          hasDefault: field.hasDefaultValue,
        })
      }
    }
  }

  console.log(JSON.stringify({ schema, missingCount: missing.length, missing }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
