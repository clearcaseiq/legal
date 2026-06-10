-- Run in Supabase SQL Editor when Prisma still says assessments.lawFirmId does not exist.
-- Common cause: columns were added to app_core but DATABASE_URL uses schema=public (or no schema).

-- 1) DIAGNOSTIC: which schema has assessments and lawFirmId?
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_name = 'assessments'
  AND column_name IN ('lawFirmId', 'officeId', 'teamId')
ORDER BY table_schema, column_name;

SELECT table_schema, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name = 'assessments'
GROUP BY table_schema
ORDER BY table_schema;

-- 2) FIX app_core (team default — use ?schema=app_core in DATABASE_URL)
ALTER TABLE app_core.assessments ADD COLUMN IF NOT EXISTS "lawFirmId" TEXT;
ALTER TABLE app_core.assessments ADD COLUMN IF NOT EXISTS "officeId" TEXT;
ALTER TABLE app_core.assessments ADD COLUMN IF NOT EXISTS "teamId" TEXT;

CREATE INDEX IF NOT EXISTS assessments_lawFirmId_idx ON app_core.assessments("lawFirmId");
CREATE INDEX IF NOT EXISTS assessments_officeId_idx ON app_core.assessments("officeId");
CREATE INDEX IF NOT EXISTS assessments_teamId_idx ON app_core.assessments("teamId");

-- 3) FIX public (only if Rahul's DATABASE_URL has schema=public or no schema param)
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS "lawFirmId" TEXT;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS "officeId" TEXT;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS "teamId" TEXT;

CREATE INDEX IF NOT EXISTS assessments_lawFirmId_idx ON public.assessments("lawFirmId");
CREATE INDEX IF NOT EXISTS assessments_officeId_idx ON public.assessments("officeId");
CREATE INDEX IF NOT EXISTS assessments_teamId_idx ON public.assessments("teamId");

-- 4) Re-run diagnostic (should show lawFirmId in the schema Rahul uses)
SELECT table_schema, column_name
FROM information_schema.columns
WHERE table_name = 'assessments'
  AND column_name = 'lawFirmId';
