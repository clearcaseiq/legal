import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { ENV } from '../env'

const router = Router()
const CA_BAR_SEARCH_URL = 'https://apps.calbar.ca.gov/attorney/LicenseeSearch/QuickSearch'

type StateBarVerificationResult = {
  found: boolean
  licenseNumber: string
  state: string
  status?: string
  name?: string
  city?: string
  admissionDate?: string
  profileUrl?: string
  verifiedAt: string
  source: string
  message: string
}

function parseJsonArray(value: string | null | undefined, fallback: any[] = []) {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function buildProfileFallback(attorney: any) {
  return {
    id: `fallback-${attorney.id}`,
    attorneyId: attorney.id,
    attorney,
    bio: attorney.profile || '',
    photoUrl: null,
    specialties: attorney.specialties || JSON.stringify([]),
    languages: JSON.stringify(['English']),
    languageProficiency: null,
    yearsExperience: 0,
    yearsPiExperience: 0,
    totalCases: 0,
    totalSettlements: 0,
    averageSettlement: 0,
    successRate: 0,
    verifiedVerdicts: JSON.stringify([]),
    totalReviews: attorney.totalReviews ?? 0,
    averageRating: attorney.averageRating ?? 0,
    firmName: attorney.lawFirm?.name ?? null,
    firmWebsite: attorney.lawFirm?.website ?? null,
    firmLocations: attorney.lawFirm
      ? JSON.stringify([{
          address: attorney.lawFirm.address,
          city: attorney.lawFirm.city,
          state: attorney.lawFirm.state,
          zip: attorney.lawFirm.zip,
          phone: attorney.lawFirm.phone,
        }])
      : null,
    jurisdictions: JSON.stringify([{ state: 'CA', counties: [], cities: parseJsonArray(attorney.venues).filter((v) => v !== 'CA') }]),
    responseTimeHours: attorney.responseTimeHours ?? 24,
    licenseNumber: null,
    licenseState: null,
    licenseVerified: false,
    licenseFileUrl: null,
    licenseFileName: null,
    licenseVerificationMethod: null,
    licenseVerifiedAt: null,
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ')
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function extractTableCells(rowHtml: string) {
  const cells: string[] = []
  const cellPattern = /<td\b[^>]*>([\s\S]*?)<\/td>/gi
  let match: RegExpExecArray | null
  while ((match = cellPattern.exec(rowHtml))) {
    cells.push(stripHtml(match[1]))
  }
  return cells
}

function extractProfileUrl(rowHtml: string) {
  const hrefMatch = rowHtml.match(/href=["']([^"']*\/attorney\/Licensee\/Detail\/\d+[^"']*)["']/i)
  if (!hrefMatch) return undefined
  const href = decodeHtmlEntities(hrefMatch[1])
  return href.startsWith('http') ? href : new URL(href, 'https://apps.calbar.ca.gov').toString()
}

async function lookupCaliforniaStateBarLicense(
  licenseNumber: string,
  attorneyName: string
): Promise<StateBarVerificationResult> {
  const normalizedLicenseNumber = licenseNumber.replace(/\D/g, '')
  if (!normalizedLicenseNumber) {
    return {
      found: false,
      licenseNumber,
      state: 'CA',
      verifiedAt: new Date().toISOString(),
      source: CA_BAR_SEARCH_URL,
      message: 'California bar number must contain digits.',
    }
  }

  const searchUrl = new URL(CA_BAR_SEARCH_URL)
  searchUrl.searchParams.set('FreeText', normalizedLicenseNumber)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let response: Response
  try {
    response = await fetch(searchUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'ClearCaseIQ license verification (contact: support@clearcaseiq.com)',
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`California State Bar lookup failed with HTTP ${response.status}`)
  }

  const html = await response.text()
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = rowPattern.exec(html))) {
    const rowHtml = match[1]
    if (!rowHtml.includes(normalizedLicenseNumber)) continue

    const cells = extractTableCells(rowHtml)
    if (cells.length < 3) continue

    const [name, status, number, city, admissionDate] = cells
    if (number.replace(/\D/g, '') !== normalizedLicenseNumber) continue

    const isActive = status.toLowerCase() === 'active'
    return {
      found: isActive,
      licenseNumber: normalizedLicenseNumber,
      state: 'CA',
      status,
      name,
      city,
      admissionDate,
      profileUrl: extractProfileUrl(rowHtml),
      verifiedAt: new Date().toISOString(),
      source: searchUrl.toString(),
      message: isActive
        ? `Verified active California State Bar license for ${name}.`
        : `California State Bar record found for ${name}, but status is ${status || 'not active'}.`,
    }
  }

  return {
    found: false,
    licenseNumber: normalizedLicenseNumber,
    state: 'CA',
    name: attorneyName,
    verifiedAt: new Date().toISOString(),
    source: searchUrl.toString(),
    message: 'No matching California State Bar record was found for that bar number.',
  }
}

async function lookupStateBarLicenseRecord(
  licenseNumber: string,
  state: string,
  attorneyName: string
): Promise<StateBarVerificationResult> {
  const normalizedState = state.trim().toUpperCase()
  if (normalizedState !== 'CA') {
    return {
      found: false,
      licenseNumber: licenseNumber.trim(),
      state: normalizedState,
      verifiedAt: new Date().toISOString(),
      source: 'unsupported',
      message: 'Automated State Bar lookup is currently available for California only. Please upload a license document for manual review.',
    }
  }

  return lookupCaliforniaStateBarLicense(licenseNumber.trim(), attorneyName)
}

// Configure multer for license file uploads
const licenseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'licenses')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const licenseUpload = multer({
  storage: licenseStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs and common image formats
    const allowedTypes = /jpeg|jpg|png|gif|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only PDF and image files are allowed'))
    }
  }
})

