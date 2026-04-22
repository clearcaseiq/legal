/**
 * ClearCaseIQ Universal + Branching 12-Screen Intake Flow
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAssessment, predict, uploadEvidenceFile, processEvidenceFile, analyzeCaseWithChatGPT, calculateSOL } from '../lib/api-plaintiff'
import { ChevronRight, ChevronLeft, Car, Footprints, HardHat, Stethoscope, HelpCircle, Check, MapPin, Building2, Globe, Image, FileText, Shield, Dog, Package, AlertTriangle, Droplets } from 'lucide-react'
import InlineEvidenceUpload from '../components/InlineEvidenceUpload'
import { useLanguage } from '../contexts/LanguageContext'
import { CA_COUNTIES, injuryTypeToClaimType, sanitizeDetectedCounty } from '../lib/intakeQuickHelpers'

type Step =
  | 'injury_type'
  | 'when'
  | 'where'
  | 'narrative'
  | 'injury_severity'
  | 'medical_treatment'
  | 'branch_7'
  | 'branch_8'
  | 'branch_9'
  | 'branch_10'
  | 'evidence'
  | 'case_posture'
  | 'consent'

const INJURY_TYPES = [
  { value: 'vehicle', labelKey: 'injuryType_vehicle', icon: Car },
  { value: 'slip_fall', labelKey: 'injuryType_slip_fall', icon: Footprints },
  { value: 'workplace', labelKey: 'injuryType_workplace', icon: HardHat },
  { value: 'medmal', labelKey: 'injuryType_medmal', icon: Stethoscope },
  { value: 'dog_bite', labelKey: 'injuryType_dog_bite', icon: Dog },
  { value: 'product', labelKey: 'injuryType_product', icon: Package },
  { value: 'assault', labelKey: 'injuryType_assault', icon: AlertTriangle },
  { value: 'toxic', labelKey: 'injuryType_toxic', icon: Droplets },
  { value: 'other', labelKey: 'injuryType_other', icon: HelpCircle }
]

const WHEN_OPTIONS = [
  { value: 'today', labelKey: 'today', getDate: () => new Date().toISOString().split('T')[0] },
  { value: 'last_week', labelKey: 'lastWeek', getDate: () => { const d = new Date(); d.setDate(d.getDate() - 5); return d.toISOString().split('T')[0] } },
  { value: 'last_month', labelKey: 'lastMonth', getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] } },
  { value: 'last_6_months', labelKey: 'last6Months', getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0] } },
  { value: 'more_6_months', labelKey: 'more6Months', getDate: () => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0] } },
  { value: 'custom', labelKey: 'customDate', getDate: () => '' }
]

const INJURY_SEVERITY_OPTIONS = [
  { value: 'minor', labelKey: 'minor' as const },
  { value: 'moderate', labelKey: 'moderate' as const },
  { value: 'serious', labelKey: 'serious' as const },
  { value: 'surgery', labelKey: 'surgery' as const },
  { value: 'unsure', labelKey: 'unsure' as const }
]

const MEDICAL_TREATMENT_OPTIONS = [
  { value: 'er', labelKey: 'er' },
  { value: 'doctor', labelKey: 'doctor' },
  { value: 'chiro_pt', labelKey: 'chiroPt' },
  { value: 'specialist', labelKey: 'specialist' },
  { value: 'scheduled', labelKey: 'scheduled' },
  { value: 'none', labelKey: 'none' }
]

// Vehicle branch
const VEHICLE_CRASH_OPTIONS = [
  { value: 'rear_end', labelKey: 'vehicle_rear_end' },
  { value: 'side_impact', labelKey: 'vehicle_side_impact' },
  { value: 'head_on', labelKey: 'vehicle_head_on' },
  { value: 'left_turn', labelKey: 'vehicle_left_turn' },
  { value: 'multi_vehicle', labelKey: 'vehicle_multi_vehicle' },
  { value: 'pedestrian', labelKey: 'vehicle_pedestrian' },
  { value: 'bicycle', labelKey: 'vehicle_bicycle' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const VEHICLE_DEFENDANT_OPTIONS = [
  { value: 'private', labelKey: 'vehicle_defendant_private' },
  { value: 'uber_lyft', labelKey: 'vehicle_defendant_uber_lyft' },
  { value: 'delivery', labelKey: 'vehicle_defendant_delivery' },
  { value: 'trucking', labelKey: 'vehicle_defendant_trucking' },
  { value: 'company', labelKey: 'vehicle_defendant_company' },
  { value: 'government', labelKey: 'vehicle_defendant_government' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const PROPERTY_DAMAGE_OPTIONS = [
  { value: 'minor', labelKey: 'vehicle_damage_minor' },
  { value: 'moderate', labelKey: 'vehicle_damage_moderate' },
  { value: 'not_drivable', labelKey: 'vehicle_damage_not_drivable' },
  { value: 'total_loss', labelKey: 'vehicle_damage_total_loss' }
]

// Slip & fall branch
const SLIP_HAZARD_OPTIONS = [
  { value: 'wet_floor', labelKey: 'slip_wet_floor' },
  { value: 'uneven', labelKey: 'slip_uneven' },
  { value: 'broken_stairs', labelKey: 'slip_broken_stairs' },
  { value: 'poor_lighting', labelKey: 'slip_poor_lighting' },
  { value: 'debris', labelKey: 'slip_debris' },
  { value: 'ice_snow', labelKey: 'slip_ice_snow' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const SLIP_PROPERTY_OPTIONS = [
  { value: 'grocery', labelKey: 'slip_grocery' },
  { value: 'restaurant', labelKey: 'slip_restaurant' },
  { value: 'apartment', labelKey: 'slip_apartment' },
  { value: 'workplace', labelKey: 'slip_workplace' },
  { value: 'sidewalk', labelKey: 'slip_sidewalk' },
  { value: 'hotel', labelKey: 'slip_hotel' },
  { value: 'residence', labelKey: 'slip_residence' }
]

// Med mal branch
const MEDMAL_ERROR_OPTIONS = [
  { value: 'surgical', labelKey: 'medmal_surgical' },
  { value: 'misdiagnosis', labelKey: 'medmal_misdiagnosis' },
  { value: 'delayed_diagnosis', labelKey: 'medmal_delayed_diagnosis' },
  { value: 'medication', labelKey: 'medmal_medication' },
  { value: 'birth_injury', labelKey: 'medmal_birth_injury' },
  { value: 'treatment', labelKey: 'medmal_treatment' }
]

const MEDMAL_PROVIDER_OPTIONS = [
  { value: 'hospital', labelKey: 'medmal_hospital' },
  { value: 'clinic', labelKey: 'medmal_clinic' },
  { value: 'urgent', labelKey: 'medmal_urgent' },
  { value: 'nursing_home', labelKey: 'medmal_nursing_home' },
  { value: 'private', labelKey: 'medmal_private' }
]

// Dog bite branch
const DOG_OWNERSHIP_OPTIONS = [
  { value: 'yes', labelKey: 'dog_yes' },
  { value: 'no_stray', labelKey: 'dog_no_stray' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const DOG_LOCATION_OPTIONS = [
  { value: 'public', labelKey: 'dog_public' },
  { value: 'private_home', labelKey: 'dog_private_home' },
  { value: 'apartment', labelKey: 'dog_apartment' },
  { value: 'workplace', labelKey: 'slip_workplace' }
]

const PRIOR_AGGRESSION_OPTIONS = [
  { value: 'yes', labelKey: 'dog_yes' },
  { value: 'no', labelKey: 'dog_no' },
  { value: 'not_sure', labelKey: 'vehicle_not_sure' }
]

const DOG_MEDICAL_OPTIONS = [
  { value: 'stitches', labelKey: 'dog_stitches' },
  { value: 'er', labelKey: 'dog_er' },
  { value: 'surgery', labelKey: 'dog_surgery' },
  { value: 'infection', labelKey: 'dog_infection' }
]

// Product branch
const PRODUCT_TYPE_OPTIONS = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'household', label: 'Household product' },
  { value: 'medical_device', label: 'Medical device' },
  { value: 'medication', label: 'Medication' },
  { value: 'machinery', label: 'Machinery' }
]

// Assault branch
const ASSAULT_TYPE_OPTIONS = [
  { value: 'assault', labelKey: 'assault_assault' },
  { value: 'robbery', labelKey: 'assault_robbery' },
  { value: 'bar_fight', labelKey: 'assault_bar_fight' },
  { value: 'nightclub', labelKey: 'assault_nightclub' },
  { value: 'apartment', labelKey: 'assault_apartment' }
]

// Toxic branch
const TOXIC_SUBSTANCE_OPTIONS = [
  { value: 'chemical', labelKey: 'toxic_chemical' },
  { value: 'mold', labelKey: 'toxic_mold' },
  { value: 'asbestos', labelKey: 'toxic_asbestos' },
  { value: 'water', labelKey: 'toxic_water' },
  { value: 'gas', labelKey: 'toxic_gas' }
]

const EXPOSURE_DURATION_OPTIONS = [
  { value: 'single', labelKey: 'toxic_single' },
  { value: 'days', labelKey: 'toxic_days' },
  { value: 'weeks', labelKey: 'toxic_weeks' },
  { value: 'months', labelKey: 'toxic_months' }
]

const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']

const STEPS: { key: Step; title: string }[] = [
  { key: 'injury_type', title: 'Injury Type' },
  { key: 'when', title: 'When Did It Happen?' },
  { key: 'where', title: 'Where Did It Happen?' },
  { key: 'narrative', title: 'What Happened?' },
  { key: 'injury_severity', title: 'Injury Severity' },
  { key: 'medical_treatment', title: 'Medical Treatment' },
  { key: 'branch_7', title: 'Case Details' },
  { key: 'branch_8', title: 'Case Details' },
  { key: 'branch_9', title: 'Case Details' },
  { key: 'branch_10', title: 'Case Details' },
  { key: 'evidence', title: 'Evidence Upload' },
  { key: 'case_posture', title: 'Case Posture' },
  { key: 'consent', title: 'Your Case Report Is Ready' }
]

export default function IntakeWizardQuick() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<Step>('injury_type')
  const [loading, setLoading] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<Record<string, any[]>>({})
  const [customDate, setCustomDate] = useState('')
  const [detectedLocation, setDetectedLocation] = useState<{ city: string; county: string; state: string } | null>(null)
  const [locationAccepted, setLocationAccepted] = useState(false)
  const [solPreview, setSolPreview] = useState<any>(null)
  const [solPreviewError, setSolPreviewError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    injuryType: '' as string,
    claimType: '' as string,
    incidentDate: '',
    incidentDatePreset: '' as string,
    venue: { state: '', county: '', city: '' },
    narrative: '' as string,
    injurySeverity: '' as string,
    medicalTreatment: [] as string[],
    branch: {} as Record<string, any>,
    casePosture: {} as Record<string, boolean>,
    insuranceCoverage: {
      healthCoverage: '' as '' | 'yes' | 'no' | 'unsure',
      coverageTypes: [] as string[],
      medicarePlanType: '' as '' | 'original' | 'advantage' | 'unsure'
    },
    consents: { tos: false, privacy: false, ml_use: false, hipaa: false }
  })

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep)
  const progressPercent = Math.round(((currentStepIndex + 1) / STEPS.length) * 100)

  useEffect(() => {
    let cancelled = false
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const city = data.city || ''
        const county = sanitizeDetectedCounty(data.region_code || '', data.county || '')
        const state = data.region_code || ''
        if (city || county || state) setDetectedLocation({ city, county, state })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const incidentDate =
      formData.incidentDatePreset === 'custom'
        ? customDate
        : WHEN_OPTIONS.find((option) => option.value === formData.incidentDatePreset)?.getDate() || formData.incidentDate
    const claimType = formData.claimType || injuryTypeToClaimType(formData.injuryType)
    if (!incidentDate || !formData.venue.state || !claimType) {
      setSolPreview(null)
      setSolPreviewError(null)
      return
    }

    let cancelled = false
    calculateSOL(incidentDate, { state: formData.venue.state, county: formData.venue.county || undefined }, claimType)
      .then((data) => {
        if (cancelled) return
        setSolPreview(data)
        setSolPreviewError(null)
      })
      .catch((error: any) => {
        if (cancelled) return
        setSolPreview(null)
        setSolPreviewError(error?.response?.data?.error || 'Unable to calculate deadline yet.')
      })

    return () => {
      cancelled = true
    }
  }, [customDate, formData.claimType, formData.incidentDate, formData.incidentDatePreset, formData.injuryType, formData.venue.county, formData.venue.state])

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }

  const setBranch = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      branch: { ...prev.branch, [key]: value }
    }))
    setErrors({})
  }

  const getIncidentDate = (): string => {
    if (formData.incidentDatePreset === 'custom') return customDate
    const opt = WHEN_OPTIONS.find(o => o.value === formData.incidentDatePreset)
    return opt ? opt.getDate() : formData.incidentDate
  }

  const buildNarrative = (): string => {
    const parts: string[] = []
    const it = INJURY_TYPES.find(a => a.value === formData.injuryType)
    parts.push(it ? t(`intake.${it.labelKey}`) : formData.injuryType)
    parts.push(`Incident date: ${getIncidentDate()}`)
    parts.push(`Location: ${[formData.venue.city, formData.venue.county, formData.venue.state].filter(Boolean).join(', ')}`)
    if (formData.narrative) parts.push(formData.narrative)
    const sevKey = INJURY_SEVERITY_OPTIONS.find(o => o.value === formData.injurySeverity)?.labelKey
    parts.push(sevKey ? t(`intake.${sevKey}`) : formData.injurySeverity)
    if (formData.medicalTreatment.length) {
      const tx = formData.medicalTreatment.map(v => {
        const opt = MEDICAL_TREATMENT_OPTIONS.find(o => o.value === v)
        return opt ? t(`intake.${opt.labelKey}`) : v
      }).join(', ')
      parts.push(tx)
    }
    Object.entries(formData.branch).forEach(([k, v]) => {
      if (v != null && v !== '' && v !== false) parts.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    })
    return parts.join('. ')
  }

  const handleEvidenceFiles = (category: string, files: any[]) => {
    setPendingEvidenceFiles(prev => ({ ...prev, [category]: files }))
  }

  const uploadPendingEvidence = async (id: string) => {
    for (const [category, files] of Object.entries(pendingEvidenceFiles)) {
      const arr = Array.isArray(files) ? files : []
      for (const file of arr) {
        if (file?.rawFile && String(file.id || '').startsWith('temp_')) {
          try {
            const fd = new FormData()
            fd.append('file', file.rawFile)
            fd.append('assessmentId', id)
            fd.append('category', category)
            fd.append('subcategory', file.subcategory || '')
            fd.append('description', file.description || '')
            fd.append('uploadMethod', 'manual')
            const uploaded = await uploadEvidenceFile(fd)
            if (uploaded?.id) await processEvidenceFile(uploaded.id).catch(() => {})
          } catch (e) {
            console.error('Evidence upload failed', e)
          }
        }
      }
    }
  }

  const validateAndNext = () => {
    const err: Record<string, string> = {}
    if (currentStep === 'injury_type' && !formData.injuryType) err.injuryType = 'Select an injury type'
    if (currentStep === 'when') {
      if (formData.incidentDatePreset === 'custom' && !customDate) err.incidentDate = 'Enter a date'
      else if (formData.incidentDatePreset === 'custom' && customDate) updateForm({ incidentDate: customDate })
      else if (formData.incidentDatePreset !== 'custom') {
        const d = WHEN_OPTIONS.find(o => o.value === formData.incidentDatePreset)
        updateForm({ incidentDate: d?.getDate() || '' })
      }
    }
    if (currentStep === 'where') {
      if (!formData.venue.state) err.state = t('intake.selectStateError')
      if (!formData.venue.county?.trim()) err.county = t('intake.enterCounty')
    }
    if (currentStep === 'narrative') {
      // Narrative is optional but recommended
    }
    if (currentStep === 'injury_severity' && !formData.injurySeverity) err.injurySeverity = t('intake.selectSeverity')
    if (currentStep === 'medical_treatment') {
      // Can proceed with 0 or more selected
    }
    if (currentStep === 'case_posture') {
      if (!formData.insuranceCoverage?.healthCoverage) {
        err.healthCoverage = t('intake.insurance_coverageRequired')
      }
      if (formData.insuranceCoverage?.healthCoverage === 'yes' && formData.insuranceCoverage.coverageTypes.length === 0) {
        err.coverageTypes = t('intake.insurance_typesRequired')
      }
      if (
        formData.insuranceCoverage?.healthCoverage === 'yes' &&
        formData.insuranceCoverage.coverageTypes.includes('medicare') &&
        !formData.insuranceCoverage.medicarePlanType
      ) {
        err.medicarePlan = t('intake.insurance_medicarePlanRequired')
      }
    }
    if (currentStep === 'consent') {
      const c = formData.consents || {}
      if (!c.tos) err.tos = t('intake.acceptTos')
      if (!c.privacy) err.privacy = t('intake.acceptPrivacy')
      if (!c.ml_use) err.ml_use = t('intake.consentAi')
    }
    setErrors(err)
    if (Object.keys(err).length > 0) return
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].key)
    }
  }

  const handleSubmit = async () => {
    const consents = formData.consents || { tos: false, privacy: false, ml_use: false, hipaa: false }
    const err: Record<string, string> = {}
    if (!formData.venue.state) err.state = t('intake.selectStateError')
    if (!formData.venue.county?.trim()) err.county = t('intake.enterCounty')
    if (!consents.tos) err.tos = t('intake.acceptTos')
    if (!consents.privacy) err.privacy = t('intake.acceptPrivacy')
    if (!consents.ml_use) err.ml_use = t('intake.consentAi')
    setErrors(err)
    if (Object.keys(err).length > 0) return
    setLoading(true)
    try {
      const claimType = injuryTypeToClaimType(formData.injuryType)
      const payload = {
        claimType: claimType as any,
        venue: { state: formData.venue.state, county: formData.venue.county.trim() },
        incident: {
          date: getIncidentDate(),
          location: [formData.venue.city, formData.venue.county, formData.venue.state].filter(Boolean).join(', '),
          narrative: buildNarrative()
        },
        injuries: [{ description: formData.injurySeverity }],
        treatment: formData.medicalTreatment.map(t => ({ type: t, notes: '' })),
        liability: formData.branch,
        damages: {},
        insurance: {
          health_coverage: formData.insuranceCoverage.healthCoverage,
          coverage_types:
            formData.insuranceCoverage.healthCoverage === 'yes'
              ? [...formData.insuranceCoverage.coverageTypes]
              : [],
          medicare_plan_type:
            formData.insuranceCoverage.healthCoverage === 'yes' &&
            formData.insuranceCoverage.coverageTypes.includes('medicare')
              ? formData.insuranceCoverage.medicarePlanType || 'unsure'
              : undefined
        },
        consents: {
          tos: consents.tos,
          privacy: consents.privacy,
          ml_use: consents.ml_use,
          hipaa: consents.hipaa
        }
      }
      ;(payload as any).intakeData = {
        injuryType: formData.injuryType,
        narrative: formData.narrative,
        branch: formData.branch,
        casePosture: formData.casePosture,
        insuranceCoverage: formData.insuranceCoverage
      }

      const id = await createAssessment(payload)
      setAssessmentId(id)
      try {
        localStorage.setItem('pending_assessment_id', id)
      } catch {
        /* ignore quota / private mode */
      }
      navigate(`/results/${id}`, { replace: true })
      try {
        await uploadPendingEvidence(id)
      } catch (e) {
        console.error('Evidence upload after intake failed', e)
      }
      try {
        await predict(id)
      } catch (e) {
        console.error('Prediction after intake failed', e)
      }
      analyzeCaseWithChatGPT(id).catch(() => {})
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Failed to submit. Please try again.'
      setErrors({ submit: msg })
    } finally {
      setLoading(false)
    }
  }

  const toggleMedicalTreatment = (v: string) => {
    setFormData(prev => ({
      ...prev,
      medicalTreatment: prev.medicalTreatment.includes(v) ? prev.medicalTreatment.filter(t => t !== v) : [...prev.medicalTreatment, v]
    }))
  }

  const toggleCoverageType = (v: string) => {
    setFormData(prev => {
      const ic = prev.insuranceCoverage
      const nextTypes = ic.coverageTypes.includes(v)
        ? ic.coverageTypes.filter(x => x !== v)
        : [...ic.coverageTypes, v]
      const medicarePlanType =
        v === 'medicare' && ic.coverageTypes.includes('medicare') && !nextTypes.includes('medicare')
          ? ''
          : ic.medicarePlanType
      return {
        ...prev,
        insuranceCoverage: { ...ic, coverageTypes: nextTypes, medicarePlanType }
      }
    })
    setErrors({})
  }

  const it = formData.injuryType
  const isVehicle = it === 'vehicle'
  const isSlipFall = it === 'slip_fall' || it === 'workplace'
  const isMedmal = it === 'medmal'
  const isDogBite = it === 'dog_bite'
  const isProduct = it === 'product'
  const isAssault = it === 'assault'
  const isToxic = it === 'toxic'
  const isOther = it === 'other'

  const renderStep = () => {
    switch (currentStep) {
      case 'injury_type':
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">{t('intake.injuryType')}</p>
            <p className="text-gray-500 text-center text-sm">{t('intake.injuryTypeHelp')}</p>
            <div className="grid grid-cols-2 gap-2">
              {INJURY_TYPES.map(({ value, labelKey, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    updateForm({ injuryType: value, claimType: injuryTypeToClaimType(value) })
                    setCurrentStep('when')
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    formData.injuryType === value ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <Icon className="h-7 w-7 text-brand-600" />
                  <span className="font-medium text-sm text-center">{t(`intake.${labelKey}`)}</span>
                </button>
              ))}
            </div>
            {errors.injuryType && <p className="text-sm text-red-600 text-center">{errors.injuryType}</p>}
          </div>
        )

      case 'when':
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">When did the incident happen?</p>
            <p className="text-gray-500 text-center text-sm">This helps us check statute of limitations and timeline.</p>
            <div className="grid grid-cols-2 gap-2">
              {WHEN_OPTIONS.map(({ value, labelKey, getDate }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (value === 'custom') updateForm({ incidentDatePreset: value })
                    else { updateForm({ incidentDatePreset: value, incidentDate: getDate() }); setCurrentStep('where') }
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                    formData.incidentDatePreset === value ? 'border-brand-700 bg-brand-100 ring-2 ring-brand-200' : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {t(`intake.${labelKey}`)}
                  {formData.incidentDatePreset === value && <Check className="h-5 w-5 text-brand-600" />}
                </button>
              ))}
            </div>
            {formData.incidentDatePreset === 'custom' && (
              <div className="pt-2">
                <input type="date" value={customDate} onChange={e => { const val = e.target.value; setCustomDate(val); if (val) updateForm({ incidentDate: val }) }} className="input w-full" autoFocus />
              </div>
            )}
            {errors.incidentDate && <p className="text-sm text-red-600 text-center">{errors.incidentDate}</p>}
          </div>
        )

      case 'where':
        const detectedDisplay = detectedLocation ? [detectedLocation.city, detectedLocation.county, detectedLocation.state].filter(Boolean).join(', ') : ''
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">{t('intake.where')}</p>
            <p className="text-gray-500 text-center text-sm">{t('intake.whereHelp')}</p>
            {detectedLocation && !locationAccepted && !formData.venue.state && (
              <div className="p-4 bg-brand-50 rounded-xl border border-brand-200">
                <p className="text-sm font-medium text-slate-900 mb-2">{t('intake.weDetectedLocation')} {detectedDisplay}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const county = sanitizeDetectedCounty(detectedLocation.state, detectedLocation.county)
                      updateForm({ venue: { state: detectedLocation.state, county, city: detectedLocation.city } })
                      setLocationAccepted(true)
                      setDetectedLocation(null)
                      if (county) {
                        setCurrentStep('narrative')
                      } else {
                        setErrors((current) => ({ ...current, county: t('intake.enterCounty') }))
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
                  >
                    {t('intake.useLocation')}
                  </button>
                  <button type="button" onClick={() => setDetectedLocation(null)} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">{t('intake.change')}</button>
                </div>
              </div>
            )}
            {(!detectedLocation || locationAccepted || formData.venue.state) && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Globe className="h-4 w-4 text-brand-600" /> {t('intake.state')}</label>
                  <select value={formData.venue.state} onChange={e => updateForm({ venue: { ...formData.venue, state: e.target.value, county: formData.venue.state !== e.target.value ? '' : formData.venue.county } })} className={`input w-full ${errors.state ? 'border-red-500' : ''}`}>
                    <option value="">{t('intake.selectState')}</option>
                    {US_STATES.map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Building2 className="h-4 w-4 text-brand-600" /> {t('intake.county')}</label>
                  {formData.venue.state === 'CA' ? (
                    <select value={formData.venue.county} onChange={e => updateForm({ venue: { ...formData.venue, county: e.target.value } })} className={`input w-full ${errors.county ? 'border-red-500' : ''}`}>
                      <option value="">{t('intake.searchCounty')}</option>
                      {CA_COUNTIES.map(c => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  ) : (
                    <input type="text" value={formData.venue.county} onChange={e => updateForm({ venue: { ...formData.venue, county: e.target.value } })} className={`input w-full ${errors.county ? 'border-red-500' : ''}`} placeholder="e.g., Los Angeles" />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><MapPin className="h-4 w-4 text-brand-600" /> {t('intake.city')}</label>
                  <input type="text" value={formData.venue.city} onChange={e => updateForm({ venue: { ...formData.venue, city: e.target.value } })} className="input w-full" placeholder="e.g., Glendale" />
                </div>
              </div>
            )}
            {(errors.state || errors.county) && <p className="text-sm text-red-600 text-center">{errors.state || errors.county}</p>}
          </div>
        )

      case 'narrative':
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">Briefly describe what happened.</p>
            <p className="text-gray-500 text-center text-sm">This helps us understand your case and assess liability.</p>
            <textarea
              value={formData.narrative}
              onChange={e => updateForm({ narrative: e.target.value })}
              placeholder="Describe the incident in your own words..."
              rows={4}
              className="input w-full resize-none"
            />
            <p className="text-xs text-gray-500">
              Optional: You can upload photos or documents later to strengthen your case.
            </p>
          </div>
        )

      case 'injury_severity':
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">{t('intake.injurySeverity')}</p>
            <div className="grid grid-cols-1 gap-2">
              {INJURY_SEVERITY_OPTIONS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { updateForm({ injurySeverity: value }); setCurrentStep('medical_treatment') }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                    formData.injurySeverity === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {t(`intake.${labelKey}`)}
                  {formData.injurySeverity === value && <Check className="h-5 w-5 text-brand-600" />}
                </button>
              ))}
            </div>
            {errors.injurySeverity && <p className="text-sm text-red-600 text-center">{errors.injurySeverity}</p>}
          </div>
        )

      case 'medical_treatment':
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">{t('intake.medicalTreatment')}</p>
            <p className="text-gray-500 text-center text-sm">{t('intake.selectAllApply')}</p>
            <div className="grid grid-cols-2 gap-2">
              {MEDICAL_TREATMENT_OPTIONS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleMedicalTreatment(value)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                    formData.medicalTreatment.includes(value) ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {t(`intake.${labelKey}`)}
                  {formData.medicalTreatment.includes(value) && <Check className="h-5 w-5 text-brand-600" />}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500">{t('intake.selectAllApply')}</p>
          </div>
        )

      case 'branch_7':
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.vehicle_crashQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_CRASH_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('crashType', value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.crashType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.crashType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.slip_hazardQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SLIP_HAZARD_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('hazardType', value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.hazardType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.hazardType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.medmal_errorQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDMAL_ERROR_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('errorType', value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.errorType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.errorType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.dog_ownershipQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {DOG_OWNERSHIP_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('dogOwned', value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.dogOwned === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.dogOwned === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.product_typeQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_TYPE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => { setBranch('productType', option.value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.productType === option.value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {'labelKey' in option ? t(`intake.${option.labelKey}`) : option.label} {formData.branch.productType === option.value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.assault_typeQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {ASSAULT_TYPE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('assaultType', value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.assaultType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.assaultType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.toxic_substanceQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {TOXIC_SUBSTANCE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('substance', value); setCurrentStep('branch_8') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.substance === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.substance === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.tellMore')}</p>
              <textarea value={formData.branch.otherDetails || ''} onChange={e => setBranch('otherDetails', e.target.value)} placeholder={t('intake.otherDetailsPlaceholder')} rows={3} className="input w-full resize-none" />
              <p className="text-sm text-gray-500 text-center">{t('intake.clickNext')}</p>
            </div>
          )
        }
        return null

      case 'branch_8':
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.vehicle_liabilityEvidence')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.policeReport} onChange={e => setBranch('policeReport', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_policeReport')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.ticketIssued} onChange={e => setBranch('ticketIssued', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_ticket')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.witnesses} onChange={e => setBranch('witnesses', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_witnesses')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.photosVideo} onChange={e => setBranch('photosVideo', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.vehicle_photosVideo')}</span></label>
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.slip_propertyQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SLIP_PROPERTY_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('propertyType', value); setCurrentStep('branch_9') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.propertyType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.propertyType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.medmal_providerQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDMAL_PROVIDER_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('providerType', value); setCurrentStep('branch_9') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.providerType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.providerType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.dog_locationQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {DOG_LOCATION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('biteLocation', value); setCurrentStep('branch_9') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.biteLocation === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.biteLocation === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.product_failureQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.productMalfunction} onChange={e => setBranch('productMalfunction', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_malfunction')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.productRecalled} onChange={e => setBranch('productRecalled', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_recalled')}</span></label>
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.assault_securityQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.securityPresent} onChange={e => setBranch('securityPresent', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_securityPresent')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.poorLighting} onChange={e => setBranch('poorLighting', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_poorLighting')}</span></label>
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.toxic_durationQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPOSURE_DURATION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('exposureDuration', value); setCurrentStep('branch_9') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.exposureDuration === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.exposureDuration === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">{t('intake.almostDoneEvidence')}</p>
            </div>
          )
        }
        return null

      case 'branch_9':
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.vehicle_propertyDamage')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_DAMAGE_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('propertyDamage', value); setCurrentStep('branch_10') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.propertyDamage === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.propertyDamage === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.slip_hazardAwareness')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.employeesKnew} onChange={e => setBranch('employeesKnew', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_employeesKnew')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.warningSigns} onChange={e => setBranch('warningSigns', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_warningSigns')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hazardDuration} onChange={e => setBranch('hazardDuration', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_hazardDuration')}</span></label>
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.medmal_harmSeverity')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.additionalTreatment} onChange={e => setBranch('additionalTreatment', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_additionalTreatment')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.permanentInjury} onChange={e => setBranch('permanentInjury', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_permanentInjury')}</span></label>
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.dog_priorAggressionQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PRIOR_AGGRESSION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('priorAggression', value); setCurrentStep('branch_10') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.priorAggression === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.priorAggression === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.product_injuryCauseQuestion')}</p>
              <textarea value={formData.branch.injuryCause || ''} onChange={e => setBranch('injuryCause', e.target.value)} placeholder={t('intake.product_injuryPlaceholder')} rows={3} className="input w-full resize-none" />
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.assault_policeQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.policeCalled} onChange={e => setBranch('policeCalled', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_policeCalled')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.arrested} onChange={e => setBranch('arrested', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.assault_arrested')}</span></label>
              </div>
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.toxic_symptomsQuestion')}</p>
              <textarea value={formData.branch.symptoms || ''} onChange={e => setBranch('symptoms', e.target.value)} placeholder={t('intake.toxic_symptomsPlaceholder')} rows={3} className="input w-full resize-none" />
            </div>
          )
        }
        if (isOther) {
          return (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">{t('intake.almostDoneContinue')}</p>
            </div>
          )
        }
        return null

      case 'branch_10':
        if (isVehicle) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.vehicle_defendantQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_DEFENDANT_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('defendantType', value); setCurrentStep('evidence') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.defendantType === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.defendantType === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isSlipFall) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.slip_injuryImpact')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hitHead} onChange={e => setBranch('hitHead', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_hitHead')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.ambulance} onChange={e => setBranch('ambulance', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.slip_ambulance')}</span></label>
              </div>
            </div>
          )
        }
        if (isMedmal) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.medmal_evidence')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasMedicalRecords} onChange={e => setBranch('hasMedicalRecords', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_hasRecords')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.knowDoctorHospital} onChange={e => setBranch('knowDoctorHospital', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.medmal_knowProvider')}</span></label>
              </div>
            </div>
          )
        }
        if (isDogBite) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.dog_medicalQuestion')}</p>
              <div className="space-y-2">
                {DOG_MEDICAL_OPTIONS.map(({ value, labelKey }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.branch.dogMedical?.includes(value)} onChange={e => { const arr = formData.branch.dogMedical || []; const next = e.target.checked ? [...arr, value] : arr.filter((x: string) => x !== value); setBranch('dogMedical', next) }} className="rounded border-gray-300" />
                    <span className="text-sm">{t(`intake.${labelKey}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        }
        if (isProduct) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.product_evidenceQuestion')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasProduct} onChange={e => setBranch('hasProduct', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_hasProduct')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasPackaging} onChange={e => setBranch('hasPackaging', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_hasPackaging')}</span></label>
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={!!formData.branch.hasReceipt} onChange={e => setBranch('hasReceipt', e.target.checked)} className="rounded border-gray-300" /><span className="text-sm">{t('intake.product_hasReceipt')}</span></label>
              </div>
            </div>
          )
        }
        if (isAssault) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.assault_propertyOwnerQuestion')}</p>
              <input type="text" value={formData.branch.propertyOwner || ''} onChange={e => setBranch('propertyOwner', e.target.value)} placeholder={t('intake.assault_propertyPlaceholder')} className="input w-full" />
            </div>
          )
        }
        if (isToxic) {
          return (
            <div className="space-y-4">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.toxic_doctorQuestion')}</p>
              <div className="grid grid-cols-2 gap-2">
                {PRIOR_AGGRESSION_OPTIONS.map(({ value, labelKey }) => (
                  <button key={value} type="button" onClick={() => { setBranch('doctorLinked', value); setCurrentStep('evidence') }} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${formData.branch.doctorLinked === value ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'}`}>
                    {t(`intake.${labelKey}`)} {formData.branch.doctorLinked === value && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>
          )
        }
        if (isOther) return null
        return null

      case 'evidence':
        return (
          <div className="space-y-4">
            <p className="text-gray-900 font-medium text-center text-lg">{t('intake.evidenceUpload')}</p>
            <p className="text-gray-500 text-center text-sm">{t('intake.evidenceHelp')}</p>
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1"><Image className="h-5 w-5 text-brand-600" /><h4 className="font-medium text-gray-900">{t('intake.photos')}</h4></div>
                <InlineEvidenceUpload assessmentId={assessmentId || undefined} category="photos" subcategory="injury_photos" description="Injury or incident photos" compact alwaysShowUpload hideHeader uploadButtonLabel={t('intake.uploadPhotos')} onFilesUploaded={f => handleEvidenceFiles('photos', f)} />
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1"><FileText className="h-5 w-5 text-brand-600" /><h4 className="font-medium text-gray-900">{t('intake.medicalBills')}</h4></div>
                <InlineEvidenceUpload assessmentId={assessmentId || undefined} category="bills" subcategory="medical_bill" description="Medical bills" compact alwaysShowUpload uploadButtonLabel={t('intake.uploadBills')} onFilesUploaded={f => handleEvidenceFiles('bills', f)} />
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1"><FileText className="h-5 w-5 text-brand-600" /><h4 className="font-medium text-gray-900">{t('intake.medicalRecords')}</h4></div>
                <InlineEvidenceUpload assessmentId={assessmentId || undefined} category="medical_records" subcategory="records" description="Medical records" compact alwaysShowUpload hideHeader uploadButtonLabel={t('intake.uploadRecords')} onFilesUploaded={f => handleEvidenceFiles('medical_records', f)} />
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1"><Shield className="h-5 w-5 text-brand-600" /><h4 className="font-medium text-gray-900">{t('intake.policeReport')}</h4></div>
                <InlineEvidenceUpload assessmentId={assessmentId || undefined} category="police_report" subcategory="report" description="Police report" compact alwaysShowUpload hideHeader uploadButtonLabel={t('intake.uploadReport')} onFilesUploaded={f => handleEvidenceFiles('police_report', f)} />
              </div>
            </div>
            <button type="button" onClick={() => setCurrentStep('case_posture')} className="w-full py-3 text-sm font-medium text-gray-600 hover:text-brand-600 border border-dashed border-gray-300 rounded-xl hover:border-brand-300 transition-colors">
              {t('intake.skipForNow')}
            </button>
          </div>
        )

      case 'case_posture':
        const cp = formData.casePosture || {}
        const ic = formData.insuranceCoverage
        const COVERAGE_TYPE_OPTS = [
          { value: 'private', labelKey: 'insurance_type_private' as const },
          { value: 'medicare', labelKey: 'insurance_type_medicare' as const },
          { value: 'medicaid', labelKey: 'insurance_type_medicaid' as const },
          { value: 'workers_comp', labelKey: 'insurance_type_workers_comp' as const },
          { value: 'other', labelKey: 'insurance_type_other' as const },
          { value: 'unsure_coverage', labelKey: 'insurance_type_unsure' as const }
        ]
        return (
          <div className="space-y-6">
            <div>
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.case_posture_insurance_heading')}</p>
              <p className="text-gray-500 text-center text-sm mt-1">{t('intake.case_posture_insurance_help')}</p>
              <p className="text-gray-700 text-sm mt-3 font-medium">{t('intake.insurance_healthCoverageQuestion')}</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      updateForm({
                        insuranceCoverage: {
                          ...ic,
                          healthCoverage: v,
                          ...(v !== 'yes' ? { coverageTypes: [], medicarePlanType: '' } : {})
                        }
                      })
                    }
                    className={`p-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      ic.healthCoverage === v ? 'border-brand-700 bg-brand-100' : 'border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    {t(`intake.insurance_health_${v}`)}
                  </button>
                ))}
              </div>
              {errors.healthCoverage && <p className="text-sm text-red-600 mt-1">{errors.healthCoverage}</p>}
            </div>

            {ic.healthCoverage === 'yes' && (
              <div className="space-y-2">
                <p className="text-gray-700 text-sm font-medium">{t('intake.insurance_coverageTypesPrompt')}</p>
                <div className="space-y-2">
                  {COVERAGE_TYPE_OPTS.map(({ value, labelKey }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={ic.coverageTypes.includes(value)}
                        onChange={() => toggleCoverageType(value)}
                      />
                      <span className="text-sm">{t(`intake.${labelKey}`)}</span>
                    </label>
                  ))}
                </div>
                {errors.coverageTypes && <p className="text-sm text-red-600">{errors.coverageTypes}</p>}
              </div>
            )}

            {ic.healthCoverage === 'yes' && ic.coverageTypes.includes('medicare') && (
              <div className="space-y-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-gray-900 text-sm font-medium">{t('intake.insurance_medicarePlanQuestion')}</p>
                <p className="text-gray-600 text-xs">{t('intake.insurance_medicarePlanHelp')}</p>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {(
                    [
                      ['original', 'insurance_medicare_original'],
                      ['advantage', 'insurance_medicare_advantage'],
                      ['unsure', 'insurance_medicare_unsure']
                    ] as const
                  ).map(([val, labelKey]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        updateForm({
                          insuranceCoverage: { ...ic, medicarePlanType: val }
                        })
                      }
                      className={`p-2 rounded-lg border-2 text-sm text-left font-medium transition-all ${
                        ic.medicarePlanType === val ? 'border-brand-700 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {t(`intake.${labelKey}`)}
                    </button>
                  ))}
                </div>
                {errors.medicarePlan && <p className="text-sm text-red-600">{errors.medicarePlan}</p>}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-900 font-medium text-center text-lg">{t('intake.casePosture')}</p>
              <p className="text-gray-500 text-center text-sm">{t('intake.casePostureHelp')}</p>
              <div className="space-y-2 mt-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!cp.spokenToInsurance} onChange={e => updateForm({ casePosture: { ...cp, spokenToInsurance: e.target.checked } })} className="rounded border-gray-300" />
                  <span className="text-sm">{t('intake.casePosture_spokenToInsurance')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!cp.hiredLawyer} onChange={e => updateForm({ casePosture: { ...cp, hiredLawyer: e.target.checked } })} className="rounded border-gray-300" />
                  <span className="text-sm">{t('intake.casePosture_hiredLawyer')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!cp.receivedOffer} onChange={e => updateForm({ casePosture: { ...cp, receivedOffer: e.target.checked } })} className="rounded border-gray-300" />
                  <span className="text-sm">{t('intake.casePosture_receivedOffer')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!cp.wantLawyer} onChange={e => updateForm({ casePosture: { ...cp, wantLawyer: e.target.checked } })} className="rounded border-gray-300" />
                  <span className="text-sm">{t('intake.casePosture_wantLawyer')}</span>
                </label>
              </div>
            </div>
          </div>
        )

      case 'consent':
        const consents = formData.consents || { tos: false, privacy: false, ml_use: false, hipaa: false }
        return (
          <div className="space-y-6">
            <p className="text-gray-600 text-center">{t('intake.consent_intro')}</p>
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-100">
              <p className="text-sm font-medium text-gray-900 mb-2">{t('intake.consent_includes')}</p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" /> {t('intake.consent_item1')}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" /> {t('intake.consent_item2')}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" /> {t('intake.consent_item3')}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" /> {t('intake.consent_item4')}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" /> {t('intake.consent_item5')}</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" /> {t('intake.consent_item6')}</li>
              </ul>
            </div>
            <p className="text-gray-700 font-medium text-center">{t('intake.consent_confirm')}</p>
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={consents.tos && consents.privacy} onChange={e => { const checked = e.target.checked; updateForm({ consents: { ...consents, tos: checked, privacy: checked } }) }} className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600" />
                <span className="text-sm">{t('intake.consent_tos')}</span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={consents.ml_use} onChange={e => updateForm({ consents: { ...consents, ml_use: e.target.checked } })} className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600" />
                <span className="text-sm">{t('intake.consent_ml')}</span>
              </label>
            </div>
            {(errors.tos || errors.privacy || errors.ml_use) && <p className="text-sm text-red-600 text-center">{errors.tos || errors.privacy || errors.ml_use}</p>}
            {errors.submit && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errors.submit}</div>}
          </div>
        )

      default:
        return null
    }
  }

  const stepTitles: Record<string, string> = {
    injury_type: t('intake.stepTitles_injury_type'),
    when: t('intake.stepTitles_when'),
    where: t('intake.stepTitles_where'),
    narrative: t('intake.stepTitles_narrative'),
    injury_severity: t('intake.stepTitles_injury_severity'),
    medical_treatment: t('intake.stepTitles_medical_treatment'),
    branch_7: t('intake.stepTitles_branch_7'),
    branch_8: t('intake.stepTitles_branch_8'),
    branch_9: t('intake.stepTitles_branch_9'),
    branch_10: t('intake.stepTitles_branch_10'),
    evidence: t('intake.stepTitles_evidence'),
    case_posture: t('intake.stepTitles_case_posture'),
    consent: t('intake.stepTitles_consent')
  }

  const autoAdvanceSteps = ['injury_type', 'when', 'injury_severity'].includes(currentStep)
  const showTapHint = autoAdvanceSteps && !(currentStep === 'when' && formData.incidentDatePreset === 'custom')
  const previewIncidentDate = getIncidentDate()
  const shouldShowSolPreview = !!(previewIncidentDate || formData.incidentDatePreset)
  const solPreviewTone = solPreview?.status === 'critical' || solPreview?.status === 'expired'
    ? 'bg-red-50 border-red-200 text-red-800'
    : solPreview?.status === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : solPreview?.status
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-slate-50 border-slate-200 text-slate-700'
  const solPreviewMessage = solPreview?.expiresAt
    ? `Estimated deadline: ${new Date(solPreview.expiresAt).toLocaleDateString()}`
    : formData.venue.state
      ? solPreviewError || 'We could not confirm the deadline from the current facts.'
      : 'Select the state and county to check your filing deadline early.'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-5" aria-busy={loading}>
        <h1 className="font-display text-2xl md:text-[1.65rem] font-bold text-slate-900 dark:text-slate-50 text-center leading-snug">
          {stepTitles[currentStep] || STEPS[currentStepIndex]?.title}
        </h1>
        <div className="flex justify-between items-center mt-3 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            {t('intake.step')} {currentStepIndex + 1} {t('intake.of')} {STEPS.length}
          </span>
          <span>
            {currentStepIndex + 1 < STEPS.length
              ? `• About ${Math.round(((STEPS.length - currentStepIndex - 1) / STEPS.length) * 90)} ${t('intake.secondsLeft')}`
              : `• ${t('intake.almostDone')}`}
          </span>
        </div>
        <div
          className="mt-3"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          aria-label="Assessment progress"
        >
          <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <p className="sr-only">{Math.round(progressPercent)} percent complete</p>
      </div>

      {shouldShowSolPreview && (
        <div className={`mb-4 rounded-2xl border px-4 py-3 ${solPreviewTone}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Early statute of limitations check</p>
              <p className="text-sm mt-1">{solPreviewMessage}</p>
              {solPreview?.daysRemaining != null && (
                <p className="text-xs mt-1">
                  About {Math.max(0, solPreview.daysRemaining)} day{Math.max(0, solPreview.daysRemaining) === 1 ? '' : 's'} remaining based on your current answers.
                </p>
              )}
            </div>
            {solPreview?.status && (
              <span className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold uppercase">
                {String(solPreview.status).replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-card border border-slate-200/90 dark:border-slate-700 p-5 mb-4 transition-shadow hover:shadow-card-hover motion-reduce:hover:shadow-card">
        {renderStep()}
      </div>

      <div className="flex justify-between items-center gap-3">
        <button
          type="button"
          onClick={() => currentStepIndex > 0 && setCurrentStep(STEPS[currentStepIndex - 1].key)}
          disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-1 px-4 py-2.5 text-brand-700 dark:text-brand-400 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> {t('common.back')}
        </button>
        {currentStep === 'consent' ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? t('intake.submitting') : t('intake.viewReport')}
          </button>
        ) : showTapHint ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('intake.tapToContinue')}</span>
        ) : currentStep === 'when' && formData.incidentDatePreset === 'custom' ? (
          <button
            type="button"
            onClick={validateAndNext}
            disabled={!customDate}
            className="inline-flex items-center px-6 py-2.5 bg-accent-600 text-white font-semibold rounded-xl hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={validateAndNext}
            className="inline-flex items-center px-6 py-2.5 bg-accent-600 text-white font-semibold rounded-xl hover:bg-accent-700 shadow-sm"
          >
            {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
