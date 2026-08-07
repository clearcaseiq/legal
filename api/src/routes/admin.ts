/**
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