// Configure multer for attorney profile photo (avatar) uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept when either the extension or the MIME type looks like an image.
    // Some browsers/OS pickers send empty or application/octet-stream mimetypes
    // for otherwise-valid JPEGs/PNGs; requiring both rejected those uploads (CP-579).
    const allowedExt = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname || '')
    const allowedMime = /image\/(jpeg|png|gif|webp)/i.test(file.mimetype || '')
    if (allowedExt || allowedMime) {
      return cb(null, true)
    }
    cb(new Error('Profile photo must be a JPEG, PNG, GIF, or WebP image'))
  }
})

/** Run a multer middleware and surface filter/size errors as JSON 400s (CP-579). */
function runAvatarUpload(req: any, res: any, next: any) {
  avatarUpload.single('photo')(req, res, (err: any) => {
    if (!err) return next()
    const message =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photo must be 5MB or smaller'
        : err.message || 'Profile photo must be a JPEG, PNG, GIF, or WebP image'
    return res.status(400).json({ error: message })
  })
}

// Supporting documents for a "Case Result" (verdict/settlement). Kept private —
// only a reference (url + original name) is stored on the verdict JSON so the
// attorney can attach proof for verification.
const verdictDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'verdict-documents')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
})

const verdictDocUpload = multer({
  storage: verdictDocStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(pdf|docx?)$/i.test(file.originalname || '')
    const allowedMime = /(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/i.test(
      file.mimetype || ''
    )
    if (allowedExt || allowedMime) return cb(null, true)
    cb(new Error('Supporting document must be a PDF or Word (DOC/DOCX) file'))
  },
})

function runVerdictDocUpload(req: any, res: any, next: any) {
  verdictDocUpload.single('document')(req, res, (err: any) => {
    if (!err) return next()
    const message =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Supporting document must be 20MB or smaller'
        : err.message || 'Supporting document must be a PDF or Word (DOC/DOCX) file'
    return res.status(400).json({ error: message })
  })
}

// Upload a supporting document for a case result. Returns a reference the client
// then attaches to the verdict payload on submit.
router.post('/verified-verdict-document', authMiddleware, runVerdictDocUpload, async (req: any, res) => {
  try {
    if (!req.user?.email) return res.status(401).json({ error: 'Authentication required' })
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No document uploaded' })
    res.json({
      url: `/uploads/verdict-documents/${file.filename}`,
      name: file.originalname,
    })
  } catch (error: any) {
    logger.error('Failed to upload verdict document', { error: error.message })
    res.status(500).json({ error: 'Failed to upload supporting document' })
  }
})

// Attorney Profile Management

// Get attorney profile
router.get('/profile', authMiddleware, async (req: any, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    if (!req.user || !req.user.id || !req.user.email) {
      logger.error('Profile request missing user info', { 
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email
      })
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    const userEmail = req.user.email

    logger.info('Profile request', { userId: req.user.id, userEmail })

    // Find attorney by email (attorneys and users share the same email)
    let attorney
    try {
      attorney = await prisma.attorney.findUnique({
        where: { email: userEmail },
        include: { lawFirm: true }
      })
      logger.info('Attorney lookup result', { 
        found: !!attorney, 
        userEmail,
        attorneyId: attorney?.id 
      })
    } catch (dbError: any) {
      logger.error('Database error finding attorney', { 
        error: dbError?.message, 
        stack: dbError?.stack,
        userEmail 
      })
      throw dbError
    }

    if (!attorney) {
      logger.error('Attorney not found for user', { 
        userId: req.user.id, 
        userEmail,
        message: 'Attorney registration may not have completed successfully'
      })
      return res.status(404).json({ 
        error: 'Attorney profile not found. Please complete your attorney registration or contact support.',
        details: process.env.NODE_ENV === 'development' ? `User email: ${userEmail}` : undefined
      })
    }

    const attorneyId = attorney.id

    let profile
    try {
      profile = await prisma.attorneyProfile.findUnique({
        where: { attorneyId },
        include: {
          attorney: true
        }
      })
      logger.info('Profile lookup result', { 
        found: !!profile, 
        attorneyId 
      })
    } catch (dbError: any) {
      logger.error('Database error finding profile', { 
        error: dbError?.message, 
        stack: dbError?.stack,
        attorneyId,
        errorCode: dbError?.code
      })
      return res.json(buildProfileFallback(attorney))
    }

    if (!profile) {
      // Create default profile if doesn't exist
      try {
        const newProfile = await prisma.attorneyProfile.create({
          data: {
            attorneyId,
            bio: '',
            specialties: JSON.stringify([]),
            languages: JSON.stringify(['English']),
            yearsExperience: 0,
            totalCases: 0,
            totalSettlements: 0,
            averageSettlement: 0,
            successRate: 0,
            verifiedVerdicts: JSON.stringify([]),
            totalReviews: 0,
            averageRating: 0
          },
          include: {
            attorney: true
          }
        })
        return res.json({ ...newProfile, verifiedVerdicts: [] })
      } catch (createError: any) {
        logger.warn('Profile create failed; returning attorney fallback profile', {
          attorneyId,
          error: createError?.message,
          errorCode: createError?.code,
        })
        return res.json(buildProfileFallback(attorney))
      }
    }

    // Case results come from their own table now; the key stays for clients.
    res.json({ ...profile, verifiedVerdicts: await listCaseResults(attorneyId) })
  } catch (error: any) {
    logger.error('Failed to get attorney profile', { 
      error: error?.message || String(error), 
      stack: error?.stack,
      userId: req.user?.id,
      userEmail: req.user?.email,
      errorType: error?.constructor?.name,
      errorCode: error?.code
    })
    
    // Ensure we always send a response
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to get profile',
        details: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined,
        requestId: req.id
      })
    }
  }
})

