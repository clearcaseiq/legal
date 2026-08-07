import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { getMatchingRules, saveMatchingRules } from '../lib/matching-rules-config'
import { getHeuristics, saveHeuristics } from '../lib/heuristics-config'
import { getFieldMappings, saveFieldMappings } from '../lib/field-mappings-config'
import { prismaAny } from './admin-shared'

const router: ExpressRouter = Router()

router.get('/matching-rules', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const config = await getMatchingRules()
    res.json(config)
  } catch (error: any) {
    logger.error('Failed to get matching rules', { error, message: error?.message })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

router.put('/matching-rules', authMiddleware, adminMiddleware, requireAdminCapability('config'), async (req: AuthRequest, res) => {
  try {
    const config = await saveMatchingRules(req.body)
    await writeAdminAudit(req, {
      action: 'routing_rules_updated',
      entityType: 'routing_rules',
      entityId: 'global',
      metadata: {
        updatedFields: Object.keys(req.body || {}),
      },
    })
    res.json(config)
  } catch (error) {
    logger.error('Failed to save matching rules', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Heuristics (scoring/labeling config)
router.get('/heuristics', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const config = await getHeuristics()
    res.json(config)
  } catch (error: any) {
    logger.error('Failed to get heuristics', { error, message: error?.message })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

router.put('/heuristics', authMiddleware, adminMiddleware, requireAdminCapability('config'), async (req: AuthRequest, res) => {
  try {
    const config = await saveHeuristics(req.body)
    await writeAdminAudit(req, {
      action: 'heuristics_updated',
      entityType: 'heuristics',
      entityId: 'global',
      metadata: {
        updatedSections: Object.keys(req.body || {}),
      },
    })
    res.json(config)
  } catch (error) {
    logger.error('Failed to save heuristics', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Field mappings (admin-editable value synonym/alias maps, e.g. case type ↔ specialty)
router.get('/field-mappings', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const config = await getFieldMappings()
    res.json(config)
  } catch (error: any) {
    logger.error('Failed to get field mappings', { error, message: error?.message })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

router.put('/field-mappings', authMiddleware, adminMiddleware, requireAdminCapability('config'), async (req: AuthRequest, res) => {
  try {
    const config = await saveFieldMappings(req.body)
    await writeAdminAudit(req, {
      action: 'field_mappings_updated',
      entityType: 'field_mappings',
      entityId: 'global',
      metadata: {
        fields: Array.isArray(req.body?.mappings)
          ? req.body.mappings.map((m: { field?: string }) => m?.field).filter(Boolean)
          : [],
      },
    })
    res.json(config)
  } catch (error: any) {
    logger.error('Failed to save field mappings', { error })
    res.status(500).json({ error: error?.message || 'Internal server error' })
  }
})

// ===== Feature Toggles =====
const FeatureToggleSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  scope: z.enum(['global', 'firm', 'user']).optional(),
  lawFirmId: z.string().optional(),
  userId: z.string().optional()
})

router.get('/feature-toggles', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const toggles = await prismaAny.featureToggle.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: toggles })
  } catch (error) {
    logger.error('Failed to list feature toggles', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/feature-toggles', authMiddleware, adminMiddleware, requireAdminCapability('config'), async (req: AuthRequest, res) => {
  try {
    const parsed = FeatureToggleSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const toggle = await prismaAny.featureToggle.create({
      data: {
        key: parsed.data.key,
        description: parsed.data.description,
        enabled: parsed.data.enabled ?? false,
        scope: parsed.data.scope ?? 'global',
        lawFirmId: parsed.data.lawFirmId,
        userId: parsed.data.userId
      }
    })

    res.status(201).json({ success: true, data: toggle })
  } catch (error) {
    logger.error('Failed to create feature toggle', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/feature-toggles/:id', authMiddleware, adminMiddleware, requireAdminCapability('config'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const parsed = FeatureToggleSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const toggle = await prismaAny.featureToggle.update({
      where: { id },
      data: parsed.data
    })

    res.json({ success: true, data: toggle })
  } catch (error) {
    logger.error('Failed to update feature toggle', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ===== Firm-level Settings =====
const FirmSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any()
})

router.get('/firm-settings/:lawFirmId', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { lawFirmId } = req.params
    const settings = await prismaAny.firmSetting.findMany({
      where: { lawFirmId },
      orderBy: { updatedAt: 'desc' }
    })

    res.json({ success: true, data: settings })
  } catch (error) {
    logger.error('Failed to load firm settings', { error, lawFirmId: req.params.lawFirmId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/firm-settings/:lawFirmId', authMiddleware, adminMiddleware, requireAdminCapability('config'), async (req: AuthRequest, res) => {
  try {
    const { lawFirmId } = req.params
    const parsed = FirmSettingSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const value = typeof parsed.data.value === 'string'
      ? parsed.data.value
      : JSON.stringify(parsed.data.value)

    const setting = await prismaAny.firmSetting.upsert({
      where: { lawFirmId_key: { lawFirmId, key: parsed.data.key } },
      update: { value },
      create: { lawFirmId, key: parsed.data.key, value }
    })

    res.json({ success: true, data: setting })
  } catch (error) {
    logger.error('Failed to upsert firm setting', { error, lawFirmId: req.params.lawFirmId })
    res.status(500).json({ error: 'Internal server error' })
  }
})
export default router
