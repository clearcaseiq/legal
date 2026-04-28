import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  getAssessment,
  getAssessmentCommandCenter,
  predict,
  calculateSOL,
  associateAssessments,
  getEvidenceFiles,
  getSimilarCaseOutcomes,
  updateAssessment,
  getMedicalChronology,
  getCasePreparation,
  getPlaintiffMedicalReview,
  getSettlementBenchmarks,
  savePlaintiffMedicalReview,
  searchAttorneys,
  submitCaseForReview,
  type PlaintiffMedicalReviewEdit,
  type PlaintiffMedicalReviewPayload,
  type PlaintiffMedicalReviewStatus,
} from '../lib/api-plaintiff'
import ChatGPTAnalysis from '../components/ChatGPTAnalysis'
import { formatPercentage, formatCurrency } from '../lib/formatters'
import { ResultsPanelSkeleton } from '../components/PageSkeletons'
import PlaintiffCaseCommandCenter from '../components/PlaintiffCaseCommandCenter'
import PlaintiffMedicalChronology from '../components/PlaintiffMedicalChronology'
import { useLanguage } from '../contexts/LanguageContext'
import type { CaseCommandCenter } from '../lib/api'
import { loadPlaintiffSessionSummary } from '../hooks/usePlaintiffSessionSummary'
import { getStoredRole, hasValidAuthToken } from '../lib/auth'
import {
  AlertTriangle,
  CheckCircle,
  Calendar,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Star
} from 'lucide-react'

function initialPlaintiffLoggedInState(): boolean | null {
  try {
    if (typeof window === 'undefined') return null
    if (!hasValidAuthToken()) return false
    const role = getStoredRole()
    if (role === 'attorney' || role === 'admin') return false
    return true
  } catch {
    return false
  }
}

const ResultsSubmittedView = lazy(() =>
  import('../components/ResultsDeferredContent').then((module) => ({ default: module.ResultsSubmittedView }))
)
const ResultsReportDetails = lazy(() =>
  import('../components/ResultsDeferredContent').then((module) => ({ default: module.ResultsReportDetails }))
)

interface Assessment {
  id: string
  claimType: string
  venue?: { state: string; county?: string }
  venueState?: string
  venueCounty?: string
  status: string
  facts: any
  created_at: string
  submittedForReview?: boolean
  latest_prediction?: any
}

interface SimilarCase {
  id: string
  description: string
  venue: string
  injuryType: string
  medicalBills: number
  settlementAmount: number
  duration: string
  keyFactors: string[]
}

type ResultsTab = 'liability' | 'medical' | 'documents' | 'value' | 'attorney'

type TimelineEstimate = {
  label: string
  stage: string
  confidence: 'low' | 'medium' | 'high'
  drivers: string[]
}

function formatClaimTypeLabel(claimType?: string) {
  if (!claimType) return 'personal injury'
  const labels: Record<string, string> = {
    auto: 'auto accident',
    slip_and_fall: 'slip and fall',
    workplace: 'workplace injury',
    medmal: 'medical malpractice',
    dog_bite: 'dog bite',
    product: 'product liability',
    assault: 'assault',
    toxic: 'toxic exposure',
  }
  return labels[claimType] || claimType.replace(/_/g, ' ')
}

function formatVenueLabel(venueState?: string, venueCounty?: string) {
  const normalizedCounty = venueCounty
    ? /county/i.test(venueCounty) ? venueCounty : `${venueCounty} County`
    : ''
  const normalizedState = venueState === 'CA' ? 'CA' : venueState || ''
  return [normalizedCounty, normalizedState].filter(Boolean).join(', ')
}

function normalizeReportText(value?: string | null) {
  return (value ?? '')
    .replace(/\bnarrativ\b/gi, 'narrative')
    .trim()
}

function getMissingDocAction(item: any, assessmentId?: string) {
  const label = String(item?.label ?? '').toLowerCase()
  if (label.includes('hipaa')) {
    return {
      label: 'Complete HIPAA authorization',
      to: '/hipaa-authorization',
    }
  }

  const uploadLabel = item?.label ? `Upload ${String(item.label).toLowerCase()}` : 'Upload document'
  return {
    label: uploadLabel,
    to: assessmentId ? `/evidence-upload/${assessmentId}` : '/evidence-upload',
  }
}

function getResponseBadge(attorney: any) {
  return attorney.responseBadge || ((attorney.responseTimeHours || 24) <= 8 ? 'Same-day replies' : 'Replies within 24h')
}

function getAttorneyPracticePreview(
  attorney: any,
  context?: {
    venueState?: string
    venueCounty?: string
  }
) {
  const specialties = Array.isArray(attorney.specialties) ? attorney.specialties.filter(Boolean) : []
  const venues = Array.isArray(attorney.venues) ? attorney.venues.filter(Boolean) : []
  const localVenue = formatVenueLabel(context?.venueState, context?.venueCounty)
  const location = localVenue || attorney.law_firm?.state || venues[0]
  const pieces = [
    specialties.slice(0, 2).map((value: string) => formatClaimTypeLabel(value)).join(' + '),
    location ? `${localVenue ? 'Serves' : 'Practices in'} ${location}` : '',
    attorney.yearsExperience ? `${attorney.yearsExperience}+ years experience` : '',
  ].filter(Boolean)

  return pieces.join(' • ')
}

function getAttorneyWhyMatched(
  attorney: any,
  context?: {
    assessmentClaimType?: string
    venueState?: string
    venueCounty?: string
  }
) {
  const specialty = context?.assessmentClaimType
    ? formatClaimTypeLabel(context.assessmentClaimType)
    : Array.isArray(attorney.specialties) && attorney.specialties[0]
      ? formatClaimTypeLabel(attorney.specialties[0])
      : 'similar cases'
  const venue = formatVenueLabel(context?.venueState, context?.venueCounty)
    || attorney.law_firm?.state
    || (Array.isArray(attorney.venues) ? attorney.venues[0] : '')
  return `Why matched: strong for ${specialty} matters${venue ? ` in ${venue}` : ''}.`
}

function buildTimelineEstimate(params: {
  claimType?: string
  missingDocCount: number
  treatmentGapCount: number
  hasTreatment: boolean
  evidenceCount: number
  severityLevel?: number
  chronologyCount: number
}): TimelineEstimate {
  const ranges: Record<string, [number, number]> = {
    auto: [6, 12],
    slip_and_fall: [8, 14],
    workplace: [6, 12],
    medmal: [18, 30],
    dog_bite: [5, 10],
    product: [12, 24],
    assault: [8, 16],
    toxic: [18, 36],
  }
  const [baseMin, baseMax] = ranges[params.claimType || ''] || [8, 16]
  const missingDocPenalty = params.missingDocCount >= 4 ? 4 : params.missingDocCount >= 2 ? 2 : params.missingDocCount === 1 ? 1 : 0
  const treatmentGapPenalty = params.treatmentGapCount > 0 ? 2 : 0
  const noTreatmentPenalty = params.hasTreatment ? 0 : 2
  const severeCasePenalty = (params.severityLevel || 0) >= 3 ? 4 : 0
  const lowEvidencePenalty = params.evidenceCount === 0 ? 2 : 0
  const chronologyBonus = params.chronologyCount >= 3 ? -1 : 0

  const minMonths = Math.max(3, baseMin + missingDocPenalty + treatmentGapPenalty + noTreatmentPenalty + chronologyBonus)
  const maxMonths = Math.max(
    minMonths + 2,
    baseMax + missingDocPenalty + treatmentGapPenalty + noTreatmentPenalty + severeCasePenalty + lowEvidencePenalty
  )

  const drivers: string[] = []
  if (params.claimType === 'medmal') drivers.push('Medical malpractice claims usually take longer because expert review is often needed.')
  if (params.missingDocCount > 0) drivers.push(`${params.missingDocCount} missing document${params.missingDocCount === 1 ? '' : 's'} may delay attorney review and demand preparation.`)
  if (!params.hasTreatment) drivers.push('No treatment has been documented yet, which usually slows valuation and negotiation.')
  if (params.treatmentGapCount > 0) drivers.push('Treatment gaps can extend investigation because attorneys and insurers will ask follow-up questions.')
  if (drivers.length === 0) drivers.push('Your file looks organized enough for a more typical pre-litigation timeline.')

  const confidence: TimelineEstimate['confidence'] =
    params.missingDocCount === 0 && params.evidenceCount >= 2
      ? 'high'
      : params.missingDocCount <= 2
        ? 'medium'
        : 'low'

  const stage =
    params.missingDocCount > 0
      ? 'Document collection'
      : params.hasTreatment
        ? 'Attorney-review ready'
        : 'Early intake'

  return {
    label: `${minMonths}-${maxMonths} months`,
    stage,
    confidence,
    drivers
  }
}