// Update attorney profile
router.put('/profile', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    const userEmail = req.user.email

    // Find attorney by email
    const attorney = await prisma.attorney.findUnique({
      where: { email: userEmail }
    })

    if (!attorney) {
      return res.status(404).json({ 
        error: 'Attorney profile not found. Please complete your attorney registration.'
      })
    }

    const attorneyId = attorney.id
    const {
      // Basic profile
      name,
      bio,
      photoUrl,
      specialties,
      languages,
      languageProficiency: rawLanguageProficiency,
      yearsExperience: rawYearsExperience,
      yearsPiExperience: rawYearsPiExperience,
      totalCases,
      totalSettlements,
      averageSettlement,
      successRate,
      verifiedVerdicts,
      // Firm information
      firmName,
      firmLocations,
      // Jurisdictions
      jurisdictions,
      // Case preferences
      minInjurySeverity,
      excludedCaseTypes,
      minDamagesRange: rawMinDamagesRange,
      maxDamagesRange: rawMaxDamagesRange,
      // Capacity signals
      maxCasesPerWeek: rawMaxCasesPerWeek,
      maxCasesPerMonth: rawMaxCasesPerMonth,
      intakeHours,
      responseTimeHours,
      // Buying preferences
      pricingModel,
      paymentModel,
      subscriptionTier
    } = req.body

    // Defense-in-depth: damages and case-capacity numbers can never be negative
    // and must stay within sane upper bounds. The UI clamps these, but a crafted
    // request could still send out-of-range values, so enforce the same limits
    // server-side. `undefined` is preserved so an omitted field leaves the stored
    // value unchanged rather than clearing it.
    const MAX_DAMAGES = 100_000_000
    const MAX_CASES_PER_WEEK = 1000
    const MAX_CASES_PER_MONTH = 5000
    const MAX_YEARS_EXPERIENCE = 80
    const clampNumber = (value: unknown, max: number): number | null | undefined => {
      if (value === undefined) return undefined
      if (value === null || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : null
    }
    const minDamagesRange = clampNumber(rawMinDamagesRange, MAX_DAMAGES)
    const maxDamagesRange = clampNumber(rawMaxDamagesRange, MAX_DAMAGES)
    const maxCasesPerWeek = clampNumber(rawMaxCasesPerWeek, MAX_CASES_PER_WEEK)
    const maxCasesPerMonth = clampNumber(rawMaxCasesPerMonth, MAX_CASES_PER_MONTH)
    const yearsExperience = clampNumber(rawYearsExperience, MAX_YEARS_EXPERIENCE)

    // Personal-injury tenure cannot exceed time practising law. The ceiling is
    // the incoming years of practice when both are saved together and the stored
    // value otherwise, so editing one of the pair on its own cannot leave the
    // profile claiming more PI years than years at the bar.
    const existingProfile = await prisma.attorneyProfile.findUnique({
      where: { attorneyId },
      select: { yearsExperience: true },
    })
    const yearsExperienceCeiling = Math.min(
      MAX_YEARS_EXPERIENCE,
      yearsExperience ?? existingProfile?.yearsExperience ?? MAX_YEARS_EXPERIENCE,
    )
    const yearsPiExperience = clampNumber(rawYearsPiExperience, yearsExperienceCeiling)

    // Fluency is stored as a language-name -> level map. Only known levels are
    // accepted, and only for languages present in the list being saved, so the
    // map cannot accumulate entries for languages the attorney has removed.
    const PROFICIENCY_LEVELS = ['native', 'professional', 'conversational', 'basic']
    const sanitizeLanguageProficiency = (value: unknown): string | undefined => {
      if (value === undefined || value === null) return undefined
      if (typeof value !== 'object' || Array.isArray(value)) return undefined
      const named = Array.isArray(languages)
        ? languages.filter((l: unknown): l is string => typeof l === 'string').map((l) => l.trim())
        : null
      const out: Record<string, string> = {}
      for (const [rawName, rawLevel] of Object.entries(value as Record<string, unknown>)) {
        const name = rawName.trim().slice(0, 40)
        if (!name) continue
        if (named && !named.includes(name)) continue
        const level = typeof rawLevel === 'string' ? rawLevel.trim().toLowerCase() : ''
        if (!PROFICIENCY_LEVELS.includes(level)) continue
        out[name] = level
      }
      return JSON.stringify(out)
    }
    const languageProficiency = sanitizeLanguageProficiency(rawLanguageProficiency)

    // `verifiedVerdicts` is accepted for backwards compatibility and ignored.
    // Case results are rows now, edited through their own endpoints, and taking
    // a whole array here was the second way an attorney could have marked their
    // own result verified.
    void verifiedVerdicts

    // Cap ZIP and phone length per firm location so a crafted request can't store
    // oversized strings that bypass the client-side maxLength limits.
    const sanitizeFirmLocations = (value: unknown): unknown[] | undefined => {
      if (value === undefined || !Array.isArray(value)) return undefined
      const trim = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : v)
      return value.map((loc) => {
        if (!loc || typeof loc !== 'object') return loc
        const l = loc as Record<string, unknown>
        return { ...l, zip: trim(l.zip, 10), phone: trim(l.phone, 20) }
      })
    }
    const firmLocationsSanitized = sanitizeFirmLocations(firmLocations)

    const profile = await prisma.attorneyProfile.upsert({
      where: { attorneyId },
      update: {
        bio,
        photoUrl,
        specialties: specialties ? JSON.stringify(specialties) : undefined,
        languages: languages ? JSON.stringify(languages) : undefined,
        languageProficiency,
        // yearsExperience is a non-nullable Int; a cleared/invalid value yields null
        // from clampNumber, so coerce to undefined to leave the stored value intact.
        yearsExperience: yearsExperience ?? undefined,
        yearsPiExperience: yearsPiExperience ?? undefined,
        totalCases,
        totalSettlements,
        averageSettlement,
        successRate,
        // Retired column; case results live in AttorneyCaseResult.
        // Firm information
        firmName,
        firmLocations: firmLocationsSanitized ? JSON.stringify(firmLocationsSanitized) : undefined,
        // Jurisdictions
        jurisdictions: jurisdictions ? JSON.stringify(jurisdictions) : undefined,
        // Case preferences
        minInjurySeverity,
        excludedCaseTypes: excludedCaseTypes ? JSON.stringify(excludedCaseTypes) : undefined,
        minDamagesRange,
        maxDamagesRange,
        // Capacity signals
        maxCasesPerWeek,
        maxCasesPerMonth,
        intakeHours: intakeHours ? (intakeHours === '24/7' ? '24/7' : JSON.stringify(intakeHours)) : undefined,
        // Buying preferences
        pricingModel,
        paymentModel,
        subscriptionTier
      },
      create: {
        attorneyId,
        bio: bio || '',
        photoUrl,
        specialties: specialties ? JSON.stringify(specialties) : JSON.stringify([]),
        languages: languages ? JSON.stringify(languages) : JSON.stringify(['English']),
        languageProficiency: languageProficiency ?? null,
        yearsExperience: yearsExperience || 0,
        yearsPiExperience: yearsPiExperience || 0,
        totalCases: totalCases || 0,
        totalSettlements: totalSettlements || 0,
        averageSettlement: averageSettlement || 0,
        successRate: successRate || 0,
        verifiedVerdicts: JSON.stringify([]),
        totalReviews: 0,
        averageRating: 0,
        // Firm information
        firmName: firmName || null,
        firmLocations: firmLocationsSanitized ? JSON.stringify(firmLocationsSanitized) : null,
        // Jurisdictions
        jurisdictions: jurisdictions ? JSON.stringify(jurisdictions) : null,
        // Case preferences
        minInjurySeverity: minInjurySeverity || null,
        excludedCaseTypes: excludedCaseTypes ? JSON.stringify(excludedCaseTypes) : null,
        minDamagesRange: minDamagesRange || null,
        maxDamagesRange: maxDamagesRange || null,
        // Capacity signals
        maxCasesPerWeek: maxCasesPerWeek || null,
        maxCasesPerMonth: maxCasesPerMonth || null,
        intakeHours: intakeHours ? (typeof intakeHours === 'string' && intakeHours === '24/7' ? '24/7' : (Array.isArray(intakeHours) ? JSON.stringify(intakeHours) : intakeHours)) : null,
        // Buying preferences
        pricingModel: pricingModel || null,
        paymentModel: paymentModel || null,
        subscriptionTier: subscriptionTier || null
      }
    })

    const trimmedName = typeof name === 'string' ? name.trim() : undefined
    await prisma.attorney.update({
      where: { id: attorneyId },
      data: {
        responseTimeHours: typeof responseTimeHours === 'number' ? responseTimeHours : undefined,
        // Allow editing the display name; ignore blank submissions.
        name: trimmedName ? trimmedName : undefined,
      }
    })

    // Return the profile with the attorney relation so the client keeps the
    // display name/bio after saving (the upsert result alone omits `attorney`).
    const profileWithAttorney = await prisma.attorneyProfile.findUnique({
      where: { attorneyId },
      include: { attorney: true },
    })
    res.json({
      ...(profileWithAttorney ?? profile),
      verifiedVerdicts: await listCaseResults(attorneyId),
    })
  } catch (error: any) {
    logger.error('Failed to update attorney profile', { error: error.message })
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// Upload attorney profile photo (avatar)
router.post('/photo', authMiddleware, runAvatarUpload, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    const attorney = await prisma.attorney.findUnique({
      where: { email: req.user.email }
    })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney profile not found. Please complete your attorney registration.' })
    }

    const attorneyId = attorney.id
    const newPhotoUrl = `/uploads/avatars/${req.file.filename}`

    let profile = await prisma.attorneyProfile.findUnique({ where: { attorneyId } })
    const previousPhotoUrl = profile?.photoUrl ?? null

    if (!profile) {
      profile = await prisma.attorneyProfile.create({
        data: {
          attorneyId,
          bio: '',
          photoUrl: newPhotoUrl,
          specialties: JSON.stringify([]),
          languages: JSON.stringify(['English']),
          yearsExperience: 0,
          totalCases: 0,
          totalSettlements: 0,
          averageSettlement: 0,
          successRate: 0,
          verifiedVerdicts: JSON.stringify([]),
          totalReviews: 0,
          averageRating: 0,
        }
      })
    } else {
      profile = await prisma.attorneyProfile.update({
        where: { attorneyId },
        data: { photoUrl: newPhotoUrl }
      })
    }

    // Best-effort cleanup of a previously uploaded avatar (ignore external URLs).
    if (previousPhotoUrl && previousPhotoUrl.startsWith('/uploads/avatars/')) {
      const previousPath = path.join(process.cwd(), previousPhotoUrl.replace(/^\/+/, ''))
      fs.promises.unlink(previousPath).catch(() => undefined)
    }

    // Include the attorney relation so the client keeps the display name/bio
    // after uploading a new photo (#113).
    const profileWithAttorney = await prisma.attorneyProfile.findUnique({
      where: { attorneyId },
      include: { attorney: true },
    })
    logger.info('Attorney profile photo uploaded', { attorneyId, fileName: req.file.originalname })
    res.json(profileWithAttorney ?? profile)
  } catch (error: any) {
    logger.error('Failed to upload attorney profile photo', { error: error.message })
    res.status(500).json({ error: 'Failed to upload profile photo' })
  }
})

