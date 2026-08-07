/**
 * One-shot splitter: carve api/src/routes/admin.ts into domain routers.
 * Run from repo root: node api/scripts/split-admin-routes.mjs
 */
import fs from 'fs'
import path from 'path'

const root = path.resolve('api/src/routes')
const srcPath = path.join(root, 'admin.ts')
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/)

// 1-based inclusive line ranges from admin.ts
const slice = (start, end) => lines.slice(start - 1, end).join('\n')

const shared = `import { prisma } from '../lib/prisma'

/** Escape hatch for models/fields that the generated client lags behind on. */
export const prismaAny = prisma as any

export function safeJsonParse<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function safeJsonArray(value: string | null | undefined): string[] {
  const parsed = safeJsonParse<unknown>(value)
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
}
`

const miscHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { parsePagination, paginated } from '../lib/pagination'
import { sendSms, isSmsConfigured } from '../lib/sms'
import { getAdminCalendarHealth } from '../lib/calendar-sync'
import { getSystemStatus } from '../lib/ops-status'

const router: ExpressRouter = Router()

`

const analyticsHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { safeJsonParse } from './admin-shared'

const router: ExpressRouter = Router()

`

const configHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { getMatchingRules, saveMatchingRules } from '../lib/matching-rules-config'
import { getHeuristics, saveHeuristics } from '../lib/heuristics-config'
import { getFieldMappings, saveFieldMappings } from '../lib/field-mappings-config'
import { prismaAny } from './admin-shared'

const router: ExpressRouter = Router()

`

const usersHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { prismaAny } from './admin-shared'

const router: ExpressRouter = Router()

`

const casesHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { CaseForRouting, AttorneyForRouting, routeCaseToAttorneys, filterEligibleAttorneys } from '../lib/routing'
import { startAssessmentRouting } from '../lib/assessment-routing'
import { runRoutingEscalationSweep } from '../lib/routing-escalation-sweep'
import { sendCaseOfferSms } from '../lib/sms'
import { CLAIM_INVITE_TTL_DAYS, claimUrl, generateClaimToken, sendClaimEmail } from '../lib/claims'
import { prismaAny, safeJsonParse } from './admin-shared'

const router: ExpressRouter = Router()

`

const attorneysHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { CaseForRouting, AttorneyForRouting, filterEligibleAttorneys } from '../lib/routing'
import { safeJsonParse } from './admin-shared'

const router: ExpressRouter = Router()

`

const docsHeader = `import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { safeJsonParse, safeJsonArray } from './admin-shared'

const router: ExpressRouter = Router()

`

const footer = `\nexport default router\n`

const files = {
  'admin-shared.ts': shared,
  'admin-misc.ts':
    miscHeader +
    slice(301, 307) + '\n\n' +
    slice(309, 423) + '\n\n' +
    slice(575, 627) +
    footer,
  'admin-analytics.ts':
    analyticsHeader +
    slice(209, 227) + '\n\n' +
    slice(426, 572) + '\n\n' +
    slice(727, 973) + '\n\n' +
    slice(3218, 3502) +
    footer,
  'admin-config.ts':
    configHeader +
    slice(629, 724) + '\n\n' +
    slice(1569, 1680) +
    footer,
  'admin-users.ts':
    usersHeader +
    slice(1446, 1567) +
    footer,
  'admin-cases.ts':
    casesHeader +
    slice(32, 76) + '\n\n' +
    slice(232, 287) + '\n\n' +
    slice(975, 1254) + '\n\n' +
    slice(1683, 2546) + '\n\n' +
    slice(2625, 2865) +
    footer,
  'admin-attorneys.ts':
    attorneysHeader +
    slice(1257, 1444) + '\n\n' +
    slice(2549, 2622) + '\n\n' +
    slice(2873, 3216) +
    footer,
  'admin-docs.ts':
    docsHeader +
    slice(92, 207) + '\n\n' +
    slice(3504, 3816) +
    footer,
  'admin.ts': `/**
 * Platform admin API composer. Domain routers live in admin-*.ts; this file
 * only mounts them under /v1/admin so clients and build-app stay unchanged.
 */
import { Router, type Router as ExpressRouter } from 'express'
import misc from './admin-misc'
import analytics from './admin-analytics'
import config from './admin-config'
import users from './admin-users'
import cases from './admin-cases'
import attorneys from './admin-attorneys'
import docs from './admin-docs'

const router: ExpressRouter = Router()

router.use(misc)
router.use(analytics)
router.use(config)
router.use(users)
router.use(cases)
router.use(attorneys)
router.use(docs)

export default router
`,
}

// Backup original once
const backup = path.join(root, 'admin.ts.bak')
if (!fs.existsSync(backup)) {
  fs.copyFileSync(srcPath, backup)
  console.log('Backed up to admin.ts.bak')
}

for (const [name, body] of Object.entries(files)) {
  const out = path.join(root, name)
  fs.writeFileSync(out, body.endsWith('\n') ? body : body + '\n', 'utf8')
  console.log('Wrote', name, '(' + body.split(/\r?\n/).length + ' lines)')
}

console.log('Done.')
