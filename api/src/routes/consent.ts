import express from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'
import { CONSENT_TEMPLATES, ConsentTemplateKey, getConsentTemplate } from '../lib/consent-templates'
import { getClientConsentCompliance } from '../lib/client-consent-guard'

const router = express.Router()

// Validation schemas
const ConsentCreateSchema = z.object({
  consentType: z.enum(['hipaa', 'terms', 'privacy', 'marketing']),
  version: z.string(),
  documentId: z.string(),
  granted: z.boolean(),
  signatureData: z.string().optional(),
  signatureMethod: z.enum(['drawn', 'typed', 'clicked']).optional(),
  consentText: z.string(),
  expiresAt: z.string().optional()
})

const ConsentUpdateSchema = z.object({
  granted: z.boolean().optional(),
  revokedAt: z.string().optional(),
  signatureData: z.string().optional(),
  signatureMethod: z.enum(['drawn', 'typed', 'clicked']).optional()
})

// Get all consents for the authenticated user
router.get('/my-consents', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const consents = await prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: consents
    })
  } catch (error: any) {
    logger.error('Error fetching user consents', { error: error.message, userId: req.user?.id })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consents'
    })
  }
})

/** Public metadata for all document types (no auth). */
router.get('/templates', (_req, res) => {
  try {
    const data = Object.fromEntries(
      (Object.keys(CONSENT_TEMPLATES) as ConsentTemplateKey[]).map((key) => {
        const t = CONSENT_TEMPLATES[key]
        return [
          key,
          {
            version: t.version,
            documentId: t.documentId,
            title: t.title,
            effectiveDate: t.effectiveDate,
            plainLanguageSummary: t.plainLanguageSummary,
          },
        ]
      })
    )
    res.json({ success: true, data })
  } catch (error: any) {
    logger.error('Error listing consent templates', { error: error.message })
    res.status(500).json({ success: false, error: 'Failed to list templates' })
  }
})

// Get consent by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const consent = await prisma.consent.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!consent) {
      return res.status(404).json({
        success: false,
        error: 'Consent not found'
      })
    }

    res.json({
      success: true,
      data: consent
    })
  } catch (error: any) {
    logger.error('Error fetching consent', { error: error.message, consentId: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consent'
    })
  }
})

// Create new consent
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const validatedData = ConsentCreateSchema.parse(req.body)

    // Generate hash of consent text for verification
    const consentHash = crypto
      .createHash('sha256')
      .update(validatedData.consentText)
      .digest('hex')

    // Check if user already has this type of consent
    const existingConsent = await prisma.consent.findFirst({
      where: {
        userId,
        consentType: validatedData.consentType,
        version: validatedData.version
      }
    })

    if (existingConsent && validatedData.granted) {
      return res.status(400).json({
        success: false,
        error: 'Consent already granted for this version'
      })
    }

    const consent = await prisma.consent.create({
      data: {
        userId,
        consentType: validatedData.consentType,
        version: validatedData.version,
        documentId: validatedData.documentId,
        granted: validatedData.granted,
        grantedAt: validatedData.granted ? new Date() : null,
        signatureData: validatedData.signatureData,
        signatureMethod: validatedData.signatureMethod,
        consentText: validatedData.consentText,
        consentHash,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        ipAddress: req.ip || (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress,
        userAgent: req.get('User-Agent') || undefined
      }
    })

    logger.info('Consent created', {
      consentId: consent.id,
      userId,
      consentType: validatedData.consentType,
      granted: validatedData.granted
    })

    res.status(201).json({
      success: true,
      data: consent
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }

    logger.error('Error creating consent', { error: error.message, userId: req.user?.id })
    res.status(500).json({
      success: false,
      error: 'Failed to create consent'
    })
  }
})

// Update consent (revoke or modify)
router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const validatedData = ConsentUpdateSchema.parse(req.body)

    const existingConsent = await prisma.consent.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existingConsent) {
      return res.status(404).json({
        success: false,
        error: 'Consent not found'
      })
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    if (validatedData.granted !== undefined) {
      updateData.granted = validatedData.granted
      updateData.grantedAt = validatedData.granted ? new Date() : null
    }

    if (validatedData.revokedAt) {
      updateData.revokedAt = new Date(validatedData.revokedAt)
      updateData.granted = false
    }

    if (validatedData.signatureData) {
      updateData.signatureData = validatedData.signatureData
    }

    if (validatedData.signatureMethod) {
      updateData.signatureMethod = validatedData.signatureMethod
    }

    const consent = await prisma.consent.update({
      where: { id },
      data: updateData
    })

    logger.info('Consent updated', {
      consentId: id,
      userId,
      changes: Object.keys(updateData)
    })

    res.json({
      success: true,
      data: consent
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }

    logger.error('Error updating consent', { error: error.message, consentId: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to update consent'
    })
  }
})

// Full template text (public; same source as consent modal)
router.get('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params
    const template = getConsentTemplate(type)

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Consent template not found',
      })
    }

    res.json({
      success: true,
      data: template,
    })
  } catch (error: any) {
    logger.error('Error fetching consent template', { error: error.message, type: req.params.type })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consent template',
    })
  }
})

// Check if user has required consents (version-aware; includes re-consent signal)
router.get('/status/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    if (req.user!.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      })
    }

    const requiredConsents = ['hipaa', 'terms', 'privacy'] as const

    const userConsents = await prisma.consent.findMany({
      where: {
        userId,
        granted: true,
        consentType: { in: [...requiredConsents] },
      },
      orderBy: { createdAt: 'desc' },
    })

    const latestConsents = userConsents.reduce((acc, consent) => {
      if (!acc[consent.consentType] || new Date(consent.createdAt) > new Date(acc[consent.consentType].createdAt)) {
        acc[consent.consentType] = consent
      }
      return acc
    }, {} as Record<string, any>)

    const status = requiredConsents.map((type) => ({
      type,
      granted: !!latestConsents[type]?.granted,
      grantedAt: latestConsents[type]?.grantedAt,
      version: latestConsents[type]?.version,
      expiresAt: latestConsents[type]?.expiresAt,
      isExpired: latestConsents[type]?.expiresAt ? new Date(latestConsents[type].expiresAt) < new Date() : false,
      currentDocumentVersion: CONSENT_TEMPLATES[type as ConsentTemplateKey].version,
      versionMatches:
        latestConsents[type]?.version === CONSENT_TEMPLATES[type as ConsentTemplateKey].version,
    }))

    const compliance = await getClientConsentCompliance(userId)
    const allGranted = compliance.ok

    res.json({
      success: true,
      data: {
        userId,
        status,
        allRequiredConsentsGranted: allGranted,
        missingConsents: [...new Set([...compliance.missing, ...compliance.outdated])],
        missing: compliance.missing,
        outdated: compliance.outdated,
        needsReconsent: compliance.outdated.length > 0,
      },
    })
  } catch (error: any) {
    logger.error('Error checking consent status', { error: error.message, userId: req.params.userId })
    res.status(500).json({
      success: false,
      error: 'Failed to check consent status',
    })
  }
})

export default router