// Featured Placement Management

// Get featured placement options
router.get('/featured-options', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({
      where: { email: req.user.email }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const attorneyId = attorney.id

    const profile = await prisma.attorneyProfile.findUnique({
      where: { attorneyId }
    })

    const featuredOptions = [
      {
        level: 1,
        name: 'Basic Boost',
        price: 99,
        duration: 30, // days
        description: 'Slight increase in visibility for 30 days',
        features: ['10% visibility boost', 'Priority in search results', 'Featured badge']
      },
      {
        level: 2,
        name: 'Standard Boost',
        price: 199,
        duration: 30,
        description: 'Moderate increase in visibility for 30 days',
        features: ['25% visibility boost', 'Top placement in results', 'Featured badge', 'Profile highlighting']
      },
      {
        level: 3,
        name: 'Premium Boost',
        price: 399,
        duration: 30,
        description: 'Maximum visibility boost for 30 days',
        features: ['50% visibility boost', 'Exclusive top placement', 'Premium badge', 'Profile highlighting', 'Email marketing inclusion']
      },
      {
        level: 4,
        name: 'Elite Boost',
        price: 699,
        duration: 30,
        description: 'Elite placement with exclusive benefits',
        features: ['75% visibility boost', 'Exclusive elite placement', 'Elite badge', 'Full profile highlighting', 'Email marketing inclusion', 'Direct lead routing']
      },
      {
        level: 5,
        name: 'Champion Boost',
        price: 999,
        duration: 30,
        description: 'Ultimate visibility with all premium features',
        features: ['100% visibility boost', 'Champion placement', 'Champion badge', 'Full profile highlighting', 'Email marketing inclusion', 'Direct lead routing', 'Priority support']
      }
    ]

    res.json({
      currentLevel: profile?.boostLevel || 0,
      featuredUntil: profile?.featuredUntil,
      options: featuredOptions
    })
  } catch (error: any) {
    logger.error('Failed to get featured options', { error: error.message })
    res.status(500).json({ error: 'Failed to get featured options' })
  }
})

