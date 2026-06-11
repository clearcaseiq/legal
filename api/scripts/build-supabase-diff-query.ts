/**
 * Build a self-contained SQL query that diffs the target DB against schema.prisma
 * INSIDE the database, returning only what's missing. No DB connection needed here;
 * the generated query runs in the Supabase SQL Editor.
 *
 * Run from api/:  node ../node_modules/tsx/dist/cli.mjs scripts/build-supabase-diff-query.ts
 * Output: api/tmp-supabase-diff-query.sql  (paste its contents into Supabase SQL Editor)
 */
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { Prisma } from '@prisma/client'

const scalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'Bytes', 'BigInt'])
const SCHEMA = process.env.TARGET_SCHEMA || 'app_core'

function pgType(type: string): string {
  switch (type) {
    case 'String': return 'TEXT'
    case 'Int': return 'INTEGER'
    case 'BigInt': return 'BIGINT'
    case 'Float': return 'DOUBLE PRECISION'
    case 'Decimal': return 'DECIMAL(65,30)'
    case 'Boolean': return 'BOOLEAN'
    case 'DateTime': return 'TIMESTAMP(3)'
    case 'Json': return 'JSONB'
    case 'Bytes': return 'BYTEA'
    default: return 'TEXT'
  }
}

const tables = new Set<string>()
const cols: Array<{ t: string; c: string; ty: string }> = []
for (const model of Prisma.dmmf.datamodel.models) {
  const t = model.dbName || model.name
  tables.add(t)
  for (const f of model.fields) {
    if (!scalarTypes.has(f.type) || f.relationName) continue
    cols.push({ t, c: f.dbName || f.name, ty: pgType(f.type) })
  }
}

const tableValues = [...tables].sort().map((t) => `('${t}')`).join(',\n  ')
const colValues = cols.map((x) => `('${x.t}','${x.c}','${x.ty}')`).join(',\n  ')

const sql = `-- Generated from api/prisma/schema.prisma. Run in Supabase SQL Editor.
-- Returns ONLY the gaps (small result). Nothing is modified.

-- ============ QUERY 1: MISSING TABLES ============
select e.t as missing_table
from (values
  ${tableValues}
) as e(t)
left join information_schema.tables it
  on it.table_schema = '${SCHEMA}' and it.table_name = e.t
where it.table_name is null
order by e.t;

-- ============ QUERY 2: MISSING COLUMNS (ready-to-run ALTERs) ============
-- Only checks tables that already exist; new tables come from QUERY 1.
select 'ALTER TABLE "' || e.t || '" ADD COLUMN IF NOT EXISTS "' || e.c || '" ' || e.ty || ';' as ddl
from (values
  ${colValues}
) as e(t, c, ty)
join information_schema.tables it
  on it.table_schema = '${SCHEMA}' and it.table_name = e.t
left join information_schema.columns c
  on c.table_schema = '${SCHEMA}' and c.table_name = e.t and c.column_name = e.c
where c.column_name is null
order by e.t, e.c;
`

writeFileSync(resolve(process.cwd(), 'tmp-supabase-diff-query.sql'), sql)
console.log(`Wrote tmp-supabase-diff-query.sql — ${tables.size} tables, ${cols.length} columns embedded.`)
