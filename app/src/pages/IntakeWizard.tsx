import { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { testAuth } from '../lib/api'
import { createAssessment, updateAssessment, predict, getAssessment, getEvidenceFiles, analyzeCaseWithChatGPT, getSolRules, uploadEvidenceFile, processEvidenceFile } from '../lib/api-plaintiff'
import { validateAssessmentSubmission } from '../lib/intakeValidation'
import type { AssessmentWrite, JurisdictionIntelligence, PlaintiffContext, ExpectationCheck } from '../lib/schemas'
import { AlertCircle, ChevronRight, Info } from 'lucide-react'
import InlineEvidenceUpload from '../components/InlineEvidenceUpload'
import Tooltip from '../components/Tooltip'

const IntakeWizardDeferredSteps = lazy(() => import('../components/IntakeWizardDeferredSteps'))

type Step = 'basic' | 'incident' | 'injuries' | 'damages' | 'review'
type IncidentTimelineEvent = { label: string; order: number; approxDate?: string; isCustom?: boolean }
type IncidentDraft = {
  date?: string
  location?: string
  narrative?: string
  parties?: string[]
  timeline?: IncidentTimelineEvent[]
}
type AssessmentDraft = {
  userId?: string
  claimType?: AssessmentWrite['claimType']
  venue?: { state?: string; county?: string }
  incident?: IncidentDraft
  liability?: Record<string, any>
  injuries?: Array<Record<string, any>>
  treatment?: Array<Record<string, any>>
  damages?: Record<string, any>
  insurance?: Record<string, any>
  jurisdiction?: JurisdictionIntelligence
  plaintiffContext?: PlaintiffContext
  expectationCheck?: ExpectationCheck
  consents?: {
    tos?: boolean
    privacy?: boolean
    ml_use?: boolean
    hipaa?: boolean
  }
}

const VENUE_TENDENCIES: Record<string, string> = {
  CA: 'plaintiff-leaning',
  NY: 'plaintiff-leaning',
  FL: 'mixed',
  TX: 'defense-leaning',
  IL: 'mixed',
  PA: 'mixed',
  OH: 'mixed',
  GA: 'defense-leaning',
  NC: 'defense-leaning',
  MI: 'mixed'
}

const NEGLIGENCE_RULES: Record<string, string> = {
  CA: 'pure comparative',
  NY: 'pure comparative',
  FL: 'modified comparative (50%)',
  TX: 'modified comparative (51%)',
  IL: 'modified comparative (51%)',
  PA: 'modified comparative (51%)',
  OH: 'modified comparative (51%)',
  GA: 'modified comparative (50%)',
  NC: 'contributory',
  MI: 'modified comparative (51%)'
}

const EXPECTATION_OPTIONS = [
  { value: 'fast_resolution', label: 'Fast resolution' },
  { value: 'fair_compensation', label: 'Fair compensation' },
  { value: 'understanding_rights', label: 'Understanding my rights' },
  { value: 'reducing_stress', label: 'Reducing stress' }
] as const

export default function IntakeWizard() {
  const navigate = useNavigate()
  const { assessmentId: routeAssessmentId } = useParams<{ assessmentId: string }>()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState<Step>('basic')
  const intakeStepStorageKey = 'intake_last_step'
  const [loading, setLoading] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(routeAssessmentId || null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<Record<string, any[]>>({})
  const [previewFile, setPreviewFile] = useState<{url: string, name: string} | null>(null)
  const isEditMode = !!routeAssessmentId
  const [consentRead, setConsentRead] = useState({
    tos: false,
    privacy: false,
    ml_use: false,
    hipaa: false
  })
  
  // Debug logging
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token')
    console.log('IntakeWizard mounted:', {
      routeAssessmentId,
      assessmentId,
      isEditMode,
      hasAuthToken: !!authToken,
      authTokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'none'
    })
    
    // Test authentication if we have a token
    if (authToken) {
      testAuth().catch(error => {
        console.error('Authentication test failed:', error)
      })
    }
  }, [routeAssessmentId, assessmentId, isEditMode])
  
  const defaultIncidentTimeline: IncidentTimelineEvent[] = [
    { label: 'Accident', order: 1 },
    { label: 'First symptoms', order: 2 },
    { label: 'First medical visit', order: 3 },
    { label: 'Time off work', order: 4 }
  ]

  const blankFormData: AssessmentDraft = {
    claimType: undefined,
    venue: { state: '', county: '' },
    incident: {
      date: '',
      location: '',
      narrative: '',
      timeline: defaultIncidentTimeline
    },
    injuries: [],
    treatment: [],
    damages: {},
    jurisdiction: {},
    plaintiffContext: {},
    expectationCheck: {},
    consents: {
      tos: false,
      privacy: false,
      ml_use: false,
      hipaa: false
    }
  }

  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const draftStorageKey = 'intake_draft_v1'

  const [formData, setFormData] = useState<AssessmentDraft>(blankFormData)

  const steps: { key: Step; title: string; description: string }[] = [
    { key: 'basic', title: 'Basic Info', description: 'Case type and location' },
    { key: 'incident', title: 'Incident Details', description: 'What happened' },
    { key: 'injuries', title: 'Injuries & Treatment', description: 'Medical information' },
    { key: 'damages', title: 'Damages', description: 'Financial impact' },
    { key: 'review', title: 'Review & Submit', description: 'Final review' }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  const updateFormData = (updates: Partial<AssessmentDraft>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }

  const updateJurisdiction = (updates: Partial<JurisdictionIntelligence>) => {
    setFormData(prev => ({
      ...prev,
      jurisdiction: { ...(prev.jurisdiction || {}), ...updates }
    }))
  }

  const updatePlaintiffContext = (updates: Partial<PlaintiffContext>) => {
    setFormData(prev => ({
      ...prev,
      plaintiffContext: { ...(prev.plaintiffContext || {}), ...updates }
    }))
  }

  const updateExpectationCheck = (updates: Partial<ExpectationCheck>) => {
    setFormData(prev => ({
      ...prev,
      expectationCheck: { ...(prev.expectationCheck || {}), ...updates }
    }))
  }

  const updateIncidentTimeline = (timeline: IncidentTimelineEvent[]) => {
    updateFormData({ incident: { ...formData.incident, timeline } })
  }

  const updateLiability = (updates: Record<string, any>) => {
    updateFormData({ liability: { ...(formData.liability || {}), ...updates } })
  }

  const resolveVenueTendency = (state?: string) => {
    if (!state) return undefined
    return VENUE_TENDENCIES[state.toUpperCase()] || 'unknown'
  }

  const resolveNegligenceRule = (state?: string) => {
    if (!state) return undefined
    return NEGLIGENCE_RULES[state.toUpperCase()] || 'unknown'
  }

  const hydrateSolRules = async (state: string) => {
    try {
      const response = await getSolRules(state)
      updateJurisdiction({
        statuteTimelines: response,
        detectedAt: new Date().toISOString()
      })
    } catch {
      updateJurisdiction({
        statuteTimelines: { state: state.toUpperCase(), rules: {}, error: 'unavailable' },
        detectedAt: new Date().toISOString()
      })
    }
  }

  const updateInjuryField = (field: string, value: any) => {
    const existing = Array.isArray(formData.injuries) && formData.injuries.length > 0
      ? formData.injuries[0]
      : {}
    updateFormData({ injuries: [{ ...existing, [field]: value }] })
  }

  const updateTreatmentField = (field: string, value: any) => {
    const existing = Array.isArray(formData.treatment) && formData.treatment.length > 0
      ? formData.treatment[0]
      : {}
    updateFormData({ treatment: [{ ...existing, [field]: value }] })
  }

  const intakeProgress = (() => {
    const facts: any = formData
    const injury = facts.injuries?.[0] || {}
    const filled = [
      facts.claimType,
      facts.venue?.state,
      facts.venue?.county,
      facts.incident?.date || (facts.incident?.timeline?.length ? 'timeline' : ''),
      facts.incident?.location,
      facts.incident?.narrative,
      injury?.description,
      injury?.painWorst,
      injury?.dailyImpact,
      injury?.currentLimitations,
      injury?.sleepDisruption,
      injury?.anxietyStress,
      injury?.abilityToWork,
      injury?.hobbiesImpact
    ].filter(v => v !== undefined && v !== null && String(v).trim().length > 0)
    const percent = Math.min(100, Math.round((filled.length / 14) * 100))
    return { percent, filled: filled.length }
  })()

  const readinessDetails = (() => {
    const injury = Array.isArray(formData.injuries) ? formData.injuries[0] : undefined
    const hasClaimType = !!formData.claimType
    const hasVenue = !!formData.venue?.state && !!formData.venue?.county
    const hasIncidentNarrative = !!formData.incident?.narrative
    const hasIncidentDate = !!formData.incident?.date || (formData.incident?.timeline?.length ?? 0) > 0
    const hasInjuries = !!injury?.description
    const hasTreatment = Array.isArray(formData.treatment) && formData.treatment.length > 0
    const hasDamages = !!formData.damages && Object.values(formData.damages).some(value => value !== undefined && value !== null && value !== '')

    const strengths = [
      hasClaimType ? 'Claim type selected' : null,
      hasVenue ? 'Venue details included' : null,
      hasIncidentNarrative ? 'Incident narrative documented' : null,
      hasIncidentDate ? 'Incident timeline started' : null,
      hasInjuries ? 'Injury details captured' : null,
      hasTreatment ? 'Treatment notes added' : null,
      hasDamages ? 'Financial impact included' : null
    ].filter(Boolean) as string[]

    const missing = [
      !hasVenue ? 'Venue details' : null,
      !hasIncidentDate ? 'Incident date or timeline' : null,
      !hasIncidentNarrative ? 'Incident narrative' : null,
      !hasInjuries ? 'Injury details' : null,
      !hasTreatment ? 'Treatment notes' : null,
      !hasDamages ? 'Financial impact' : null
    ].filter(Boolean) as string[]

    return {
      strengths,
      missing,
      topImprove: missing[0]
    }
  })()

  const feedbackMessage = (() => {
    if (intakeProgress.percent >= 70) return 'You’re building a strong case profile.'
    if (intakeProgress.percent >= 45) return 'Great progress. Each detail strengthens your case.'
    if (intakeProgress.percent >= 25) return 'You’re on the right track. Keep going.'
    return null
  })()

  const handleEvidenceFiles = (category: string, files: any[]) => {
    setPendingEvidenceFiles(prev => ({
      ...prev,
      [category]: files
    }))
  }

  const removeEvidenceFile = (category: string, fileIndex: number) => {
    setPendingEvidenceFiles(prev => {
      const currentFiles = prev[category] || []
      const newFiles = currentFiles.filter((_, index) => index !== fileIndex)
      return {
        ...prev,
        [category]: newFiles
      }
    })
  }

  const clearCategoryFiles = (category: string) => {
    setPendingEvidenceFiles(prev => ({
      ...prev,
      [category]: []
    }))
  }

  const uploadPendingEvidenceFiles = async (id: string) => {
    const uploads = Object.entries(pendingEvidenceFiles).flatMap(([category, files]) => {
      const safeFiles = Array.isArray(files) ? files : []
      return safeFiles
        .filter((file: any) => file?.rawFile && String(file.id || '').startsWith('temp_'))
        .map((file: any) => ({ category, file }))
    })

    if (uploads.length === 0) return

    for (const { category, file } of uploads) {
      try {
        const formData = new FormData()
        formData.append('file', file.rawFile)
        formData.append('assessmentId', id)
        formData.append('category', category)
        formData.append('subcategory', file.subcategory || '')
        formData.append('description', file.description || '')
        formData.append('uploadMethod', file.uploadMethod || 'manual')
        const uploaded = await uploadEvidenceFile(formData)
        if (uploaded?.id) {
          try {
            await processEvidenceFile(uploaded.id)
          } catch {
            // Ignore processing errors for unauthenticated users
          }
        }
      } catch (error) {
        console.error('Failed to upload pending evidence file:', error)
      }
    }
  }

  // Load existing assessment data when in edit mode
  const loadExistingAssessment = async () => {
    if (!routeAssessmentId) return
    
    try {
      setLoading(true)
      const existingAssessment = await getAssessment(routeAssessmentId)
      
      if (existingAssessment && existingAssessment.facts) {
        // Parse the facts JSON string and populate form data
        const facts = typeof existingAssessment.facts === 'string' 
          ? JSON.parse(existingAssessment.facts) 
          : existingAssessment.facts
        
        setFormData({
          claimType: existingAssessment.claimType || 'auto',
          venue: {
            state: existingAssessment.venueState || 'CA',
            county: existingAssessment.venueCounty || undefined
          },
          incident: facts.incident || {},
          injuries: facts.injuries || [],
          treatment: facts.treatment || [],
          damages: facts.damages || {},
          consents: facts.consents || {}
        })
      }
    } catch (error) {
      console.error('Failed to load existing assessment:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load existing assessment data on component mount if in edit mode
  useEffect(() => {
    if (isEditMode && routeAssessmentId) {
      loadExistingAssessment()
    }
  }, [isEditMode, routeAssessmentId])

  useEffect(() => {
    if (isEditMode) return
    try {
      if (searchParams.get('fresh') === '1') {
        localStorage.removeItem(draftStorageKey)
        localStorage.removeItem(intakeStepStorageKey)
        setFormData(blankFormData)
        setDraftRestored(false)
        setDraftSavedAt(null)
        setAssessmentId(null)
        setPendingEvidenceFiles({})
        setErrors({})
        setCurrentStep('basic')
        setPreviewFile(null)
        setIsHydrated(true)
        return
      }
      const stored = localStorage.getItem(draftStorageKey)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (!parsed?.data) return
      const hasOldDefaults = parsed.data?.claimType === 'auto' && parsed.data?.venue?.state === 'CA'
      const shouldReset = !parsed.data?.claimType && !parsed.data?.venue?.state || hasOldDefaults
      if (shouldReset) {
        localStorage.removeItem(draftStorageKey)
        setIsHydrated(true)
        return
      }
      setFormData(parsed.data)
      setDraftSavedAt(parsed.savedAt || null)
      setDraftRestored(true)
      const savedStep = localStorage.getItem(intakeStepStorageKey) as Step | null
      if (savedStep) {
        setCurrentStep(savedStep)
      }
    } catch {
      // Ignore malformed draft data
    } finally {
      setIsHydrated(true)
    }
  }, [isEditMode])

  useEffect(() => {
    if (isEditMode || !isHydrated) return
    if (formData.venue?.state) return
    if (formData.jurisdiction?.autoDetected) return

    let isActive = true

    const detectJurisdiction = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/')
        if (!response.ok) return
        const data = await response.json()
        if (!isActive) return

        const detectedState = typeof data?.region_code === 'string' ? data.region_code : undefined
        const detectedCounty = typeof data?.county === 'string' ? data.county : undefined

        setFormData(prev => {
          const nextVenue = prev.venue?.state
            ? prev.venue
            : {
              ...prev.venue,
              state: detectedState || prev.venue?.state || '',
              county: prev.venue?.county || detectedCounty || ''
            }
          return {
            ...prev,
            venue: nextVenue,
            jurisdiction: {
              ...(prev.jurisdiction || {}),
              autoDetected: !!detectedState || !!detectedCounty,
              detectedAt: new Date().toISOString(),
              state: detectedState,
              county: detectedCounty,
              venueTendency: resolveVenueTendency(detectedState),
              negligenceRule: resolveNegligenceRule(detectedState)
            }
          }
        })

        if (detectedState) {
          void hydrateSolRules(detectedState)
        }
      } catch {
        // Ignore location lookup errors
      }
    }

    void detectJurisdiction()

    return () => {
      isActive = false
    }
  }, [formData.venue?.state, formData.venue?.county, formData.jurisdiction?.autoDetected, isEditMode, isHydrated])

  useEffect(() => {
    const state = formData.venue?.state
    if (!state) return
    updateJurisdiction({
      state,
      venueTendency: resolveVenueTendency(state),
      negligenceRule: resolveNegligenceRule(state)
    })
    void hydrateSolRules(state)
  }, [formData.venue?.state])

  useEffect(() => {
    if (!formData.venue?.county) return
    updateJurisdiction({ county: formData.venue.county })
  }, [formData.venue?.county])

  useEffect(() => {
    localStorage.setItem(intakeStepStorageKey, currentStep)
  }, [currentStep])

  useEffect(() => {
    if (currentStep !== 'basic') return
    const timeoutId = window.setTimeout(() => {
      void import('../components/IntakeWizardDeferredSteps')
    }, 400)
    return () => window.clearTimeout(timeoutId)
  }, [currentStep])

  useEffect(() => {
    const step = searchParams.get('step') as Step | null
    if (step && ['basic', 'incident', 'injuries', 'damages', 'review'].includes(step)) {
      setCurrentStep(step)
    }
  }, [searchParams])

  useEffect(() => {
    if (currentStep !== 'review') return
    if (!isEditMode && !isHydrated) return
    const missing: Record<string, string> = {}
    if (!formData.claimType) missing.claimType = 'Please select a claim type'
    if (!formData.venue?.state) missing.venue = 'Please select a state'
    if (!formData.venue?.county || formData.venue.county.trim().length === 0) {
      missing.venueCounty = 'Please enter a county'
    }
    if (!formData.incident?.date) missing.incidentDate = 'Please enter the incident date'
    if (!formData.incident?.narrative || formData.incident.narrative.length < 10) {
      missing.narrative = 'Please provide a detailed description (at least 10 characters)'
    }
    if (!Array.isArray(formData.injuries) || formData.injuries.length === 0) {
      missing.injuries = 'Please describe your injuries'
    }

    if (Object.keys(missing).length === 0) return
    setErrors(missing)
    if (missing.claimType || missing.venue || missing.venueCounty) {
      setCurrentStep('basic')
    } else if (missing.incidentDate || missing.narrative) {
      setCurrentStep('incident')
    } else {
      setCurrentStep('injuries')
    }
  }, [currentStep, formData])

  useEffect(() => {
    const syncConsentReadFromStorage = () => {
      setConsentRead({
        tos: localStorage.getItem('consent_read_tos') === 'true',
        privacy: localStorage.getItem('consent_read_privacy') === 'true',
        ml_use: localStorage.getItem('consent_read_ml') === 'true',
        hipaa: localStorage.getItem('consent_read_hipaa') === 'true',
      })
    }
    syncConsentReadFromStorage()
    window.addEventListener('focus', syncConsentReadFromStorage)
    return () => window.removeEventListener('focus', syncConsentReadFromStorage)
  }, [currentStep, searchParams])

  useEffect(() => {
    if (isEditMode) return
    const handle = setTimeout(() => {
      try {
        const payload = { data: formData, savedAt: Date.now() }
        localStorage.setItem(draftStorageKey, JSON.stringify(payload))
        setDraftSavedAt(payload.savedAt)
      } catch {
        // Ignore localStorage errors
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [formData, isEditMode])

  // Load existing evidence files when in edit mode
  const loadExistingEvidenceFiles = async () => {
    if (!routeAssessmentId) return
    
    try {
      // Load evidence files for each category
      const categories = ['police_report', 'medical_records', 'photos', 'bills']
      const evidenceData: Record<string, any[]> = {}
      
      for (const category of categories) {
        try {
          const files = await getEvidenceFiles(routeAssessmentId, category)
          if (files.length > 0) {
            evidenceData[category] = files
          }
        } catch (error) {
          console.error(`Failed to load evidence files for category ${category}:`, error)
        }
      }
      
      console.log('Loaded existing evidence files:', evidenceData)
      if (Object.keys(evidenceData).length > 0) {
        setPendingEvidenceFiles(evidenceData)
      }
    } catch (error) {
      console.error('Failed to load existing evidence files:', error)
    }
  }

  useEffect(() => {
    if (isEditMode && routeAssessmentId) {
      loadExistingEvidenceFiles()
    }
  }, [isEditMode, routeAssessmentId])

  useEffect(() => {
    if (currentStep !== 'incident') return
    const hasTimeline = Array.isArray(formData.incident?.timeline) && formData.incident.timeline.length > 0
    if (!hasTimeline) {
      updateIncidentTimeline(defaultIncidentTimeline)
    }
  }, [currentStep])

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (step) {
      case 'basic':
        if (!formData.claimType) newErrors.claimType = 'Please select a claim type'
        if (!formData.venue?.state) newErrors.venue = 'Please select a state'
        if (!formData.venue?.county || formData.venue.county.trim().length === 0) {
          newErrors.venueCounty = 'Please enter a county'
        }
        break
      case 'incident':
        if (!formData.incident?.date) {
          newErrors.incidentDate = 'Please enter the incident date'
        }
        if (!formData.incident?.narrative || formData.incident.narrative.length < 10) {
          newErrors.narrative = 'Please provide a detailed description (at least 10 characters)'
        }
        break
      case 'injuries':
        if (!Array.isArray(formData.injuries) || formData.injuries.length === 0) {
          newErrors.injuries = 'Please describe your injuries'
        } else {
          const description = typeof formData.injuries[0]?.description === 'string'
            ? formData.injuries[0].description.trim()
            : ''
          if (!description) newErrors.injuries = 'Please describe your injuries'
        }
        break
      case 'damages':
        // Optional step - no validation required
        break
      case 'review':
        if (!formData.consents?.tos) newErrors.tos = 'You must accept the terms of service'
        if (!formData.consents?.privacy) newErrors.privacy = 'You must accept the privacy policy'
        if (!formData.consents?.ml_use) newErrors.ml_use = 'You must consent to ML processing'
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) return
    
    const stepOrder: Step[] = ['basic', 'incident', 'injuries', 'damages', 'review']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const stepOrder: Step[] = ['basic', 'incident', 'injuries', 'damages', 'review']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleSubmit = async () => {
    if (!validateStep('review')) return
    
    setLoading(true)
    try {
      console.log('handleSubmit called, isEditMode:', isEditMode, 'assessmentId:', assessmentId)
      
      // Check authentication
      const token = localStorage.getItem('auth_token')
      console.log('Auth token present:', !!token)
      
      // Sanitize timeline: remove items with empty labels (e.g. added but not filled custom events)
      const sanitizedFormData = {
        ...formData,
        incident: formData.incident
          ? {
              ...formData.incident,
              timeline: formData.incident.timeline?.filter((item) => (item.label ?? '').trim().length > 0)
            }
          : formData.incident
      }

      // Validate the complete form
      console.log('Form data before validation:', sanitizedFormData)
      console.log('Consents specifically:', formData.consents)
      
      const validationResult = validateAssessmentSubmission(sanitizedFormData)
      if (!validationResult.success) {
        console.error('Form validation failed:', validationResult.errors)
        const errorMessages = validationResult.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ')
        throw new Error(`Form validation failed: ${errorMessages}`)
      }
      const validatedData = validationResult.data
      console.log('Form validation successful, validatedData:', validatedData)
      
      let id = assessmentId
      if (!id) {
        // Create new assessment
        console.log('Creating new assessment...')
        id = await createAssessment(validatedData)
        setAssessmentId(id)
        console.log('Created assessment with id:', id)
      } else {
        // Update existing assessment
        console.log('Updating existing assessment with id:', id)
        await updateAssessment(id, validatedData)
        console.log('Assessment updated successfully')
      }

      try {
        localStorage.setItem('pending_assessment_id', id!)
      } catch {
        /* ignore */
      }
      navigate(`/results/${id}`, { replace: true })

      if (id) {
        try {
          await uploadPendingEvidenceFiles(id)
        } catch (e) {
          console.error('Evidence upload after intake failed', e)
        }
      }

      console.log('Getting prediction for assessment:', id)
      try {
        const prediction = await predict(id!)
        console.log('Prediction received:', prediction)
      } catch (e) {
        console.error('Prediction after intake failed', e)
      }

      console.log('Starting ChatGPT analysis for assessment:', id)
      analyzeCaseWithChatGPT(id!).catch(error => {
        console.error('ChatGPT analysis failed:', error)
      })
    } catch (error: any) {
      console.error('Submission error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      const errorMessage = error.message || 'Failed to submit assessment. Please try again.'
      setErrors({ submit: errorMessage })
      console.error('Final error message:', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>Case readiness</span>
                <span>{intakeProgress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${intakeProgress.percent}%` }}
                />
              </div>
              {feedbackMessage && (
                <div className="mt-2 text-xs text-brand-700">
                  {feedbackMessage}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claim Type (Required)
              </label>
              <select
                value={formData.claimType || ''}
                onChange={(e) => updateFormData({ claimType: e.target.value as any })}
                className={`select ${errors.claimType ? 'border-red-500' : ''}`}
              >
                <option value="">Select claim type</option>
                <option value="auto">Auto Accident</option>
                <option value="slip_and_fall">Slip-and-Fall</option>
                <option value="dog_bite">Dog Bite</option>
                <option value="medmal">Medical Malpractice</option>
                <option value="product">Product Liability</option>
                <option value="nursing_home_abuse">Nursing Home Abuse</option>
                <option value="wrongful_death">Wrongful Death</option>
                <option value="high_severity_surgery">High-Severity / Surgery</option>
              </select>
              {errors.claimType && (
                <p className="mt-1 text-sm text-red-600">{errors.claimType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State (Required)
              </label>
              <select
                value={formData.venue?.state || ''}
                onChange={(e) => updateFormData({ venue: { ...formData.venue, state: e.target.value } })}
                className={`select ${errors.venue ? 'border-red-500' : ''}`}
              >
                <option value="">Select state</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="IL">Illinois</option>
                <option value="PA">Pennsylvania</option>
                <option value="OH">Ohio</option>
                <option value="GA">Georgia</option>
                <option value="NC">North Carolina</option>
                <option value="MI">Michigan</option>
              </select>
              {errors.venue && (
                <p className="mt-1 text-sm text-red-600">{errors.venue}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County (Required)
              </label>
              <input
                type="text"
                value={formData.venue?.county || ''}
                onChange={(e) => updateFormData({ venue: { ...formData.venue, county: e.target.value } })}
                className={`input ${errors.venueCounty ? 'border-red-500' : ''}`}
                placeholder="e.g., Los Angeles"
              />
              {errors.venueCounty && (
                <p className="mt-1 text-sm text-red-600">{errors.venueCounty}</p>
              )}
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-4">
              <div className="text-sm font-semibold text-gray-900">Plaintiff Context (Optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment type
                  </label>
                  <select
                    value={formData.plaintiffContext?.employmentType || ''}
                    onChange={(e) => updatePlaintiffContext({ employmentType: e.target.value as any })}
                    className="select"
                  >
                    <option value="">Select</option>
                    <option value="w2">W-2</option>
                    <option value="1099">1099</option>
                    <option value="self_employed">Self-employed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary income source
                  </label>
                  <input
                    type="text"
                    value={formData.plaintiffContext?.primaryIncomeSource || ''}
                    onChange={(e) => updatePlaintiffContext({ primaryIncomeSource: e.target.value })}
                    className="input"
                    placeholder="e.g., hourly wages, commissions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dependents
                  </label>
                  <select
                    value={formData.plaintiffContext?.dependents || ''}
                    onChange={(e) => updatePlaintiffContext({ dependents: e.target.value as any })}
                    className="select"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <div className="text-sm font-semibold text-gray-900">Expectation Check</div>
              <label className="block text-sm text-gray-700">
                What’s most important to you right now?
              </label>
              <input
                type="range"
                min="0"
                max={EXPECTATION_OPTIONS.length - 1}
                step="1"
                value={Math.max(
                  0,
                  EXPECTATION_OPTIONS.findIndex(option => option.value === formData.expectationCheck?.priority)
                )}
                onChange={(e) => {
                  const index = Number(e.target.value)
                  updateExpectationCheck({ priority: EXPECTATION_OPTIONS[index]?.value })
                }}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                {EXPECTATION_OPTIONS.map(option => (
                  <span key={option.value}>{option.label}</span>
                ))}
              </div>
              {formData.expectationCheck?.priority && (
                <div className="text-xs text-gray-600">
                  Selected: {EXPECTATION_OPTIONS.find(option => option.value === formData.expectationCheck?.priority)?.label}
                </div>
              )}
            </div>
          </div>
        )

      case 'incident':
        return (
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>Case readiness</span>
                <span>{intakeProgress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${intakeProgress.percent}%` }}
                />
              </div>
              {feedbackMessage && (
                <div className="mt-2 text-xs text-brand-700">
                  {feedbackMessage}
                </div>
              )}
            </div>

            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Timeline (visual, no dates)</h4>
                <span className="text-xs text-gray-500">Order events first, refine dates later</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Why we ask: placing events in order improves recall accuracy and strengthens your case.
              </p>
              {(() => {
                const eventOptions = [
                  'Accident',
                  'First symptoms',
                  'First medical visit',
                  'Time off work',
                  'ER visit',
                  'X-ray',
                  'Physical therapy',
                  'Surgery',
                  'Follow-up visit',
                  'Returned to work'
                ]
                const timeline: IncidentTimelineEvent[] = Array.isArray(formData.incident?.timeline)
                  ? formData.incident?.timeline
                  : defaultIncidentTimeline
                return (
                  <div className="space-y-2 text-sm">
                    {timeline
                      .slice()
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((event) => {
                        const isCustom = event.isCustom ?? !eventOptions.includes(event.label)
                        const eventOrder = event.order
                        return (
                        <div key={event.order} className="flex flex-col md:flex-row md:items-center gap-2 border border-gray-100 rounded-md px-3 py-2">
                          <div className="flex-1 flex flex-col gap-2">
                            <select
                              value={isCustom ? 'Custom' : event.label}
                              onChange={(e) => {
                                const value = e.target.value
                                const nextLabel = value === 'Custom' ? '' : value
                                const next = timeline.map((item) =>
                                  item.order === eventOrder
                                    ? { ...item, label: nextLabel, isCustom: value === 'Custom' }
                                    : item
                                )
                                updateIncidentTimeline(next)
                              }}
                              className="input text-sm"
                            >
                              {eventOptions.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                              <option value="Custom">Custom</option>
                            </select>
                            {isCustom && (
                              <input
                                type="text"
                                value={event.label}
                                onChange={(e) => {
                                  const next = timeline.map((item) =>
                                    item.order === eventOrder ? { ...item, label: e.target.value } : item
                                  )
                                  updateIncidentTimeline(next)
                                }}
                                className="input text-sm"
                                placeholder="Custom event"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={event.order}
                              onChange={(e) => {
                                const next = timeline.map((item) =>
                                  item.order === eventOrder ? { ...item, order: Number(e.target.value) } : item
                                )
                                updateIncidentTimeline(next)
                              }}
                              className="input text-xs"
                            >
                              {timeline.map((_, idx) => (
                                <option key={idx + 1} value={idx + 1}>
                                  {idx + 1}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = timeline.filter((item) => item.order !== eventOrder)
                                const resequenced = filtered.map((item, idx) => ({
                                  ...item,
                                  order: idx + 1
                                }))
                                updateIncidentTimeline(resequenced)
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                              aria-label="Remove event"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )})}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...timeline, { label: '', order: timeline.length + 1, isCustom: true }]
                        updateIncidentTimeline(next)
                      }}
                      className="text-xs text-brand-600 hover:text-brand-800"
                    >
                      + Add another event
                    </button>
                  </div>
                )
              })()}
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Liability confidence</h4>
                <span className="text-xs text-gray-500">Not sure → Completely certain</span>
              </div>
              <label className="block text-sm text-gray-700">
                How confident are you the other party was at fault?
              </label>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900 tabular-nums min-w-[3rem]">
                  {Math.round((Number(formData.liability?.confidence || 0) / 10) * 100)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={Number(formData.liability?.confidence || 0)}
                  onChange={(e) => updateLiability({ confidence: Number(e.target.value) })}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Not sure</span>
                <span>Completely certain</span>
              </div>
              <p className="text-xs text-gray-500">
                Why we ask: your confidence helps flag weak-liability cases early and supports attorney review.
              </p>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Defense risk flags (optional)</h4>
              <p className="text-xs text-gray-500">
                Insurance companies often ask this — answering now helps us protect your case.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {[
                  { key: 'usedPhone', label: 'Were you using your phone?' },
                  { key: 'alcoholInvolved', label: 'Any alcohol involved?' },
                  { key: 'witnesses', label: 'Any witnesses?' },
                  { key: 'policeReport', label: 'Police report filed?' }
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {item.label}
                    </label>
                    <select
                      value={formData.liability?.[item.key] || ''}
                      onChange={(e) => updateLiability({ [item.key]: e.target.value })}
                      className="select"
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      Insurance companies often ask this — answering now helps us protect your case.
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anything else we should know? (Optional)
                </label>
                <textarea
                  value={formData.liability?.defenseNotes || ''}
                  onChange={(e) => updateLiability({ defenseNotes: e.target.value })}
                  className="textarea"
                  rows={3}
                  placeholder="Optional context to explain any answers above..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incident Date (Required)
              </label>
              <input
                type="date"
                value={formData.incident?.date || ''}
                onChange={(e) => updateFormData({ incident: { ...formData.incident, date: e.target.value } })}
                className={`input ${errors.incidentDate ? 'border-red-500' : ''}`}
              />
              {errors.incidentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.incidentDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What happened? (Required)
              </label>
              <textarea
                value={formData.incident?.narrative || ''}
                onChange={(e) => updateFormData({ incident: { ...formData.incident, narrative: e.target.value } })}
                className={`textarea ${errors.narrative ? 'border-red-500' : ''}`}
                rows={6}
                placeholder="Please describe what happened in detail..."
              />
              {errors.narrative && (
                <p className="mt-1 text-sm text-red-600">{errors.narrative}</p>
              )}
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-medium">What happens if you skip this?</span>{' '}
                Cases missing a clear incident story often settle for about 15% less.
              </div>
            </div>

            {/* Evidence Upload for Incident */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <span>Accepted files</span>
                <Tooltip content="Incident photos, police/incident reports, witness statements, and any scene documentation.">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-500 cursor-help">
                    <Info className="h-3.5 w-3.5" />
                  </span>
                </Tooltip>
              </div>
              <InlineEvidenceUpload
                assessmentId={assessmentId || undefined}
                category="police_report"
                subcategory="incident_photos"
                description="Upload incident photos and any related documents (e.g., police report, incident report, witness statements)."
                compact={true}
                onFilesUploaded={(files: any[]) => handleEvidenceFiles('police_report', files)}
              />
            </div>
          </div>
        )

      case 'injuries':
        return (
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>Case readiness</span>
                <span>{intakeProgress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${intakeProgress.percent}%` }}
                />
              </div>
              {feedbackMessage && (
                <div className="mt-2 text-xs text-brand-700">
                  {feedbackMessage}
                </div>
              )}
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Upload first (recommended)</h4>
                <span className="text-xs text-gray-500">Bills • Records • Photos</span>
              </div>
              <p className="text-xs text-gray-500">
                Upload any bills, records, or photos now. We’ll ask clarifying questions after processing.
              </p>
              <div className="border-t pt-4 space-y-4">
                <InlineEvidenceUpload
                  assessmentId={assessmentId || undefined}
                  category="medical_records"
                  subcategory="medical_bills"
                  title="Medical records"
                  description="Medical bills, records, and treatment documentation"
                  compact={true}
                  onFilesUploaded={(files: any[]) => handleEvidenceFiles('medical_records', files)}
                />
                <InlineEvidenceUpload
                  assessmentId={assessmentId || undefined}
                  category="photos"
                  subcategory="injury_photos"
                  title="Injury photos"
                  description="Photos of injuries and visible damage"
                  compact={true}
                  onFilesUploaded={(files: any[]) => handleEvidenceFiles('photos', files)}
                />
                <InlineEvidenceUpload
                  assessmentId={assessmentId || undefined}
                  category="bills"
                  subcategory="medical_bill"
                  title="Bills and receipts"
                  description="Receipts, out-of-pocket expenses, and invoices"
                  compact={true}
                  onFilesUploaded={(files: any[]) => handleEvidenceFiles('bills', files)}
                />
              </div>
            </div>

            {(() => {
              const medicalRecords = pendingEvidenceFiles.medical_records || []
              const bills = pendingEvidenceFiles.bills || []
              const photos = pendingEvidenceFiles.photos || []
              const medicalUploadCount = medicalRecords.length + bills.length
              const hasProcessedMedical = [...medicalRecords, ...bills].some(
                (file: any) => file.processingStatus === 'completed'
              )

              if (medicalUploadCount === 0 && photos.length === 0) return null

              return (
                <div className="rounded-md border border-gray-200 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Follow-up questions (optional)</h4>
                    <span className="text-xs text-gray-500">
                      {medicalUploadCount} medical docs • {photos.length} photos
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Based on your uploads{hasProcessedMedical ? '' : ' (processing may take a moment)'}.
                  </p>
                  {medicalUploadCount > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Do these records cover all treatment so far?
                        </label>
                        <select
                          value={formData.treatment?.[0]?.recordsComplete || ''}
                          onChange={(e) => updateTreatmentField('recordsComplete', e.target.value)}
                          className="select"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="unsure">Not sure</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Any surgery documented?
                        </label>
                        <select
                          value={formData.treatment?.[0]?.surgeryDocumented || ''}
                          onChange={(e) => updateTreatmentField('surgeryDocumented', e.target.value)}
                          className="select"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="unsure">Not sure</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Ongoing treatment right now?
                        </label>
                        <select
                          value={formData.treatment?.[0]?.ongoingTreatment || ''}
                          onChange={(e) => updateTreatmentField('ongoingTreatment', e.target.value)}
                          className="select"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="unsure">Not sure</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Approx. number of providers in these records
                        </label>
                        <select
                          value={formData.treatment?.[0]?.providerCount || ''}
                          onChange={(e) => updateTreatmentField('providerCount', e.target.value)}
                          className="select"
                        >
                          <option value="">Select</option>
                          <option value="1">1</option>
                          <option value="2-3">2–3</option>
                          <option value="4-6">4–6</option>
                          <option value="7+">7+</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Anything missing you want us to request? (Optional)
                    </label>
                    <textarea
                      value={formData.treatment?.[0]?.missingRecordsNotes || ''}
                      onChange={(e) => updateTreatmentField('missingRecordsNotes', e.target.value)}
                      className="textarea"
                      rows={3}
                      placeholder="e.g., imaging results, ER records, physical therapy notes..."
                    />
                  </div>
                </div>
              )
            })()}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Injuries (Required)
              </label>
              <textarea
                value={typeof formData.injuries?.[0]?.description === 'string' ? formData.injuries[0].description : ''}
                onChange={(e) => updateFormData({ injuries: [{ description: e.target.value }] })}
                className={`textarea ${errors.injuries ? 'border-red-500' : ''}`}
                rows={4}
                placeholder="Describe any injuries you sustained..."
              />
              {errors.injuries && (
                <p className="mt-1 text-sm text-red-600">{errors.injuries}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Why we ask: describing injuries helps us match your case to the right attorney and estimate value.
              </p>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Pain & Impact</h4>
                <span className="text-xs text-gray-500">No impact → Life-changing</span>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2">How bad was your pain at its worst?</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={Number(formData.injuries?.[0]?.painWorst || 0)}
                  onChange={(e) => updateInjuryField('painWorst', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2">How much did this affect your daily life?</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={Number(formData.injuries?.[0]?.dailyImpact || 0)}
                  onChange={(e) => updateInjuryField('dailyImpact', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2">How limited are you right now?</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={Number(formData.injuries?.[0]?.currentLimitations || 0)}
                  onChange={(e) => updateInjuryField('currentLimitations', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Sleep disruption</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Number(formData.injuries?.[0]?.sleepDisruption || 0)}
                    onChange={(e) => updateInjuryField('sleepDisruption', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Anxiety / stress</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Number(formData.injuries?.[0]?.anxietyStress || 0)}
                    onChange={(e) => updateInjuryField('anxietyStress', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Ability to work</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Number(formData.injuries?.[0]?.abilityToWork || 0)}
                    onChange={(e) => updateInjuryField('abilityToWork', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Ability to enjoy hobbies</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Number(formData.injuries?.[0]?.hobbiesImpact || 0)}
                    onChange={(e) => updateInjuryField('hobbiesImpact', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Not sure? You can leave these sliders at zero and update later.
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Treatment (optional)
              </label>
              <textarea
                value={typeof formData.treatment?.[0]?.description === 'string' ? formData.treatment[0].description : ''}
                onChange={(e) => updateFormData({ treatment: [{ description: e.target.value }] })}
                className="textarea"
                rows={4}
                placeholder="Any additional treatment details you want us to know..."
              />
              <p className="mt-2 text-xs text-gray-500">
                Why we ask: insurance companies often challenge gaps in treatment — documenting this helps protect your case.
              </p>
            </div>
          </div>
        )

      case 'damages':
        return (
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>Case readiness</span>
                <span>{intakeProgress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${intakeProgress.percent}%` }}
                />
              </div>
              {feedbackMessage && (
                <div className="mt-2 text-xs text-brand-700">
                  {feedbackMessage}
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-gray-600">
                This section is optional. You can add financial information later.
              </p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <span className="font-medium">What happens if you skip this?</span>{' '}
              Cases missing financial impact details often settle for about 12% less.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Bills ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.damages?.med_charges || ''}
                  onChange={(e) => updateFormData({ 
                    damages: { ...formData.damages, med_charges: parseFloat(e.target.value) || undefined }
                  })}
                  className="input"
                  placeholder="0.00"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Why we ask: documented medical costs directly support case value.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Bills Paid ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.damages?.med_paid || ''}
                  onChange={(e) => updateFormData({ 
                    damages: { ...formData.damages, med_paid: parseFloat(e.target.value) || undefined }
                  })}
                  className="input"
                  placeholder="0.00"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Why we ask: insurers often compare charges vs. paid amounts.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lost Wages ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.damages?.wage_loss || ''}
                  onChange={(e) => updateFormData({ 
                    damages: { ...formData.damages, wage_loss: parseFloat(e.target.value) || undefined }
                  })}
                  className="input"
                  placeholder="0.00"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Why we ask: wage loss can materially increase damages.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Services ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.damages?.services || ''}
                  onChange={(e) => updateFormData({ 
                    damages: { ...formData.damages, services: parseFloat(e.target.value) || undefined }
                  })}
                  className="input"
                  placeholder="0.00"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Why we ask: out-of-pocket services (rides, care) add to damages.
                </p>
              </div>
            </div>

          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>Case readiness</span>
                <span>{intakeProgress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${intakeProgress.percent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {intakeProgress.percent >= 60
                  ? 'You are close to settlement review readiness.'
                  : 'A few more details can strengthen your case profile.'}
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Case Readiness Score</h3>
                <span className="text-sm text-gray-600">Your case is {intakeProgress.percent}% documented</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${intakeProgress.percent}%` }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">What’s strong</div>
                  {readinessDetails.strengths.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {readinessDetails.strengths.slice(0, 4).map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">Still getting started.</div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">What’s missing</div>
                  {readinessDetails.missing.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {readinessDetails.missing.slice(0, 4).map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">Nothing major missing.</div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">What would improve it most</div>
                  <div className="text-gray-600">
                    {readinessDetails.topImprove
                      ? `Add ${readinessDetails.topImprove.toLowerCase()}.`
                      : 'You’re in great shape—keep uploading new evidence as it arrives.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Information</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Claim Type:</span> {formData.claimType}
                </div>
                <div>
                  <span className="font-medium">State:</span> {formData.venue?.state}
                  {formData.venue?.county && <span>, {formData.venue.county}</span>}
                </div>
                <div>
                  <span className="font-medium">Incident Date:</span>{' '}
                  {formData.incident?.date || (formData.incident?.timeline?.length ? 'Timeline provided' : 'Not provided')}
                </div>
                {formData.incident?.location && (
                  <div>
                    <span className="font-medium">Location:</span> {formData.incident.location}
                  </div>
                )}
                <div>
                  <span className="font-medium">Description:</span> {formData.incident?.narrative}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600 space-y-3">
              <div className="font-medium text-gray-900">What Happens Next</div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">What attorneys look at</div>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  <li>Clear liability story and fault confidence</li>
                  <li>Injury impact with treatment timeline</li>
                  <li>Damages supported by bills, photos, and records</li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">What insurers challenge</div>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  <li>Gaps in treatment or missing providers</li>
                  <li>Unclear incident details or conflicting facts</li>
                  <li>Missing documentation of expenses or lost work</li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">What plaintiffs often regret not documenting early</div>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  <li>Photos of injuries and scene conditions</li>
                  <li>Daily pain/impact notes and missed work</li>
                  <li>Initial medical visits and referrals</li>
                </ul>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
              <div className="font-medium text-gray-900 mb-2">What happens next</div>
              <ul className="list-disc list-inside space-y-1">
                <li>We package your case for attorney review.</li>
                <li>You’ll be notified if more details improve value.</li>
                <li>Nothing is shared without your approval.</li>
              </ul>
            </div>

            {/* Evidence Files Summary */}
            {Object.keys(pendingEvidenceFiles).length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Evidence Files to Upload ({Object.values(pendingEvidenceFiles).reduce((total, files) => total + files.length, 0)} files)
                  </h3>
                  <button
                    onClick={() => setCurrentStep('incident')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Add More Files
                  </button>
                </div>
                <div className="space-y-4">
                  {Object.entries(pendingEvidenceFiles).map(([category, files]) => (
                    files.length > 0 && (
                      <div key={category} className="border border-blue-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">
                            {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ({files.length})
                          </h4>
                          <button
                            onClick={() => clearCategoryFiles(category)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {files.map((file, index) => (
                            <div key={file.id || index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                {file.mimetype?.startsWith('image/') ? (
                                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                ) : file.mimetype === 'application/pdf' ? (
                                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.originalName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {file.fileUrl && (
                                  <Tooltip content="View file">
                                    <button
                                      onClick={() => {
                                        if (file.mimetype?.startsWith('image/')) {
                                          setPreviewFile({ url: file.fileUrl, name: file.originalName })
                                        } else {
                                          window.open(file.fileUrl, '_blank')
                                        }
                                      }}
                                      className="text-blue-600 hover:text-blue-800 p-1"
                                      aria-label="View file"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                )}
                                <Tooltip content="Remove file">
                                  <button
                                    onClick={() => removeEvidenceFile(category, index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    aria-label="Remove file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3 bg-blue-100 p-2 rounded">
                  <strong>Note:</strong> These files will be uploaded and automatically processed (OCR, medical code extraction, etc.) after you submit your assessment.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Consent & Agreements</h3>
              
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.consents?.tos || false}
                    onChange={(e) => updateFormData({ 
                      consents: { ...formData.consents, tos: e.target.checked }
                    })}
                    disabled={!consentRead.tos}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className={`ml-2 text-sm ${errors.tos ? 'text-red-600' : 'text-gray-700'}`}>
                    I accept the{' '}
                    <a
                      href="/terms-of-service?return=/assess&step=review"
                      className="text-brand-600 hover:text-brand-800 underline"
                    >
                      Terms of Service
                    </a>{' '}
                    (Required)
                  </span>
                </label>
                {errors.tos && (
                  <p className="ml-6 text-sm text-red-600">{errors.tos}</p>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.consents?.privacy || false}
                    onChange={(e) => updateFormData({ 
                      consents: { ...formData.consents, privacy: e.target.checked }
                    })}
                    disabled={!consentRead.privacy}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className={`ml-2 text-sm ${errors.privacy ? 'text-red-600' : 'text-gray-700'}`}>
                    I accept the{' '}
                    <a
                      href="/privacy-policy?return=/assess&step=review"
                      className="text-brand-600 hover:text-brand-800 underline"
                    >
                      Privacy Policy
                    </a>{' '}
                    (Required)
                  </span>
                </label>
                {errors.privacy && (
                  <p className="ml-6 text-sm text-red-600">{errors.privacy}</p>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.consents?.ml_use || false}
                    onChange={(e) => updateFormData({ 
                      consents: { ...formData.consents, ml_use: e.target.checked }
                    })}
                    disabled={!consentRead.ml_use}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className={`ml-2 text-sm ${errors.ml_use ? 'text-red-600' : 'text-gray-700'}`}>
                    I consent to{' '}
                    <a
                      href="/ai-ml-consent?return=/assess&step=review"
                      className="text-brand-600 hover:text-brand-800 underline"
                    >
                      AI/ML processing of my data for case analysis
                    </a>{' '}
                    (Required)
                  </span>
                </label>
                {errors.ml_use && (
                  <p className="ml-6 text-sm text-red-600">{errors.ml_use}</p>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.consents?.hipaa || false}
                    onChange={(e) => updateFormData({ 
                      consents: { ...formData.consents, hipaa: e.target.checked }
                    })}
                    disabled={!consentRead.hipaa}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I consent to{' '}
                    <a
                      href="/hipaa-authorization?return=/assess&step=review"
                      className="text-brand-600 hover:text-brand-800 underline"
                    >
                      HIPAA disclosure for medical records
                    </a>{' '}
                    (optional)
                  </span>
                </label>
              </div>
            </div>

            {errors.submit && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Update Assessment' : 'Case Assessment'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEditMode 
            ? 'Update your case information with pre-filled data from your previous assessment.'
            : 'Let\'s gather information about your case to provide you with insights and recommendations.'
          }
        </p>
        <div className="mt-4">
          <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            <div>
              <div className="font-medium text-gray-900">Save and return anytime</div>
              <div>
                {draftRestored ? 'Draft restored.' : 'We save your progress so you can continue on any device.'}
                {draftSavedAt && (
                  <span className="text-gray-500"> Last saved {new Date(draftSavedAt).toLocaleTimeString()}.</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(draftStorageKey)
                  localStorage.removeItem(intakeStepStorageKey)
                  setFormData(blankFormData)
                  setDraftRestored(false)
                  setDraftSavedAt(null)
                  setAssessmentId(null)
                  setPendingEvidenceFiles({})
                  setErrors({})
                  setCurrentStep('basic')
                  setPreviewFile(null)
                }}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href)
                }}
                className="inline-flex items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  const body = encodeURIComponent(
                    `You're 2 minutes away from strengthening your case. Resume here: ${window.location.href}`
                  )
                  window.location.href = `sms:?&body=${body}`
                }}
                className="inline-flex items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                Text me a link
              </button>
              <button
                type="button"
                onClick={() => {
                  const subject = encodeURIComponent('Finish your case assessment')
                  const body = encodeURIComponent(
                    `You're 2 minutes away from strengthening your case. Resume here: ${window.location.href}`
                  )
                  window.location.href = `mailto:?subject=${subject}&body=${body}`
                }}
                className="inline-flex items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                Email me a reminder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStepIndex
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  index <= currentStepIndex ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="mx-4 h-5 w-5 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {steps[currentStepIndex].title}
          </h2>
          <p className="text-gray-600">{steps[currentStepIndex].description}</p>
        </div>

        {renderStepContent()}

        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isEditMode ? 'Updating...' : 'Submitting...') 
                : (isEditMode ? 'Update Assessment' : 'Submit Assessment')
              }
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="btn-primary"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">{previewFile.name}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto">
              <img 
                src={previewFile.url} 
                alt={previewFile.name}
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