// Purchase featured placement
router.post('/featured-purchase', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({
      where: { email: req.user.email }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const attorneyId = attorney.id
    const { boostLevel, duration = 30 } = req.body

    const boostPrices = {
      1: 99,
      2: 199,
      3: 399,
      4: 699,
      5: 999
    }

    const price = boostPrices[boostLevel as keyof typeof boostPrices]
    if (!price) {
      return res.status(400).json({ error: 'Invalid boost level' })
    }

    // When Stripe is configured, featured placement must be paid for through the
    // Checkout flow (POST /v1/payments/platform/featured-checkout-session), which
    // grants the boost from the webhook after payment succeeds. This endpoint only
    // grants directly when Stripe is not configured (local/dev), so boosts are
    // never handed out for free in production.
    if (ENV.STRIPE_SECRET_KEY) {
      return res.status(402).json({
        error: 'Payment required',
        paymentRequired: true,
        checkoutEndpoint: '/v1/payments/platform/featured-checkout-session',
      })
    }

    // Calculate featured until date
    const featuredUntil = new Date()
    featuredUntil.setDate(featuredUntil.getDate() + duration)

    const profile = await prisma.attorneyProfile.update({
      where: { attorneyId },
      data: {
        isFeatured: true,
        boostLevel,
        featuredUntil
      }
    })

    // Update attorney dashboard spending
    await prisma.attorneyDashboard.upsert({
      where: { attorneyId },
      update: {
        totalPlatformSpend: {
          increment: price
        }
      },
      create: {
        attorneyId,
        totalPlatformSpend: price
      }
    })

    res.json({
      profile,
      purchase: {
        boostLevel,
        price,
        duration,
        featuredUntil
      }
    })
  } catch (error: any) {
    logger.error('Failed to purchase featured placement', { error: error.message })
    res.status(500).json({ error: 'Failed to purchase featured placement' })
  }
})

// Verified Verdicts Management

/**
 * Case results moved to the AttorneyCaseResult table so the review queue can
 * select pending rows across all attorneys. The profile payload still exposes
 * them under `verifiedVerdicts`, which is the shape every client already reads.
 */
const CASE_RESULT_STATUSES = ['pending', 'verified', 'rejected'] as const

function serializeCaseResult(row: any) {
  return {
    id: row.id,
    caseType: row.caseType,
    resultType: row.resultType,
    settlementAmount: row.settlementAmount,
    caseDescription: row.caseDescription,
    date: row.date,
    venue: row.venue,
    caseNumber: row.caseNumber,
    documentUrl: row.documentUrl,
    documentName: row.documentName,
    status: row.status,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    addedAt: row.createdAt,
  }
}