function upsertMedicalReviewEdit(
  edits: PlaintiffMedicalReviewEdit[],
  eventId: string,
  field: keyof PlaintiffMedicalReviewEdit,
  value: string | boolean,
) {
  const next = [...edits]
  const index = next.findIndex((item) => item.eventId === eventId)
  const current = index >= 0 ? next[index] : { eventId }
  const updated = {
    ...current,
    [field]: value,
  } as PlaintiffMedicalReviewEdit

  if (index >= 0) next[index] = updated
  else next.push(updated)

  return next
}

export default function Results() {
  const { t } = useLanguage()
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [searchParams] = useSearchParams()
  const reviewRequested = searchParams.get('review') === '1'
  const resolvedAssessmentId =
    assessmentId && assessmentId !== 'undefined' && assessmentId !== 'null'
      ? assessmentId
      : undefined
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [sol, setSol] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(initialPlaintiffLoggedInState)
  const [resubmitLoading, setResubmitLoading] = useState(false)
  const [resubmitMessage, setResubmitMessage] = useState<string | null>(null)
  const [evidenceCount, setEvidenceCount] = useState(0)
  const [evidenceFiles, setEvidenceFiles] = useState<{ category?: string }[]>([])
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([])
  const [templateCopied, setTemplateCopied] = useState(false)
  const [wageLossForm, setWageLossForm] = useState({
    employerName: '',
    supervisorContact: '',
    positionTitle: '',
    datesMissed: '',
    reasonMissed: '',
    hourlyRate: '',
    typicalHours: '',
    notes: ''
  })
  const [wageLossHydrated, setWageLossHydrated] = useState(false)
  const [wageLossSaving, setWageLossSaving] = useState(false)
  const [wageLossStatus, setWageLossStatus] = useState<string | null>(null)
  const [coachQuestion, setCoachQuestion] = useState('')
  const [coachAnswer, setCoachAnswer] = useState<string | null>(null)
  const [medicalChronology, setMedicalChronology] = useState<any[]>([])
  const [casePreparation, setCasePreparation] = useState<any>(null)
  const [settlementBenchmarks, setSettlementBenchmarks] = useState<any>(null)
  const [plaintiffMedicalReview, setPlaintiffMedicalReview] = useState<PlaintiffMedicalReviewPayload | null>(null)
  const [medicalReviewSaving, setMedicalReviewSaving] = useState(false)
  const [medicalReviewStatus, setMedicalReviewStatus] = useState<string | null>(null)
  const [medicalReviewError, setMedicalReviewError] = useState<string | null>(null)
  const [matchedAttorneys, setMatchedAttorneys] = useState<any[]>([])
  const [attorneySearchLoading, setAttorneySearchLoading] = useState(false)
  const [rankedAttorneyIds, setRankedAttorneyIds] = useState<string[]>([])
  const [autoReviewHandled, setAutoReviewHandled] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [caseSubmittedForReview, setCaseSubmittedForReview] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ firstName: '', email: '', phone: '', preferredContactMethod: 'phone' as 'phone' | 'text' | 'email' })
  const [sendHipaaConsent, setSendHipaaConsent] = useState(false)
  const [contactFormError, setContactFormError] = useState<string | null>(null)
  const [commandCenter, setCommandCenter] = useState<CaseCommandCenter | null>(null)
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('attorney')
  const medicalReviewRef = useRef<HTMLDivElement | null>(null)

  const parsedFacts = (() => {
    if (typeof assessment?.facts === 'string') {
      try {
        return JSON.parse(assessment.facts)
      } catch {
        return {}
      }
    }
    return assessment?.facts || {}
  })()

  const venueState = assessment?.venue?.state || assessment?.venueState || 'Unknown'
  const venueCounty = assessment?.venue?.county || assessment?.venueCounty
  const hasHipaaConsent = parsedFacts?.consents?.hipaa === true

  const refreshMatchedAttorneys = async () => {
    if (!assessment || !venueState) return []
    try {
      setAttorneySearchLoading(true)
      const data = await searchAttorneys({
        venue: venueState,
        claim_type: assessment.claimType,
        limit: 3
      })
      const list = (Array.isArray(data) ? data : (data?.attorneys ?? [])).slice(0, 3)
      setMatchedAttorneys(list)
      setRankedAttorneyIds(list.map((attorney: any) => attorney.id || attorney.attorney_id).filter(Boolean).slice(0, 3))
      return list
    } catch {
      setMatchedAttorneys([])
      setRankedAttorneyIds([])
      return []
    } finally {
      setAttorneySearchLoading(false)
    }
  }

  const openSendModal = async (medicalReviewStatusOverride?: PlaintiffMedicalReviewStatus) => {
    const currentMedicalReviewStatus = medicalReviewStatusOverride ?? plaintiffMedicalReview?.review.status ?? 'pending'
    if (currentMedicalReviewStatus === 'pending') {
      setMedicalReviewError('Please confirm your medical story or skip this step before sending your case to attorneys.')
      medicalReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setContactFormError(null)
    setSendHipaaConsent(hasHipaaConsent)
    if (isLoggedIn) {
      loadPlaintiffSessionSummary().then((session) => {
        const user = session.user
        setContactForm(prev => ({
          firstName: user?.firstName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          preferredContactMethod: prev.preferredContactMethod
        }))
      }).catch(() => {})
    }
    setSendModalOpen(true)
    void refreshMatchedAttorneys()
  }

  const rankedAttorneyCards = rankedAttorneyIds
    .map((attorneyId) => matchedAttorneys.find((attorney) => (attorney.id || attorney.attorney_id) === attorneyId))
    .filter(Boolean)

  const moveRankedAttorney = (attorneyId: string, direction: -1 | 1) => {
    setRankedAttorneyIds((current) => {
      const index = current.indexOf(attorneyId)
      const targetIndex = index + direction
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }
      const next = [...current]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const persistPlaintiffMedicalReview = async (options?: {
    status?: 'pending' | 'confirmed' | 'skipped'
    successMessage?: string
  }) => {
    if (!resolvedAssessmentId || !plaintiffMedicalReview) return
    try {
      setMedicalReviewSaving(true)
      setMedicalReviewError(null)
      setMedicalReviewStatus(null)
      const nextReview = await savePlaintiffMedicalReview(resolvedAssessmentId, {
        status: options?.status,
        edits: plaintiffMedicalReview?.review?.edits ?? [],
      })
      setPlaintiffMedicalReview(nextReview)
      setMedicalChronology(Array.isArray(nextReview.chronology) ? nextReview.chronology : [])
      setMedicalReviewStatus(
        options?.successMessage ||
          (options?.status === 'confirmed'
            ? 'Your medical story is confirmed.'
            : options?.status === 'skipped'
              ? 'You can still send your case now, and attorneys can follow up if needed.'
              : 'Your medical-story updates were saved.')
      )
      if (options?.status === 'confirmed' || options?.status === 'skipped') {
        setActiveResultsTab('attorney')
        window.setTimeout(() => {
          document.getElementById('attorney-handoff')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          if (reviewRequested) {
            void openSendModal(options.status)
          }
        }, 100)
      }
    } catch (error: any) {
      setMedicalReviewError(error?.response?.data?.error || 'We could not save your medical-story review. Please try again.')
    } finally {
      setMedicalReviewSaving(false)
    }
  }

  const handleMedicalReviewEditChange = (
    eventId: string,
    field: keyof PlaintiffMedicalReviewEdit,
    value: string | boolean,
  ) => {
    setMedicalReviewStatus(null)
    setMedicalReviewError(null)
    setPlaintiffMedicalReview((current) => {
      if (!current) return current
      return {
        ...current,
        review: {
          ...(current.review ?? {}),
          status: 'pending',
          confirmedAt: undefined,
          skippedAt: undefined,
          edits: upsertMedicalReviewEdit(current?.review?.edits ?? [], eventId, field, value),
        },
      }
    })
  }

  const handleSubmitForReview = async () => {
    if (!resolvedAssessmentId) return
    const { firstName, email, phone, preferredContactMethod } = contactForm
    if (!firstName?.trim()) {
      setContactFormError('First name is required')
      return
    }
    if (!email?.trim()) {
      setContactFormError('Email is required')
      return
    }
    if (!phone?.trim()) {
      setContactFormError('Phone number is required')
      return
    }
    if (!hasHipaaConsent && !sendHipaaConsent) {
      setContactFormError('HIPAA authorization is required before sending your case to attorneys')
      return
    }
    let selectedRankedAttorneyIds = rankedAttorneyIds
    if (attorneySearchLoading) {
      setContactFormError('Please wait while we load your attorney matches.')
      return
    }
    if (selectedRankedAttorneyIds.length === 0) {
      const refreshedMatches = await refreshMatchedAttorneys()
      if (refreshedMatches.length > 0) {
        selectedRankedAttorneyIds = refreshedMatches
          .map((attorney: any) => attorney.id || attorney.attorney_id)
          .filter(Boolean)
          .slice(0, 3)
      }
    }
    try {
      setSubmitLoading(true)
      setContactFormError(null)
      // Link case to user's account so it appears on their dashboard
      if (isLoggedIn) {
        try {
          await associateAssessments([resolvedAssessmentId])
        } catch (e) {
          console.warn('Could not associate case with account:', e)
        }
      }
      await submitCaseForReview(resolvedAssessmentId, {
        firstName: firstName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        preferredContactMethod,
        hipaa: hasHipaaConsent || sendHipaaConsent,
        rankedAttorneyIds: selectedRankedAttorneyIds
      })
      setCaseSubmittedForReview(true)
      setSendModalOpen(false)
      // Store case ID so Dashboard can associate if needed (backup for API association)
      localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
      // Redirect to dashboard with case param so user lands on their case
      const target = `${window.location.origin}/dashboard?case=${resolvedAssessmentId}`
      window.location.replace(target)
    } catch (err: any) {
      console.error('Failed to submit for review:', err)
      setContactFormError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleResubmit = async () => {
    if (!resolvedAssessmentId) return
    try {
      setResubmitLoading(true)
      setResubmitMessage(null)
      const predictionData = await predict(resolvedAssessmentId)
      setPrediction(predictionData)
      setResubmitMessage('Case re-submitted. Results updated.')
    } catch (err: any) {
      setResubmitMessage(err.response?.data?.error || 'Failed to re-submit case')
    } finally {
      setResubmitLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!assessment) return
    const payload = {
      assessment,
      prediction,
      sol
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `case-details-${assessment.id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const associateAssessmentWithUser = async () => {
    if (resolvedAssessmentId && isLoggedIn) {
      try {
        await associateAssessments([resolvedAssessmentId])
        console.log('Assessment associated with user successfully')
      } catch (error) {
        console.error('Failed to associate assessment with user:', error)
      }
    }
  }

  useEffect(() => {
    if (!resolvedAssessmentId) return

    const loadData = async () => {
      try {
        setLoading(true)
        
        try {
          const session = await loadPlaintiffSessionSummary()
          setIsLoggedIn(!!session?.user)
        } catch {
          setIsLoggedIn(false)
        }
        
        // Load assessment
        const assessmentData = await getAssessment(resolvedAssessmentId)
        setAssessment(assessmentData)
        setCaseSubmittedForReview(!!assessmentData.submittedForReview)
        
        // Get prediction if not already available
        if (!assessmentData.latest_prediction) {
          const predictionData = await predict(resolvedAssessmentId)
          setPrediction(predictionData)
        } else {
          setPrediction(assessmentData.latest_prediction)
        }
        
        // Calculate SOL
        const facts = typeof assessmentData.facts === 'string'
          ? JSON.parse(assessmentData.facts)
          : assessmentData.facts
        if (facts?.incident?.date) {
          const solData = await calculateSOL(
            facts.incident.date,
            facts.venue || { state: assessmentData.venue?.state, county: assessmentData.venue?.county },
            facts.claimType || assessmentData.claimType
          )
          setSol(solData)
        }
        
      } catch (err: any) {
        console.error('Failed to load results:', err)
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          assessmentId: resolvedAssessmentId
        })
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load assessment results'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [resolvedAssessmentId, isLoggedIn])

  useEffect(() => {
    const loadSimilarCases = async () => {
      if (!resolvedAssessmentId) return
      try {
        const data = await getSimilarCaseOutcomes(resolvedAssessmentId)
        setSimilarCases(data.similarCases || [])
      } catch {
        setSimilarCases([])
      }
    }
    loadSimilarCases()
  }, [resolvedAssessmentId])

  useEffect(() => {
    const loadEvidence = async () => {
      if (!resolvedAssessmentId) return
      try {
        const files = await getEvidenceFiles(resolvedAssessmentId)
        const fileList = Array.isArray(files) ? files : []
        setEvidenceCount(fileList.length)
        setEvidenceFiles(fileList)
      } catch {
        setEvidenceCount(0)
        setEvidenceFiles([])
      }
    }
    loadEvidence()
  }, [resolvedAssessmentId])

  useEffect(() => {
    const loadCaseInsights = async () => {
      if (!resolvedAssessmentId) return
      try {
        const [chronology, preparation, plaintiffReview, benchmarks] = await Promise.all([
          getMedicalChronology(resolvedAssessmentId).catch(() => []),
          getCasePreparation(resolvedAssessmentId).catch(() => null),
          getPlaintiffMedicalReview(resolvedAssessmentId).catch(() => null),
          getSettlementBenchmarks(resolvedAssessmentId).catch(() => null)
        ])
        const fallbackReview: PlaintiffMedicalReviewPayload = plaintiffReview || {
          chronology: Array.isArray(chronology) ? chronology : [],
          missingItems: {
            important: Array.isArray(preparation?.missingDocs)
              ? preparation.missingDocs
                  .filter((item: any) => item.priority === 'high')
                  .map((item: any) => ({
                    key: item.key,
                    label: item.label,
                    priority: item.priority,
                    guidance: 'This would help complete your medical story before attorneys review it.',
                  }))
              : [],
            helpful: Array.isArray(preparation?.missingDocs)
              ? preparation.missingDocs
                  .filter((item: any) => item.priority !== 'high')
                  .map((item: any) => ({
                    key: item.key,
                    label: item.label,
                    priority: item.priority,
                    guidance: 'You may still want to upload this if you have it.',
                  }))
              : [],
          },
          review: {
            status: 'pending',
            edits: [],
          },
        }
        const reviewChronology = Array.isArray(fallbackReview?.chronology) ? fallbackReview.chronology : []
        setMedicalChronology(reviewChronology.length > 0 ? reviewChronology : (Array.isArray(chronology) ? chronology : []))
        setCasePreparation(preparation)
        setPlaintiffMedicalReview(fallbackReview)
        setSettlementBenchmarks(benchmarks)
      } catch {
        setMedicalChronology([])
        setCasePreparation(null)
        setPlaintiffMedicalReview(null)
        setSettlementBenchmarks(null)
      }
    }
    loadCaseInsights()
  }, [resolvedAssessmentId])

  useEffect(() => {
    const loadCommandCenter = async () => {
      if (!resolvedAssessmentId) return
      try {
        const summary = await getAssessmentCommandCenter(resolvedAssessmentId)
        setCommandCenter(summary)
      } catch {
        setCommandCenter(null)
      }
    }
    loadCommandCenter()
  }, [resolvedAssessmentId])

  useEffect(() => {
    const loadMatchedAttorneys = async () => {
      await refreshMatchedAttorneys()
    }
    loadMatchedAttorneys()
  }, [assessment?.id, venueState, assessment?.claimType])

  useEffect(() => {
    if (!reviewRequested || autoReviewHandled || loading || !assessment || !plaintiffMedicalReview) return
    window.setTimeout(() => {
      if ((plaintiffMedicalReview.review.status ?? 'pending') === 'pending') {
        medicalReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setMedicalReviewError('Please confirm your medical story or skip this step before sending your case to attorneys.')
        return
      }
      setAutoReviewHandled(true)
      openSendModal(plaintiffMedicalReview.review.status)
    }, 100)
  }, [reviewRequested, autoReviewHandled, loading, assessment?.id, plaintiffMedicalReview?.review.status])

  useEffect(() => {
    if (matchedAttorneys.length === 0) {
      setRankedAttorneyIds([])
      return
    }
    setRankedAttorneyIds((current) => {
      const availableIds = matchedAttorneys.map((attorney) => attorney.id || attorney.attorney_id).filter(Boolean)
      const preserved = current.filter((attorneyId) => availableIds.includes(attorneyId))
      const missing = availableIds.filter((attorneyId) => !preserved.includes(attorneyId))
      return [...preserved, ...missing].slice(0, 3)
    })
  }, [matchedAttorneys])

  // Associate assessment with user when they become logged in
  useEffect(() => {
    if (isLoggedIn && resolvedAssessmentId) {
      associateAssessmentWithUser()
    }
  }, [isLoggedIn, resolvedAssessmentId])

  // Persist assessmentId for account-creation flow (OAuth loses URL params)
  useEffect(() => {
    if (resolvedAssessmentId && isLoggedIn === false) {
      localStorage.setItem('pending_assessment_id', resolvedAssessmentId)
    }
  }, [resolvedAssessmentId, isLoggedIn])

  // Check authentication status on page load (for redirects from login/register)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const session = await loadPlaintiffSessionSummary()
        if (isLoggedIn === null) {
          setIsLoggedIn(!!session?.user)
        }
      } catch {
        if (isLoggedIn === null) {
          setIsLoggedIn(false)
        }
      }
    }

    checkAuthStatus()
  }, [isLoggedIn])

  useEffect(() => {
    if (!assessment || wageLossHydrated) return
    const saved = parsedFacts?.caseAcceleration?.wageLoss
    if (saved) {
      setWageLossForm({
        employerName: saved.employerName || '',
        supervisorContact: saved.supervisorContact || '',
        positionTitle: saved.positionTitle || '',
        datesMissed: saved.datesMissed || '',
        reasonMissed: saved.reasonMissed || '',
        hourlyRate: saved.hourlyRate || '',
        typicalHours: saved.typicalHours || '',
        notes: saved.notes || ''
      })
    }
    setWageLossHydrated(true)
  }, [assessment, wageLossHydrated, parsedFacts])


  if (!resolvedAssessmentId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid case report link</h2>
          <p className="text-gray-600">This Results link is missing a valid case reference. Start a new assessment to generate a fresh report.</p>
          <Link to="/assess" className="btn-primary mt-4">
            Start New Assessment
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-11 w-11 border-2 border-slate-200 border-t-brand-600 mx-auto" />
          <p className="mt-5 text-sm font-medium text-slate-600">Preparing your Case Intelligence Report…</p>
        </div>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Assessment not found'}</p>
          <Link to="/assess" className="btn-primary mt-4">
            Start New Assessment
          </Link>
        </div>
      </div>
    )
  }

  const viability = prediction?.viability
  const valueBands = prediction?.value_bands
  const explainability = prediction?.explainability || []
  const readinessDetails = (() => {
    const facts = parsedFacts
    const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
    const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
    const damages = facts.damages || {}
    const hasNarrative = !!facts.incident?.narrative
    const hasLocation = !!facts.incident?.location
    const hasInjuries = injuries.length > 0 && !!injuries[0]?.description
    const hasTreatment = treatment.length > 0
    const hasDamages = damages.med_charges || damages.med_paid || damages.wage_loss || damages.services || damages.workImpact
    const hasEvidence = evidenceCount > 0

    const points = [
      hasNarrative,
      hasLocation,
      hasInjuries,
      hasTreatment,
      hasDamages,
      hasEvidence
    ].filter(Boolean).length
    const percent = Math.round((points / 6) * 100)
    const missing: string[] = []
    if (!hasNarrative) missing.push('Incident narrative')
    if (!hasLocation) missing.push('Incident location')
    if (!hasInjuries) missing.push('Injury details')
    if (!hasTreatment) missing.push('Treatment history')
    if (!hasDamages) missing.push('Damages/financial impact')
    if (!hasEvidence) missing.push('Evidence uploads')

    return { percent, missing }
  })()
  const readinessMissing = Array.isArray(readinessDetails?.missing) ? readinessDetails.missing : []

  const progressChecklist = [
    { label: 'Incident narrative', done: !readinessMissing.includes('Incident narrative') },
    { label: 'Incident location', done: !readinessMissing.includes('Incident location') },
    { label: 'Injury details', done: !readinessMissing.includes('Injury details') },
    { label: 'Treatment history', done: !readinessMissing.includes('Treatment history') },
    { label: 'Damages/financial impact', done: !readinessMissing.includes('Damages/financial impact') },
    { label: 'Evidence uploads', done: !readinessMissing.includes('Evidence uploads') }
  ]

  const damagesObj = parsedFacts?.damages || {}
  const hasInjuryPhotos = evidenceFiles.some(f => f.category === 'photos')
  const hasMedicalRecords = evidenceFiles.some(f => f.category === 'medical_records')
  const hasMedicalBills = evidenceFiles.some(f => f.category === 'bills')
  const hasPoliceReport = evidenceFiles.some(f => f.category === 'police_report')
  const hasWageLossProof = evidenceFiles.some(f => f.category === 'wage_loss') || !!(damagesObj.wage_loss || parsedFacts?.caseAcceleration?.wageLoss)
  const evidenceCompletionChecklist = [
    { label: 'Incident description', done: !!parsedFacts?.incident?.narrative, valueBoost: null },
    { label: 'Location confirmed', done: !!(parsedFacts?.incident?.location || parsedFacts?.venue?.state), valueBoost: null },
    { label: 'Upload injury photos', done: hasInjuryPhotos, valueBoost: '+10-20% value' },
    { label: 'Upload medical records', done: hasMedicalRecords, valueBoost: '+15-40% value' },
    { label: 'Upload wage loss proof', done: hasWageLossProof, valueBoost: '+10-25% value' }
  ]
  const evidenceCompletionPercent = Math.round((evidenceCompletionChecklist.filter(c => c.done).length / 5) * 100)

  const caseStrengthScore = Math.round((viability?.overall ?? 0.5) * 100)
  const successProbability = Math.round((viability?.overall ?? 0.5) * 100)
  const settlementLow = valueBands?.p25 ?? 15000
  const settlementHigh = valueBands?.p75 ?? 75000
  const trialProbability = Math.round((1 - (viability?.overall ?? 0.5) * 0.8) * 100)
  const missingDocItems = Array.isArray(casePreparation?.missingDocs) ? casePreparation.missingDocs : []
  const treatmentGapItems = Array.isArray(casePreparation?.treatmentGaps) ? casePreparation.treatmentGaps : []
  const benchmarkRangeText = settlementBenchmarks
    ? `${formatCurrency(settlementBenchmarks.p25)} - ${formatCurrency(settlementBenchmarks.p75)}`
    : `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`
  const timelineEstimate = buildTimelineEstimate({
    claimType: assessment?.claimType,
    missingDocCount: missingDocItems.length,
    treatmentGapCount: treatmentGapItems.length,
    hasTreatment: Array.isArray(parsedFacts?.treatment) && parsedFacts.treatment.length > 0,
    evidenceCount,
    severityLevel: prediction?.severity?.level,
    chronologyCount: medicalChronology.length,
  })
  const timelineDrivers = Array.isArray(timelineEstimate?.drivers) ? timelineEstimate.drivers : []
  const estimatedTimeline = timelineEstimate.label
  const liabilityScore = viability?.liability ?? 0.5
  const liabilityOutlook = liabilityScore >= 0.7 ? 'strong' : liabilityScore >= 0.4 ? 'moderate' : 'weak'
  const liabilityDetails = prediction?.liability
  const rawLiabilityFactors = Array.isArray(liabilityDetails?.factors)
    ? liabilityDetails.factors.slice(0, 3)
    : explainability
        .filter((item: any) => typeof item?.feature === 'string' && item.feature.startsWith('liability_factor: '))
        .map((item: any) => String(item.feature).replace('liability_factor: ', ''))
        .slice(0, 3)
  const liabilityFactors = rawLiabilityFactors
    .map((factor: string) => normalizeReportText(factor))
    .filter(Boolean)
  const comparativeFaultPercent = Math.round((liabilityDetails?.comparativeNegligence || 0) * 100)
  const liabilitySummary = normalizeReportText(liabilityFactors[0])
    || (liabilityOutlook === 'strong'
      ? 'The current facts point toward the other side being primarily at fault.'
      : liabilityOutlook === 'moderate'
        ? 'Liability looks mixed right now and may depend on more evidence.'
        : 'Liability is still uncertain and needs better supporting facts.')
  const liabilityConfidence = hasPoliceReport || (hasInjuryPhotos && !!parsedFacts?.incident?.narrative)
    ? 'Medium'
    : evidenceCount > 0 || !!parsedFacts?.incident?.narrative
      ? 'Low'
      : 'Very low'
  const comparativeFaultRisk = comparativeFaultPercent >= 30 ? 'High' : comparativeFaultPercent > 0 ? 'Medium' : 'Low'
  const liabilityPositiveSignals = [
    ...liabilityFactors,
    hasPoliceReport && 'A police or incident report is attached.',
    hasInjuryPhotos && 'Photos may help show scene conditions or damage.',
    parsedFacts?.incident?.narrative && 'Your incident description gives attorneys a starting fault story.',
  ].filter(Boolean).slice(0, 4) as string[]
  const liabilityRiskSignals = [
    !hasPoliceReport && 'A police or incident report is not uploaded yet.',
    !hasInjuryPhotos && 'Scene, injury, or damage photos are not uploaded yet.',
    !parsedFacts?.incident?.narrative && 'The accident description is still limited.',
    comparativeFaultPercent > 0 && `The model detected possible shared-fault risk around ${comparativeFaultPercent}%.`,
  ].filter(Boolean).slice(0, 4) as string[]
  const liabilityStrengthenActions = [
    !hasPoliceReport && 'Upload the police or incident report.',
    !hasInjuryPhotos && 'Add scene, vehicle/property damage, or injury photos.',
    !parsedFacts?.incident?.narrative && 'Clarify what happened and why the other party may be responsible.',
    'Add witness names, insurance details, or repair estimates if available.',
  ].filter(Boolean).slice(0, 3) as string[]
  const evidenceLevelConfidence = (() => {
    if (evidenceCount === 0) return { level: 'No documents', confidence: 'Low' }
    if (hasPoliceReport && hasMedicalRecords) return { level: 'Police report + medical records', confidence: 'Very high' }
    if (hasMedicalRecords) return { level: 'Medical records', confidence: 'High' }
    if (hasMedicalBills) return { level: 'Medical bills', confidence: 'Medium' }
    return { level: 'Other documents', confidence: 'Low' }
  })()
  const formatSolRemaining = () => {
    if (sol?.yearsRemaining == null) return '1 year 9 months'
    const y = Math.floor(sol.yearsRemaining)
    const m = Math.round((sol.yearsRemaining % 1) * 12)
    const parts = []
    if (y > 0) parts.push(`${y} year${y > 1 ? 's' : ''}`)
    if (m > 0) parts.push(`${m} month${m > 1 ? 's' : ''}`)
    return parts.join(' ') || '1 year 9 months'
  }
  const solRemaining = formatSolRemaining()
  const solDeadline = sol?.expiresAt ? new Date(sol.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null
  const solStatusTone = sol?.status === 'critical' || sol?.status === 'expired'
    ? 'bg-red-50 border-red-200 text-red-800'
    : sol?.status === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
  const caseStrengthLabel = (s: number) => s >= 75 ? 'Strong' : s >= 50 ? 'Moderately Strong' : s >= 25 ? 'Moderate' : 'Needs Work'

  const handleCopyShareLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  const handleDownloadReportPdf = async () => {
    const { downloadResultsCaseReportPdf } = await import('../lib/reportPdfExports')
    await downloadResultsCaseReportPdf({
      caseStrengthScore,
      successProbability,
      settlementRangeText: `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`,
      trialProbability,
      estimatedTimeline,
      solRemaining,
      evidenceCompletionPercent,
      assessmentId: assessment?.id,
    })
  }
  const nextSteps = missingDocItems.length > 0
    ? missingDocItems.slice(0, 3).map((item: any) => item.label)
    : readinessMissing.slice(0, 3)
  const facts = parsedFacts
  const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
  const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
  const damages = facts.damages || {}
  const strengths = [
    facts.incident?.narrative ? 'Clear incident narrative' : null,
    evidenceCount > 0 ? 'Supporting evidence uploaded' : null,
    treatment.length > 0 ? 'Treatment documented' : null,
    damages.med_charges || damages.med_paid || damages.wage_loss ? 'Financial impact documented' : null
  ].filter(Boolean) as string[]
  const weaknesses = [
    !facts.incident?.narrative ? 'Incident narrative is missing' : null,
    !facts.incident?.location ? 'Incident location is missing' : null,
    injuries.length === 0 ? 'Injury details are missing' : null,
    treatment.length === 0 ? 'Treatment history is missing' : null,
    evidenceCount === 0 ? 'Evidence files are missing' : null
  ].filter(Boolean) as string[]
  const insurerArguments = [
    treatment.length === 0 ? 'They may argue there is a treatment gap or no injury documentation.' : null,
    evidenceCount === 0 ? 'They may claim the case lacks objective evidence.' : null,
    !facts.incident?.narrative ? 'They may dispute how the incident happened.' : null
  ].filter(Boolean) as string[]
  const buildWageLossTemplate = (form: typeof wageLossForm) => `Wage Loss Documentation

Employer name: ${form.employerName || ''}
Supervisor/HR contact: ${form.supervisorContact || ''}
Position/title: ${form.positionTitle || ''}

Dates missed: ${form.datesMissed || ''}
Reason missed (injury-related): ${form.reasonMissed || ''}
Hourly rate / salary: ${form.hourlyRate || ''}
Typical hours per week: ${form.typicalHours || ''}

Notes:
${form.notes || ''}

Checklist:
- Attach pay stubs for 3 months prior to incident
- Include a letter from employer confirming missed time
`
  const filledWageLossTemplate = buildWageLossTemplate(wageLossForm)
  const showSavePrompt = isLoggedIn === false
  const alertMessages = [
    readinessMissing.includes('Evidence uploads') ? 'You’re falling behind on documentation.' : null,
    readinessMissing.includes('Treatment history') ? 'This gap could weaken your case.' : null,
    readinessMissing.includes('Incident narrative') ? 'Now is a good time to follow up on your incident details.' : null,
    readinessMissing.includes('Damages/financial impact') ? 'Now is a good time to add wage loss or bills.' : null
  ].filter(Boolean) as string[]
  const statusUpdates = [
    `Your case readiness is ${readinessDetails.percent}%.`,
    evidenceCount > 0 ? 'Evidence is uploaded and attached to your assessment.' : 'No evidence uploaded yet.',
    parsedFacts?.incident?.date ? 'Incident date is on file.' : 'Incident date is still missing.',
    treatment.length > 0 ? 'Treatment history is documented.' : 'Treatment history is still missing.'
  ]
  const getCoachAnswer = (question: string) => {
    const normalized = question.toLowerCase()
    if (normalized.includes('normal')) {
      return treatment.length > 0
        ? 'Based on your recorded treatment history, ongoing symptoms can be common. Keep documenting each visit.'
        : 'It may be normal, but no treatment history is recorded yet. If you sought care, add it to strengthen your case.'
    }
    if (normalized.includes('worried') || normalized.includes('worry')) {
      return readinessMissing.length > 0
        ? `You still have a few gaps: ${readinessMissing.join(', ')}. Filling these reduces risk.`
        : 'You look in good shape—no major gaps detected in your assessment.'
    }
    if (normalized.includes('next')) {
      if (readinessMissing.length === 0) {
        return 'You are ready for attorney review. Consider uploading any new evidence as it comes in.'
      }
      return `Focus next on: ${readinessMissing.slice(0, 2).join(' and ')}.`
    }
    return 'I can help. Try asking about what to do next, whether something is normal, or if you should worry.'
  }

  const handleSaveWageLoss = async () => {
    if (!assessment) return
    if (!isLoggedIn) {
      setWageLossStatus('Sign in to save this to your assessment.')
      return
    }
    try {
      setWageLossSaving(true)
      setWageLossStatus(null)
      await updateAssessment(assessment.id, {
        caseAcceleration: {
          wageLoss: { ...wageLossForm }
        }
      })
      setAssessment({
        ...assessment,
        facts: {
          ...parsedFacts,
          caseAcceleration: {
            ...(parsedFacts?.caseAcceleration || {}),
            wageLoss: { ...wageLossForm }
          }
        }
      })
      setWageLossStatus('Saved to your assessment.')
    } catch (error) {
      setWageLossStatus('Failed to save. Please try again.')
    } finally {
      setWageLossSaving(false)
    }
  }

  const handleDownloadWageLossPdf = async () => {
    const { downloadWageLossTemplatePdf } = await import('../lib/reportPdfExports')
    await downloadWageLossTemplatePdf({
      templateText: filledWageLossTemplate,
      assessmentId: assessment?.id,
    })
  }

  const whatThisMeansBullets = [
    liabilitySummary,
    injuries.length > 0 && 'Your injury indicates possible damages',
    treatment.length > 0 && 'Medical treatment supports your claim',
    settlementBenchmarks
      ? `Comparable ${formatClaimTypeLabel(assessment?.claimType)} cases in ${venueState === 'CA' ? 'California' : venueState} often land near ${formatCurrency(settlementBenchmarks.p50)} with a broader range of ${benchmarkRangeText}.`
      : `Similar cases in ${venueState === 'CA' ? 'California' : venueState} settled between ${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`,
    missingDocItems.length > 0 && `The fastest way to strengthen this estimate is to add ${missingDocItems.slice(0, 2).map((item: any) => (item?.label ?? '').toLowerCase()).join(' and ')}.`
  ].filter(Boolean) as string[]
  const medicalReviewPending = (plaintiffMedicalReview?.review.status ?? 'pending') === 'pending'
  const topMissingDocLabels = missingDocItems
    .slice(0, 3)
    .map((item: any) => item?.label)
    .filter(Boolean)
  const bestMissingDoc = missingDocItems.find((item: any) => item?.priority === 'high') ?? missingDocItems[0]
  const bestNextAction = bestMissingDoc
    ? getMissingDocAction(bestMissingDoc, assessment?.id)
    : medicalReviewPending
      ? { label: 'Review medical story', to: '#medical-story-review' }
      : { label: 'Send case for attorney review', to: '#attorney-handoff' }
  const confidenceReason = evidenceLevelConfidence.confidence === 'Very high'
    ? 'High confidence because your file includes strong supporting documents.'
    : `${evidenceLevelConfidence.confidence} confidence because ${topMissingDocLabels.length > 0
      ? `${topMissingDocLabels.join(', ')} ${topMissingDocLabels.length === 1 ? 'is' : 'are'} still missing`
      : 'key supporting documents are still limited'
    }.`
  const liabilityClarityLabel = liabilityOutlook === 'strong' ? 'Strong' : liabilityOutlook === 'moderate' ? 'Mixed' : 'Unclear'
  const attorneyReadinessLabel = missingDocItems.length === 0 && !medicalReviewPending
    ? 'Ready'
    : medicalReviewPending
      ? 'Review needed'
      : 'Needs docs'
  const deadlineUrgencyLabel = sol?.status === 'critical' || sol?.status === 'expired'
    ? 'Urgent'
    : sol?.status === 'warning'
      ? 'Watch'
      : solDeadline
        ? 'Low'
        : 'Unknown'
  const atAGlanceStats = [
    { label: 'Case estimate', value: `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`, helper: 'Modeled range', tone: 'border-brand-200 bg-brand-50 text-brand-950' },
    { label: 'Value confidence', value: evidenceLevelConfidence.confidence, helper: evidenceLevelConfidence.level, tone: 'border-sky-200 bg-sky-50 text-sky-950' },
    { label: 'Liability clarity', value: liabilityClarityLabel, helper: liabilityConfidence, tone: 'border-violet-200 bg-violet-50 text-violet-950' },
    { label: 'File readiness', value: `${evidenceCompletionPercent}%`, helper: missingDocItems.length > 0 ? 'Needs strengthening' : 'Ready for review', tone: 'border-emerald-200 bg-emerald-50 text-emerald-950' },
    { label: 'Attorney readiness', value: attorneyReadinessLabel, helper: medicalReviewPending ? 'Medical story first' : missingDocItems.length > 0 ? 'More docs help' : 'You can send now', tone: 'border-amber-200 bg-amber-50 text-amber-950' },
    { label: 'Deadline urgency', value: deadlineUrgencyLabel, helper: solDeadline ? `${solRemaining} left` : 'Confirm incident facts', tone: deadlineUrgencyLabel === 'Urgent' ? 'border-red-200 bg-red-50 text-red-950' : 'border-slate-200 bg-slate-50 text-slate-950' },
  ]
  const guidedNextSteps = [
    medicalReviewPending && 'Review or skip the medical story so attorneys know whether the timeline is accurate.',
    topMissingDocLabels.length > 0 && `Upload ${topMissingDocLabels.join(', ')} to strengthen the file.`,
    'Send the case for attorney review when you are comfortable sharing the summary.',
  ].filter(Boolean) as string[]
  const handoffSteps = [
    { label: 'Intake complete', done: true },
    { label: 'Strengthen file', done: missingDocItems.length === 0 },
    { label: 'Attorney review', done: caseSubmittedForReview },
  ]
  const resultsTabs: Array<{ id: ResultsTab; label: string; badge?: string }> = [
    { id: 'liability', label: 'Liability', badge: liabilityClarityLabel },
    { id: 'medical', label: 'Medical Story', badge: medicalReviewPending ? 'Review needed' : undefined },
    { id: 'documents', label: 'Documents', badge: missingDocItems.length > 0 ? `${missingDocItems.length} missing` : 'Ready' },
    { id: 'value', label: 'Value & Timeline' },
    { id: 'attorney', label: 'Attorney Review', badge: medicalReviewPending ? 'Medical first' : undefined },
  ]
  const openAnchoredResultsSection = (target: string) => {
    const tab: ResultsTab = target === '#attorney-handoff' ? 'attorney' : target === '#medical-story-review' ? 'medical' : activeResultsTab
    setActiveResultsTab(tab)
    window.setTimeout(() => {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const improveCaseValueItems = [
    { label: 'Upload injury photos', done: hasInjuryPhotos, boost: '+10-20% potential increase' },
    { label: 'Upload medical records', done: hasMedicalRecords, boost: '+15-40% potential increase' },
    { label: 'Add proof of lost wages', done: hasWageLossProof, boost: '+10-25% potential increase' }
  ]

  // Post-submission layout — transition from assessment to case tracking
  if (caseSubmittedForReview) {
    const submissionTimeline = [
      { label: 'Case submitted', done: true },
      { label: 'Attorneys reviewing', done: false },
      { label: 'Attorney responses', done: false },
      { label: 'Choose an attorney', done: false }
    ]
    return (
      <Suspense fallback={<ResultsPanelSkeleton message="Loading submitted case view..." />}>
        <ResultsSubmittedView
          assessmentId={assessment?.id}
          assessmentClaimType={assessment?.claimType}
          handleDownloadReportPdf={handleDownloadReportPdf}
          handleCopyShareLink={handleCopyShareLink}
          improveCaseValueItems={improveCaseValueItems}
          isLoggedIn={isLoggedIn}
          rankedAttorneys={rankedAttorneyCards}
          shareCopied={shareCopied}
          showSavePrompt={showSavePrompt}
          submissionTimeline={submissionTimeline}
          venueCounty={venueCounty}
          venueState={venueState}
        />
      </Suspense>
    )
  }

  // Pre-submission layout — full case report
  return (
    <div className="page-shell max-w-5xl">
      {/* Send Case Modal — minimal contact info before routing */}
      {sendModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => !submitLoading && setSendModalOpen(false)}>
          <div className="flex min-h-full items-start justify-center py-6 sm:items-center" onClick={e => e.stopPropagation()}>
            <div className="surface-panel max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto p-6 shadow-xl">
            <h3 className="section-title text-ui-xl">Before we send your case to attorneys</h3>
            <p className="section-copy mb-4">Attorneys need this to call you, schedule a consultation, and request documents.</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">First Name *</label>
                <input
                  type="text"
                  value={contactForm.firstName}
                  onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                  className="input"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred contact</label>
                <div className="flex gap-3">
                  {(['phone', 'text', 'email'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredContact"
                        checked={contactForm.preferredContactMethod === m}
                        onChange={() => setContactForm(f => ({ ...f, preferredContactMethod: m }))}
                        className="text-brand-600"
                      />
                      <span className="text-sm capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              {attorneySearchLoading && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Finding the best attorney matches for your case...
                </div>
              )}
              {!attorneySearchLoading && rankedAttorneyCards.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Rank your top 3 attorney matches</label>
                  <p className="mb-3 text-xs text-slate-500">
                    We matched these attorneys based on venue, matter type, response signals, and profile fit. Dragging is not required; use Up/Down to reorder.
                  </p>
                  <div className="space-y-2">
                    {rankedAttorneyCards.map((attorney: any, index) => (
                      <div key={attorney.id || attorney.attorney_id} className="subtle-panel px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Choice {index + 1}</p>
                            <p className="text-sm font-semibold text-slate-900">{attorney?.name ?? 'Attorney'}</p>
                            <p className="text-xs text-slate-600">
                              {[
                                attorney?.law_firm?.name ?? 'Law Firm',
                                `${Math.round((attorney.fit_score || 0.6) * 100)}% fit`,
                                getResponseBadge(attorney)
                              ].filter(Boolean).join(' • ')}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {getAttorneyPracticePreview(attorney, {
                                venueState,
                                venueCounty,
                              }) || getAttorneyWhyMatched(attorney, {
                                assessmentClaimType: assessment?.claimType,
                                venueState,
                                venueCounty,
                              })}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {getAttorneyWhyMatched(attorney, {
                                assessmentClaimType: assessment?.claimType,
                                venueState,
                                venueCounty,
                              })}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {(attorney.verifiedReviewCount || 0) > 0
                                  ? `${attorney.verifiedReviewCount} verified reviews`
                                  : 'New profile'}
                              </span>
                              {(attorney.averageRating || attorney.rating || 0) > 0 && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                  <Star className="mr-1 h-3 w-3" />
                                  {(attorney.averageRating || attorney.rating || 0).toFixed(1)} rating
                                </span>
                              )}
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                                {getResponseBadge(attorney)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => moveRankedAttorney(attorney.id || attorney.attorney_id, -1)}
                              disabled={index === 0}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRankedAttorney(attorney.id || attorney.attorney_id, 1)}
                              disabled={index === rankedAttorneyCards.length - 1}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Down
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    We will contact Choice 1 first. If they decline or time out, we automatically move to the next choice.
                  </p>
                </div>
              )}
              {!attorneySearchLoading && rankedAttorneyCards.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  <p className="font-medium text-amber-950">No attorney list loaded for ranking</p>
                  <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                    You can still send your case—we will route it using our standard attorney matching when no ranked list is available. Try{' '}
                    <button
                      type="button"
                      className="font-semibold underline decoration-amber-700 underline-offset-2 hover:text-amber-950"
                      onClick={() => void refreshMatchedAttorneys()}
                    >
                      reload matches
                    </button>{' '}
                    if you want to pick preferred attorneys first.
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={hasHipaaConsent || sendHipaaConsent}
                    onChange={(e) => setSendHipaaConsent(e.target.checked)}
                    disabled={hasHipaaConsent}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-amber-900">
                    I authorize{' '}
                    <Link
                      to="/hipaa-authorization"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline"
                    >
                      HIPAA disclosure for medical records
                    </Link>{' '}
                    so matched attorneys can review my case. {hasHipaaConsent ? 'Already on file.' : 'Required.'}
                  </span>
                </label>
              </div>
            </div>
            {contactFormError && <p className="mt-2 text-sm text-red-600">{contactFormError}</p>}
            <p className="mt-4 text-xs text-slate-500">Attorneys will review your case and typically respond within 24 hours. Your information is not shared without your approval.</p>
            <p className="mt-1 text-xs text-slate-500">No obligation. You are not required to hire any attorney.</p>
            <button
              onClick={handleSubmitForReview}
              disabled={submitLoading || attorneySearchLoading}
              className="btn-primary mt-4 w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitLoading ? 'Sending...' : attorneySearchLoading ? 'Finding attorney matches...' : 'Send My Case'}
            </button>
              <button
                type="button"
                onClick={() => !submitLoading && setSendModalOpen(false)}
                className="btn-ghost mt-2 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="premium-panel overflow-hidden rounded-none p-0 sm:rounded-3xl">
        <header className="border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white px-6 sm:px-10 py-8 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
            Preliminary assessment - confidential
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-brand-800 tracking-tight mb-1">ClearCaseIQ</p>
              <h1 className="font-display text-3xl sm:text-[2.125rem] font-semibold text-slate-900 tracking-tight leading-[1.15]">
                Case Intelligence Report
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] text-slate-600 max-w-2xl leading-relaxed">
                {evidenceCount === 0
                  ? 'Preliminary analysis based on your intake responses. Estimates will refine as your file develops.'
                  : 'Analysis based on your intake, uploaded materials, and signals comparable to matters in this jurisdiction.'}
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-right shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reference</p>
              <p className="font-mono text-xs text-slate-700 mt-0.5">{(assessment?.id ?? '').slice(0, 8)}…</p>
            </div>
          </div>
        </header>

        <div className="px-6 sm:px-10 py-9 sm:py-10">
        <dl className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {atAGlanceStats.map((item) => (
            <div key={item.label} className={`rounded-2xl border px-4 py-4 shadow-sm ${item.tone}`}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-70">{item.label}</dt>
              <dd className="mt-1 text-lg font-bold tracking-tight">{item.value}</dd>
              <dd className="mt-0.5 text-xs font-medium opacity-75">{item.helper}</dd>
            </div>
          ))}
        </dl>

        <section
          className="premium-panel mb-8 border-brand-100 bg-brand-50/50"
          aria-label="Case snapshot"
        >
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="rounded-full border border-white/80 bg-white px-3 py-1.5 font-semibold shadow-sm capitalize">
              {formatClaimTypeLabel(assessment?.claimType)}
            </span>
            <span className="rounded-full border border-white/80 bg-white px-3 py-1.5 font-semibold shadow-sm">
              {[venueCounty, venueState === 'CA' ? 'California' : venueState].filter(Boolean).join(', ') || 'Jurisdiction unavailable'}
            </span>
            <span className="rounded-full border border-white/80 bg-white px-3 py-1.5 font-semibold shadow-sm">
              Prepared {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="mt-6 max-w-2xl">
          <p className="section-kicker">Your case at a glance</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
              {missingDocItems.length > 0 ? 'Your file can be strengthened before attorney review' : 'Your file looks close to attorney-review ready'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Current estimate: <span className="font-semibold text-slate-950">{formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}</span>
              {' '}with {evidenceLevelConfidence.confidence.toLowerCase()} confidence. The most useful next step is{' '}
              {topMissingDocLabels.length > 0 ? `adding ${topMissingDocLabels[0].toLowerCase()}` : 'sending the case for attorney review'}.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{confidenceReason}</p>
          </div>

          <div className="mt-6 rounded-2xl border border-brand-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">Start here</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{bestNextAction.label}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {topMissingDocLabels.length > 0
                    ? `${topMissingDocLabels[0]} is the most useful next step for improving confidence.`
                    : 'This is the clearest next step based on your current file.'}
                </p>
              </div>
              {bestNextAction.to.startsWith('#') ? (
                <button
                  type="button"
                  onClick={() => openAnchoredResultsSection(bestNextAction.to)}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Start now
                </button>
              ) : (
                <Link
                  to={bestNextAction.to}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Start now
                </Link>
              )}
            </div>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {handoffSteps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white px-4 py-3 shadow-sm">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.done ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </span>
                <span className={step.done ? 'text-sm font-semibold text-slate-900' : 'text-sm font-medium text-slate-600'}>{step.label}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-4">
            <h3 className="text-sm font-semibold text-slate-950">What to do next</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-700">
              {guidedNextSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

        </section>

        <nav className="surface-panel mb-6 overflow-x-auto p-2" aria-label="Results sections">
          <div className="flex min-w-max gap-2">
            {resultsTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveResultsTab(tab.id)}
                className={`workspace-tab text-left ${
                  activeResultsTab === tab.id
                    ? 'workspace-tab-active'
                    : ''
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="status-pill-neutral ml-2 px-2 py-0.5 text-[11px]">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {activeResultsTab === 'liability' && (
        <section className="premium-panel mb-8" aria-label="Liability snapshot">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Liability snapshot</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 capitalize">
                {liabilityOutlook} outlook
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">{liabilitySummary}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Score</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{Math.round(liabilityScore * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{liabilityConfidence}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Shared fault</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{comparativeFaultRisk}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
              <h3 className="text-sm font-semibold text-emerald-950">What supports liability</h3>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                {(liabilityPositiveSignals.length > 0 ? liabilityPositiveSignals : ['The current facts provide an initial liability story, but more support would help.']).map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-4">
              <h3 className="text-sm font-semibold text-amber-950">What could be challenged</h3>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {(liabilityRiskSignals.length > 0 ? liabilityRiskSignals : ['No major liability challenge signals were detected from the current facts.']).map((item) => (
                  <li key={item} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-4">
              <h3 className="text-sm font-semibold text-brand-950">Best ways to strengthen it</h3>
              <ul className="mt-3 space-y-2 text-sm text-brand-900">
                {liabilityStrengthenActions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            This is a model-based liability estimate, not a legal conclusion. An attorney will confirm fault, defenses, and comparative negligence after reviewing the documents and applicable law.
          </p>
        </section>
        )}

        {activeResultsTab === 'medical' && (
        <div id="medical-story-review" ref={medicalReviewRef} className="mb-8 scroll-mt-6">
          <PlaintiffMedicalChronology
            review={plaintiffMedicalReview}
            saving={medicalReviewSaving}
            statusMessage={medicalReviewStatus}
            errorMessage={medicalReviewError}
            onEditChange={handleMedicalReviewEditChange}
            onSaveDraft={() => persistPlaintiffMedicalReview({ status: 'pending' })}
            onConfirm={() => persistPlaintiffMedicalReview({ status: 'confirmed' })}
            onSkip={() => persistPlaintiffMedicalReview({ status: 'skipped' })}
          />
        </div>
        )}

        {activeResultsTab === 'documents' && (
        <section className="premium-panel mb-8" aria-label="Documents">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Documents</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">Strengthen your file</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Uploading the right documents can improve estimate confidence and make attorney review faster.
              </p>
            </div>
            <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">{evidenceCompletionPercent}% ready</p>
          </div>

          {missingDocItems.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {missingDocItems.slice(0, 6).map((item: any) => {
                const action = getMissingDocAction(item, assessment?.id)
                return (
                  <div key={item.key ?? item.label} className="subtle-panel px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900">{item?.label ?? 'Missing document'}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {item?.priority === 'high' ? 'High impact on value and attorney review speed.' : 'Helpful for strengthening the file.'}
                    </p>
                    <Link
                      to={action.to}
                      className="mt-3 inline-flex items-center rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                    >
                      {action.label}
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              No major missing-document gaps were detected from the current file. You look close to attorney-review ready.
            </div>
          )}

          {treatmentGapItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Treatment gap detected: {treatmentGapItems?.[0]?.gapDays ?? 'Unknown'} days between {treatmentGapItems?.[0]?.startDate ? new Date(treatmentGapItems[0].startDate).toLocaleDateString() : 'an unknown start date'} and {treatmentGapItems?.[0]?.endDate ? new Date(treatmentGapItems[0].endDate).toLocaleDateString() : 'an unknown end date'}.
            </div>
          )}
        </section>
        )}

        {activeResultsTab === 'value' && (
        <details className="surface-panel mb-10 px-5 py-5">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Why we estimated this</p>
                <p className="mt-1 text-sm text-slate-600">Open for liability, settlement, timeline, and document details.</p>
              </div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Show details</span>
            </div>
          </summary>

        <div className="mt-6 mb-8">
          <PlaintiffCaseCommandCenter summary={commandCenter} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Overall assessment</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="absolute h-20 w-20 -rotate-90 text-slate-200" viewBox="0 0 36 36" aria-hidden>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  className="text-brand-600"
                  strokeWidth="3"
                  strokeDasharray={`${caseStrengthScore} ${100 - caseStrengthScore}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="relative text-lg font-bold text-brand-800 tabular-nums">{caseStrengthScore}</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {caseStrengthScore} / 100 - {caseStrengthLabel(caseStrengthScore)}
              </p>
              <p className="text-sm text-slate-600 mt-1">Composite score from viability and file signals.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 mb-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2 text-center">Liability outlook</p>
          <p className="text-lg font-semibold text-slate-900 capitalize text-center tracking-tight">{liabilityOutlook}</p>
          <p className="text-sm text-slate-600 text-center mt-2 leading-relaxed max-w-xl mx-auto">{liabilitySummary}</p>
          {comparativeFaultPercent > 0 && (
            <p className="text-xs text-amber-700 text-center mt-2">
              Comparative fault risk: insurers may argue you share about {comparativeFaultPercent}% of the blame.
            </p>
          )}
          {liabilityFactors.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3 text-center">Factors considered</p>
              <div className="grid gap-2 max-w-lg mx-auto">
                {liabilityFactors.map((factor: string) => (
                  <div key={factor} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700 text-left leading-relaxed">
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border-l-4 border-l-brand-600 border border-slate-200 bg-slate-50/60 p-6 sm:p-8 mb-10 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Estimated settlement range</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
            {formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}
          </p>
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">Confidence: {evidenceLevelConfidence.confidence}</span>
              <span className="text-gray-500"> - {evidenceLevelConfidence.level}</span>
            </p>
            {evidenceLevelConfidence.confidence !== 'Very high' && (
              <>
                <p className="text-xs text-gray-400 mt-1">
                  {t('results.uploadHint')}
                </p>
                <div className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
                  <p className="font-medium text-gray-600 mb-1">{t('results.evidenceLevel')}</p>
                  <table className="w-full">
                    <tbody>
                      <tr><td className="py-0.5">{t('results.noDocuments')}</td><td className="py-0.5 text-right">{t('results.low')}</td></tr>
                      <tr><td className="py-0.5">{t('results.medicalBills')}</td><td className="py-0.5 text-right">{t('results.medium')}</td></tr>
                      <tr><td className="py-0.5">{t('results.medicalRecords')}</td><td className="py-0.5 text-right">{t('results.high')}</td></tr>
                      <tr><td className="py-0.5">{t('results.policeAndRecords')}</td><td className="py-0.5 text-right">{t('results.veryHigh')}</td></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Chance of a successful outcome</p>
              <p className="text-lg font-semibold text-gray-900">{successProbability}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Likely timeline</p>
              <p className="text-lg font-semibold text-gray-900">{estimatedTimeline}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recommended next step</p>
              <p className="text-lg font-semibold text-brand-600">Send to attorneys and keep uploading missing records</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">
            Derived from your current file and {venueState === 'CA' ? 'California' : venueState} matter context. Not a guarantee of outcome.
          </p>
        </div>

        <div className="grid gap-5 mb-10">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-brand-600 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">Comparable benchmarks</h3>
              </div>
              {settlementBenchmarks ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(settlementBenchmarks.p50)}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Midpoint for comparable {formatClaimTypeLabel(assessment?.claimType)} cases in {venueState === 'CA' ? 'California' : venueState}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">25th %</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(settlementBenchmarks.p25)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">75th %</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(settlementBenchmarks.p75)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-gray-500">Sample size</p>
                      <p className="font-semibold text-gray-900">{settlementBenchmarks.count}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  We do not have enough benchmark data for this venue yet, so your estimate is based mainly on your facts, injuries, and uploaded records.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-brand-600 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">Expected timeline</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{timelineEstimate.label}</p>
              <p className="text-sm text-gray-600 mt-1">
                Stage: {timelineEstimate.stage} • Confidence: {timelineEstimate.confidence}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {timelineDrivers.slice(0, 3).map((driver) => (
                  <li key={driver} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`${solStatusTone} border rounded-xl p-5 sm:p-6 shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Statute of limitations</h3>
            </div>
            <p className="font-medium">
              {solDeadline ? `Estimated filing deadline: ${solDeadline}` : 'We could not calculate a filing deadline from the current facts.'}
            </p>
            <p className="text-sm mt-1">
              {solDeadline ? `Time remaining: ${solRemaining}.` : 'Add the incident date and venue details to confirm this risk.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5 text-brand-600 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Documentation & readiness</h3>
            </div>
            {missingDocItems.length > 0 ? (
              <div className="space-y-3">
                {missingDocItems.slice(0, 5).map((item: any) => (
                  <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{item?.label ?? 'Missing item'}</p>
                      <p className="text-sm text-gray-600">
                        {item.priority === 'high' ? 'High impact on value and attorney review speed.' : item.priority === 'medium' ? 'Helpful for strengthening the file.' : 'Useful supporting context.'}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : item.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
                {treatmentGapItems.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    Treatment gap detected: {treatmentGapItems?.[0]?.gapDays ?? 'Unknown'} days between {treatmentGapItems?.[0]?.startDate ? new Date(treatmentGapItems[0].startDate).toLocaleDateString() : 'an unknown start date'} and {treatmentGapItems?.[0]?.endDate ? new Date(treatmentGapItems[0].endDate).toLocaleDateString() : 'an unknown end date'}.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                No major missing-document gaps were detected from the current file. You look close to attorney-review ready.
              </div>
            )}
          </div>
        </div>
        </details>
        )}

        {activeResultsTab === 'attorney' && (
        <section className="premium-panel mb-8" aria-label="Attorney review">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <span className="font-semibold">Attorney review does not mean you are hiring a lawyer.</span>{' '}
          It sends your summary for review so interested attorneys can contact you. You decide whether to speak with or hire anyone.
        </div>

        {showSavePrompt && (
          <div className="mb-8 rounded-xl border border-brand-200/80 bg-brand-50/70 px-5 py-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-brand-950">Save your case</h2>
            <p className="mt-2 text-sm text-brand-900/90 leading-relaxed">
              Create an account to return to this matter, upload records, and track attorney responses.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={`/register?redirect=/dashboard&assessmentId=${assessment.id}`}
                className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              >
                Create account
              </Link>
              <Link
                to={`/login?redirect=/dashboard&assessmentId=${assessment.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50/80"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        <div id="attorney-handoff" className="border-t border-slate-200 pt-8 mt-2 scroll-mt-6">
          <p className="text-center text-sm text-slate-600 mb-3 leading-relaxed">
            Ready for attorney review? Matched counsel typically respond within one business day.
          </p>
          {medicalReviewPending && (
            <p className="mb-3 text-center text-sm text-amber-700">
              Review your medical story above, then confirm it or skip it before sending your case.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (medicalReviewPending) {
                openAnchoredResultsSection('#medical-story-review')
                return
              }
              openSendModal()
            }}
            className="block w-full text-center py-3.5 text-base font-semibold text-white bg-brand-700 rounded-xl hover:bg-brand-800 shadow-sm transition-colors"
          >
            {medicalReviewPending ? 'Review Medical Story First' : t('results.sendForReview')}
          </button>
        </div>
        </section>
        )}
        </div>
      </div>

      <Suspense fallback={<ResultsPanelSkeleton message="Loading report details..." />}>
        <ResultsReportDetails
          assessmentId={assessment.id}
          assessmentClaimType={assessment?.claimType}
          evidenceCompletionPercent={evidenceCompletionPercent}
          handleCopyShareLink={handleCopyShareLink}
          handleDownloadReportPdf={handleDownloadReportPdf}
          improveCaseValueItems={improveCaseValueItems}
          isLoggedIn={isLoggedIn}
          rankedAttorneys={rankedAttorneyCards}
          shareCopied={shareCopied}
          solDeadline={solDeadline}
          solRemaining={solRemaining}
          settlementHigh={formatCurrency(settlementHigh)}
          settlementLow={formatCurrency(settlementLow)}
          venueCounty={venueCounty}
          venueState={venueState}
          whatThisMeansBullets={whatThisMeansBullets}
        />
      </Suspense>
    </div>
  )
}