export async function listCaseResults(attorneyId: string) {
  const rows = await prisma.attorneyCaseResult.findMany({
    where: { attorneyId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(serializeCaseResult)
}

/** Attaches the table-backed results to a profile row under the legacy key. */
async function withCaseResults(profile: any, attorneyId: string) {
  return { ...profile, verifiedVerdicts: await listCaseResults(attorneyId) }
}

/** The fields an attorney may set. `status` is deliberately absent. */
function readCaseResultInput(body: any) {
  const caseType = String(body?.caseType || '').trim()
  const amount = Number(body?.settlementAmount)
  return {
    caseType,
    resultType: body?.resultType === 'verdict' ? 'verdict' : 'settlement',
    settlementAmount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
    caseDescription: body?.caseDescription ? String(body.caseDescription).slice(0, 2000) : null,
    date: body?.date ? String(body.date).slice(0, 20) : null,
    venue: body?.venue ? String(body.venue).slice(0, 200) : null,
    caseNumber: body?.caseNumber ? String(body.caseNumber).slice(0, 100) : null,
    documentUrl: body?.documentUrl ? String(body.documentUrl) : null,
    documentName: body?.documentName ? String(body.documentName).slice(0, 255) : null,
  }
}

// Add case result
router.post('/verified-verdicts', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const input = readCaseResultInput(req.body)
    if (!input.caseType) {
      return res.status(400).json({ error: 'Case type is required' })
    }

    // Always starts unreviewed. Only the admin review endpoints move it on.
    const row = await prisma.attorneyCaseResult.create({
      data: { ...input, attorneyId: attorney.id, status: 'pending' },
    })

    const profile = await prisma.attorneyProfile.findUnique({ where: { attorneyId: attorney.id } })
    res.json({
      verdict: serializeCaseResult(row),
      profile: profile ? await withCaseResults(profile, attorney.id) : null,
    })
  } catch (error: any) {
    logger.error('Failed to add case result', { error: error.message })
    res.status(500).json({ error: 'Failed to add case result' })
  }
})

// List case results
router.get('/verified-verdicts', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    res.json({ verdicts: await listCaseResults(attorney.id) })
  } catch (error: any) {
    logger.error('Failed to get case results', { error: error.message })
    res.status(500).json({ error: 'Failed to get case results' })
  }
})

// Update case result
router.put('/verified-verdicts/:verdictId', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const existing = await prisma.attorneyCaseResult.findFirst({
      where: { id: req.params.verdictId, attorneyId: attorney.id },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Case result not found' })
    }

    const input = readCaseResultInput(req.body)
    if (!input.caseType) {
      return res.status(400).json({ error: 'Case type is required' })
    }

    // Editing the facts invalidates any prior decision, otherwise a modest
    // result could be approved and then have its number changed afterwards.
    const factsChanged =
      input.caseType !== existing.caseType ||
      input.resultType !== existing.resultType ||
      input.settlementAmount !== existing.settlementAmount ||
      input.date !== existing.date ||
      input.venue !== existing.venue ||
      input.caseNumber !== existing.caseNumber
    const reset =
      factsChanged && existing.status !== 'pending'
        ? { status: 'pending', reviewedById: null, reviewedAt: null, reviewNote: null }
        : {}

    const row = await prisma.attorneyCaseResult.update({
      where: { id: existing.id },
      data: { ...input, ...reset },
    })

    const profile = await prisma.attorneyProfile.findUnique({ where: { attorneyId: attorney.id } })
    res.json({
      verdict: serializeCaseResult(row),
      profile: profile ? await withCaseResults(profile, attorney.id) : null,
    })
  } catch (error: any) {
    logger.error('Failed to update case result', { error: error.message })
    res.status(500).json({ error: 'Failed to update case result' })
  }
})

// Delete case result
router.delete('/verified-verdicts/:verdictId', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Scoped by attorney so an id from another firm's profile deletes nothing.
    const deleted = await prisma.attorneyCaseResult.deleteMany({
      where: { id: req.params.verdictId, attorneyId: attorney.id },
    })
    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Case result not found' })
    }

    const profile = await prisma.attorneyProfile.findUnique({ where: { attorneyId: attorney.id } })
    res.json({
      verdicts: await listCaseResults(attorney.id),
      profile: profile ? await withCaseResults(profile, attorney.id) : null,
    })
  } catch (error: any) {
    logger.error('Failed to delete case result', { error: error.message })
    res.status(500).json({ error: 'Failed to delete case result' })
  }
})

// Performance Analytics

// Get attorney performance metrics
router.get('/performance', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findUnique({
      where: { email: req.user.email }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const attorneyId = attorney.id
    const { period = 'monthly', startDate, endDate } = req.query

    // Get dashboard metrics
    const dashboard = await prisma.attorneyDashboard.findUnique({
      where: { attorneyId }
    })

    // Get lead analytics
    const analytics = await prisma.leadAnalytics.findMany({
      where: {
        attorneyId,
        periodType: period,
        ...(startDate && endDate && {
          periodStart: { gte: new Date(startDate as string) },
          periodEnd: { lte: new Date(endDate as string) }
        })
      },
      orderBy: { periodStart: 'desc' }
    })

    // Get recent reviews
    const reviews = await prisma.attorneyReview.findMany({
      where: { attorneyId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Calculate performance metrics
    const totalLeads = analytics.reduce((sum, a) => sum + a.totalLeads, 0)
    const totalAccepted = analytics.reduce((sum, a) => sum + a.leadsAccepted, 0)
    const totalConverted = analytics.reduce((sum, a) => sum + a.leadsConverted, 0)
    const leadScope = {
      OR: [
        { assignedAttorneyId: attorneyId },
        {
          assessment: {
            introductions: {
              some: { attorneyId }
            }
          }
        }
      ]
    }
    let totalFees = analytics.reduce((sum, a) => sum + a.totalFees, 0)
    try {
      const paymentTotals = await prisma.billingPayment.aggregate({
        where: {
          assessment: {
            leadSubmission: {
              is: leadScope
            }
          },
          ...(startDate && endDate && {
            receivedAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string)
            }
          })
        },
        _sum: {
          amount: true
        }
      })
      totalFees = Number(paymentTotals._sum.amount ?? 0)
    } catch (billingError: any) {
      logger.warn('Failed to aggregate attorney performance payments', {
        error: billingError?.message,
        attorneyId
      })
    }
    const totalPlatformSpend = Number(dashboard?.totalPlatformSpend ?? 0)

    const performance = {
      leadMetrics: {
        totalLeads,
        acceptanceRate: totalLeads > 0 ? (totalAccepted / totalLeads) * 100 : 0,
        conversionRate: totalAccepted > 0 ? (totalConverted / totalAccepted) * 100 : 0,
        overallConversionRate: totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0
      },
      financialMetrics: {
        feesCollectedFromPayments: totalFees,
        averageFee: totalConverted > 0 ? totalFees / totalConverted : 0,
        platformSpend: totalPlatformSpend,
        roi: totalPlatformSpend > 0 ? (totalFees / totalPlatformSpend) : 0
      },
      reviews: {
        totalReviews: reviews.length,
        averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
        recentReviews: reviews.slice(0, 5)
      },
      analytics
    }

    res.json(performance)
  } catch (error: any) {
    logger.error('Failed to get performance metrics', { error: error.message })
    res.status(500).json({ error: 'Failed to get performance metrics' })
  }
})

// Attorney License Management

// Upload attorney license file
router.post('/license/upload', authMiddleware, licenseUpload.single('licenseFile'), async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No license file uploaded' })
    }

    const userEmail = req.user.email
    const { licenseNumber, licenseState, verificationMethod = 'manual_upload' } = req.body

    // Find attorney by email
    const attorney = await prisma.attorney.findUnique({
      where: { email: userEmail }
    })

    if (!attorney) {
      return res.status(404).json({ 
        error: 'Attorney profile not found. Please complete your attorney registration.'
      })
    }

    const attorneyId = attorney.id

    // Get or create profile
    let profile = await prisma.attorneyProfile.findUnique({
      where: { attorneyId }
    })

    if (!profile) {
      profile = await prisma.attorneyProfile.create({
        data: {
          attorneyId,
          bio: '',
          specialties: JSON.stringify([]),
          languages: JSON.stringify(['English']),
          yearsExperience: 0,
          totalCases: 0,
          totalSettlements: 0,
          averageSettlement: 0,
          successRate: 0,
          verifiedVerdicts: JSON.stringify([]),
          totalReviews: 0,
          averageRating: 0
        }
      })
    }

    // Update profile with license information
    const updatedProfile = await prisma.attorneyProfile.update({
      where: { attorneyId },
      data: {
        licenseNumber: licenseNumber || null,
        licenseState: licenseState || null,
        licenseFileUrl: `/uploads/licenses/${req.file.filename}`,
        licenseFileName: req.file.originalname,
        // A file upload is never proof of verification: verification only happens
        // through the server-side state-bar lookup endpoint. Record the document
        // as a manual upload and leave licenseVerified/At untouched so a client
        // can neither self-verify nor un-verify a genuine prior lookup.
        licenseVerificationMethod: 'manual_upload',
      }
    })

    logger.info('License file uploaded', {
      attorneyId,
      licenseNumber,
      licenseState,
      verificationMethod,
      fileName: req.file.originalname
    })

    res.json({
      success: true,
      profile: updatedProfile,
      message: 'License file uploaded successfully'
    })
  } catch (error: any) {
    logger.error('Failed to upload license file', { 
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ 
      error: 'Failed to upload license file',
      details: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
    })
  }
})

// State bar lookup through official public state bar sources where supported.
router.post('/license/state-bar-lookup', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    const { licenseNumber, state } = req.body

    if (!licenseNumber || !state) {
      return res.status(400).json({ 
        error: 'License number and state are required'
      })
    }

    // Find attorney by email
    const attorney = await prisma.attorney.findUnique({
      where: { email: req.user.email }
    })

    if (!attorney) {
      return res.status(404).json({ 
        error: 'Attorney profile not found. Please complete your attorney registration.'
      })
    }

    const attorneyId = attorney.id

    const verificationResult = await lookupStateBarLicenseRecord(String(licenseNumber), String(state), attorney.name)

    // Get or create profile
    let profile = await prisma.attorneyProfile.findUnique({
      where: { attorneyId }
    })

    if (!profile) {
      profile = await prisma.attorneyProfile.create({
        data: {
          attorneyId,
          bio: '',
          specialties: JSON.stringify([]),
          languages: JSON.stringify(['English']),
          yearsExperience: 0,
          totalCases: 0,
          totalSettlements: 0,
          averageSettlement: 0,
          successRate: 0,
          verifiedVerdicts: JSON.stringify([]),
          totalReviews: 0,
          averageRating: 0
        }
      })
    }

    // Store lookup data even when the result is not verified, but fail closed.
    const updatedProfile = await prisma.attorneyProfile.update({
      where: { attorneyId },
      data: {
        licenseNumber: verificationResult.licenseNumber,
        licenseState: verificationResult.state,
        licenseVerified: verificationResult.found,
        licenseVerifiedAt: verificationResult.found ? new Date() : null,
        licenseVerificationMethod: 'state_bar_lookup'
      }
    })

    logger.info('State bar lookup completed', {
      attorneyId,
      licenseNumber: verificationResult.licenseNumber,
      state: verificationResult.state,
      status: verificationResult.status,
      verified: verificationResult.found,
      source: verificationResult.source
    })

    if (!verificationResult.found) {
      return res.status(422).json({
        success: false,
        verification: verificationResult,
        profile: updatedProfile,
        error: verificationResult.message,
      })
    }

    res.json({
      success: true,
      verification: verificationResult,
      profile: updatedProfile,
      message: verificationResult.message
    })
  } catch (error: any) {
    logger.error('Failed to perform state bar lookup', { 
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ 
      error: 'Failed to perform state bar lookup',
      details: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
    })
  }
})

// Serve license file (with authentication)
router.get('/license/file', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    const userEmail = req.user.email

    // Find attorney by email
    const attorney = await prisma.attorney.findUnique({
      where: { email: userEmail }
    })

    if (!attorney) {
      return res.status(404).json({ 
        error: 'Attorney profile not found.'
      })
    }

    const attorneyId = attorney.id

    const profile = await prisma.attorneyProfile.findUnique({
      where: { attorneyId }
    })

    if (!profile || !profile.licenseFileUrl) {
      return res.status(404).json({ 
        error: 'License file not found'
      })
    }

    // Construct full file path
    const filePath = path.join(process.cwd(), profile.licenseFileUrl)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'License file not found on server'
      })
    }

    // Send file
    res.sendFile(filePath)
  } catch (error: any) {
    logger.error('Failed to serve license file', { 
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ 
      error: 'Failed to serve license file',
      details: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
    })
  }
})

// Get license status
router.get('/license/status', authMiddleware, async (req: any, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    if (!req.user || !req.user.email) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    const userEmail = req.user.email

    // Find attorney by email
    const attorney = await prisma.attorney.findUnique({
      where: { email: userEmail }
    })

    if (!attorney) {
      return res.status(404).json({ 
        error: 'Attorney profile not found. Please complete your attorney registration.'
      })
    }

    const attorneyId = attorney.id

    let profile
    try {
      profile = await prisma.attorneyProfile.findUnique({
        where: { attorneyId }
      })
    } catch (dbError: any) {
      logger.warn('License status profile fetch failed; returning unverified fallback', {
        attorneyId,
        error: dbError?.message,
        errorCode: dbError?.code,
      })
      return res.json({
        hasLicense: false,
        licenseNumber: null,
        licenseState: null,
        licenseVerified: false,
        licenseFileUrl: null,
        licenseVerificationMethod: null
      })
    }

    if (!profile) {
      return res.json({
        hasLicense: false,
        licenseNumber: null,
        licenseState: null,
        licenseVerified: false,
        licenseFileUrl: null,
        licenseVerificationMethod: null
      })
    }

    res.json({
      hasLicense: !!(profile.licenseNumber || profile.licenseFileUrl),
      licenseNumber: profile.licenseNumber,
      licenseState: profile.licenseState,
      licenseVerified: profile.licenseVerified,
      licenseFileUrl: profile.licenseFileUrl ? `/v1/attorney-profile/license/file` : null,
      licenseFileName: profile.licenseFileName,
      licenseVerificationMethod: profile.licenseVerificationMethod,
      licenseVerifiedAt: profile.licenseVerifiedAt
    })
  } catch (error: any) {
    logger.error('Failed to get license status', { 
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ 
      error: 'Failed to get license status',
      details: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
    })
  }
})

// Public attorney profile (for lead matching)

// Get public attorney profiles for lead matching
router.get('/public-profiles', async (req: any, res) => {
  try {
    const { 
      caseType, 
      venue, 
      specialties, 
      minRating, 
      maxDistance,
      zipCode,
      isFeatured,
      page = 1,
      limit = 20
    } = req.query

    const whereClause: any = {
      attorney: {
        isActive: true,
        isVerified: true
      }
    }

    if (isFeatured === 'true') {
      whereClause.isFeatured = true
      whereClause.featuredUntil = { gte: new Date() }
    }

    if (minRating) {
      whereClause.averageRating = { gte: parseFloat(minRating as string) }
    }

    const profiles = await prisma.attorneyProfile.findMany({
      where: whereClause,
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specialties: true,
            venues: true,
            responseTimeHours: true,
            averageRating: true,
            totalReviews: true,
            isVerified: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { boostLevel: 'desc' },
        { averageRating: 'desc' }
      ],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    })

    // Filter by case type and venue (basic filtering)
    let filteredProfiles = profiles
    if (caseType || venue) {
      filteredProfiles = profiles.filter(profile => {
        const attorneySpecialties = profile.attorney.specialties.toLowerCase()
        const attorneyVenues = profile.attorney.venues.toLowerCase()
        
        const matchesCaseType = !caseType || attorneySpecialties.includes(caseType.toLowerCase())
        const matchesVenue = !venue || attorneyVenues.includes(venue.toLowerCase())
        
        return matchesCaseType && matchesVenue
      })
    }

    res.json({
      profiles: filteredProfiles,
      totalCount: filteredProfiles.length,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })
  } catch (error: any) {
    logger.error('Failed to get public profiles', { error: error.message })
    res.status(500).json({ error: 'Failed to get public profiles' })
  }
})

export default router
