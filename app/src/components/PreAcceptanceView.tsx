/**
 * Pre-Acceptance View - Streamlined layout for attorneys to review routed cases in 10-20 seconds.
 * Answers: Is this case worth my time? What's the likely value? What evidence exists?
 */

import { useEffect, useRef, useState } from 'react'
import { formatCurrency, formatPercentage } from '../lib/formatters'
import { ChevronDown, ChevronRight, Clock, Check, Info, RefreshCw, Sparkles, ImageOff, Gauge, Image as ImageIcon, Stethoscope, ShieldCheck, FolderOpen, AlertCircle } from 'lucide-react'
import { useHeuristics } from '../contexts/HeuristicsContext'
import { caseStrengthLabel } from '../lib/heuristics'
import { useStatHints, StatHintsToggle } from '../features/shared/ui'
import { getEvidenceObjectUrl, regenerateLeadSceneImage, getLead } from '../lib/api'

function formatClaimType(s: string) {
  if (!s) return 'Personal injury'
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * De-identify a free-text narrative for the pre-acceptance (anonymous) view by
 * replacing the known plaintiff name(s) with "the plaintiff". Full names are matched
 * before lone first/last tokens (longest-first) so "Mary Lopez" collapses cleanly.
 */
function deidentifyText(text: string, names: string[]): string {
  if (!text) return text
  const unique = Array.from(new Set(names.map((n) => (n || '').trim()).filter((n) => n.length >= 2))).sort(
    (a, b) => b.length - a.length,
  )
  let out = text
  for (const name of unique) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi')
    out = out.replace(re, 'the plaintiff')
  }
  // Collapse accidental repeats ("the plaintiff the plaintiff" / possessive slips).
  out = out.replace(/\b(the plaintiff)(?:'s)?(\s+the plaintiff\b)+/gi, 'the plaintiff')
  return out
}

/**
 * Parse a deterministic-chronology line into structured parts for the care timeline.
 * Expected shape (best-effort): "<date> — <provider> • Dx: <diagnosis> • Tx: <treatment>".
 * Falls back to putting the whole string in `provider` when the format doesn't match.
 */
function parseChronologyEntry(entry: string): { date: string | null; provider: string | null; dx: string | null; tx: string | null } {
  const raw = (entry || '').trim()
  if (!raw) return { date: null, provider: null, dx: null, tx: null }
  const [head, ...restParts] = raw.split(/\s+[—-]\s+/)
  const hasDate = /\d/.test(head) && restParts.length > 0
  const date = hasDate ? head.trim() : null
  const remainder = hasDate ? restParts.join(' — ') : raw
  const segments = remainder.split(/\s*•\s*/).map((s) => s.trim()).filter(Boolean)
  let provider: string | null = null
  let dx: string | null = null
  let tx: string | null = null
  for (const seg of segments) {
    if (/^dx:/i.test(seg)) dx = seg.replace(/^dx:\s*/i, '').trim()
    else if (/^tx:/i.test(seg)) tx = seg.replace(/^tx:\s*/i, '').trim()
    else if (!provider) provider = seg
  }
  return { date, provider, dx, tx }
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

const DEFAULT_MEDICAL_PENDING_MESSAGE =
  'Medical records and extracted treatment details are pending plaintiff account creation and HIPAA authorization. The visible case summary is based on intake answers only until the plaintiff authorizes medical document sharing.'

interface PreAcceptanceViewProps {
  selectedLead: any
  bands: any
  viability: any
  confidenceScore: number
  liabilityScore: number
  comparativeRisk: string
  treatments: any[]
  treatmentContinuity: string
  deterministicChronology: { summary: string; timeline: string[]; providerGroups: string[] }
  filesCount: number
  leadEvidenceFiles: any[]
  evidenceChecklist: any
  venueSignal: string
  comparableCount: number | null
  comparableAvgSettlement?: number
  venueState?: string
  attorneyProfile?: { specialties?: string[]; venues?: string[] }
  onAccept: () => void
  onDecline: () => void
  loading?: boolean
  caseExpiresAt?: Date | null
  /** When true, hide Accept/Decline buttons (case already accepted) */
  accepted?: boolean
  /** Error surfaced from a failed accept/decline attempt (e.g. not authorized). */
  decisionError?: string | null
}

export default function PreAcceptanceView({
  selectedLead,
  bands,
  viability,
  confidenceScore,
  liabilityScore,
  comparativeRisk,
  treatments,
  treatmentContinuity,
  deterministicChronology,
  filesCount,
  leadEvidenceFiles,
  evidenceChecklist,
  venueSignal,
  comparableAvgSettlement,
  venueState,
  attorneyProfile,
  onAccept,
  onDecline,
  loading,
  caseExpiresAt,
  accepted = false,
  decisionError = null
}: PreAcceptanceViewProps) {
  const heuristics = useHeuristics()
  const { showHints, toggleHints } = useStatHints()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'snapshot' | 'scene' | 'medical' | 'insurance' | 'evidence'>('snapshot')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!caseExpiresAt || accepted) return
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [accepted, caseExpiresAt])

  const claimType = formatClaimType(selectedLead?.assessment?.claimType || '')
  const location = [selectedLead?.assessment?.venueCounty, selectedLead?.assessment?.venueState]
    .filter(Boolean)
    .join(', ') || 'Venue not provided'
  const insuranceSummary = (() => {
    try {
      const rawFacts = selectedLead?.assessment?.facts
      const facts = typeof rawFacts === 'string' ? JSON.parse(rawFacts) : rawFacts
      const insurance = facts?.insurance
      if (!insurance || (typeof insurance === 'object' && Object.keys(insurance).length === 0)) return 'Not provided yet'
      if (insurance.hasInsurance === false || insurance.otherPartyInsured === 'no') return 'No coverage reported'
      const carrier = insurance.carrier || insurance.company || insurance.provider || insurance.insurerName
      return carrier ? String(carrier) : 'Details on file'
    } catch {
      return 'Not provided yet'
    }
  })()
  // Parse the raw intake facts once so the summary card can describe the actual
  // incident (when / where / how), the injury/treatment picture, and coverage —
  // not just headline scores.
  const parsedFacts = (() => {
    try {
      const raw = selectedLead?.assessment?.facts
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      return null
    }
  })()
  const incidentFacts = parsedFacts?.incident || {}
  const incidentWhen = [incidentFacts.date, incidentFacts.time].filter(Boolean).join(' · ') || 'Not provided'
  const incidentWhere = incidentFacts.location || location
  // Names to scrub from any displayed free text (pre-acceptance view is de-identified).
  const plaintiffNameTokens = [
    selectedLead?.assessment?.user?.firstName,
    selectedLead?.assessment?.user?.lastName,
    [selectedLead?.assessment?.user?.firstName, selectedLead?.assessment?.user?.lastName].filter(Boolean).join(' '),
    parsedFacts?.plaintiffContext?.firstName,
    parsedFacts?.plaintiffContext?.lastName,
    [parsedFacts?.plaintiffContext?.firstName, parsedFacts?.plaintiffContext?.lastName].filter(Boolean).join(' '),
  ].filter(Boolean) as string[]
  const rawIncidentDescription = incidentFacts.narrative || parsedFacts?.damages?.pain_suffering_narrative || ''
  const incidentDescription =
    deidentifyText(rawIncidentDescription, plaintiffNameTokens) || 'No incident description provided yet.'
  const faultLabel = parsedFacts?.liability?.fault
    ? String(parsedFacts.liability.fault).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null
  const policyLimit = Number(parsedFacts?.insurance?.policy_limit) || null
  const medSpecials = Number(parsedFacts?.damages?.med_charges) || null
  const treatmentProviders = Array.isArray(parsedFacts?.treatment) ? parsedFacts.treatment.length : treatments.length
  const valueLow = bands?.p25 ?? bands?.low ?? 0
  const valueHigh = bands?.p75 ?? bands?.high ?? bands?.median ?? 0
  const routingPricing = selectedLead?.routingPricing
  const routingFee = typeof routingPricing?.priceCents === 'number'
    ? formatCurrency(routingPricing.priceCents / 100)
    : null
  const routingTierLabel = routingPricing?.tierLabel || 'Pricing tier not assigned'
  const rawCaseScore = Number(selectedLead?.viabilityScore ?? viability?.overall ?? 0)
  const caseScore = rawCaseScore <= 1 ? Math.round(rawCaseScore * 100) : Math.min(100, Math.round(rawCaseScore))
  const hasCaseScore = caseScore > 0
  const caseStrength = !hasCaseScore ? 'Not scored yet' : caseStrengthLabel(heuristics, caseScore)

  // Evidence status
  const evidenceItems = Array.isArray(evidenceChecklist?.required) ? evidenceChecklist.required : []
  const expectedTimeline = '8–14 months'
  const medicalSharing = selectedLead?.assessment?.medicalSharing
  const medicalSharingPending = medicalSharing && medicalSharing.canShareMedicalData === false
  const medicalPendingMessage = medicalSharing?.message || DEFAULT_MEDICAL_PENDING_MESSAGE
  const hasMedical = !medicalSharingPending && (
    treatments.length > 0
    || leadEvidenceFiles.some((f: any) => ['medical', 'medical_records', 'bills', 'medical_bill'].includes(String(f?.category || f?.subcategory || '')))
  )
  const hasPolice = leadEvidenceFiles.some((f: any) => ['police', 'police_report'].includes(String(f?.category || f?.subcategory || ''))) || filesCount > 0
  const hasPhotos = leadEvidenceFiles.some((f: any) => f?.category === 'photos')
  const hasWageLoss = leadEvidenceFiles.some((f: any) => ['wage', 'wage_loss'].includes(String(f?.category || f?.subcategory || '')))

  const evidenceList = [
    { label: 'Medical Records', status: medicalSharingPending ? 'Pending authorization' : hasMedical ? 'Uploaded' : 'Missing' },
    { label: 'Injury Photos', status: hasPhotos ? 'Uploaded' : 'Missing' },
    { label: 'Police Report', status: hasPolice ? 'Uploaded' : 'Missing' },
    { label: 'Wage Loss Docs', status: hasWageLoss ? 'Uploaded' : 'Missing' }
  ]
  const derivedEvidenceUploaded = evidenceList.filter((item) => item.status === 'Uploaded').length
  const derivedEvidenceTotal = evidenceList.length
  const evidenceUploaded = evidenceItems.length > 0
    ? evidenceItems.filter((e: any) => e?.uploaded).length
    : derivedEvidenceUploaded
  const evidenceTotal = evidenceItems.length > 0 ? evidenceItems.length : derivedEvidenceTotal
  const evidenceScore = evidenceTotal > 0 ? Math.round((evidenceUploaded / evidenceTotal) * 100) : 0
  const evidenceStatus = evidenceUploaded > 0 ? `${evidenceUploaded}/${evidenceTotal} uploaded` : 'Pending'
  const missingDocuments = evidenceList.filter((item) => item.status !== 'Uploaded' && item.status !== 'Pending authorization')
  const attorneyFitScore = Math.round(
    [
      venueState ? 1 : 0.5,
      attorneyProfile?.specialties ? 1 : 0.5,
      valueLow > 0 || valueHigh > 0 ? 1 : 0.5,
      liabilityScore >= 0.5 ? 1 : 0,
    ].reduce((sum, score) => sum + score, 0) / 4 * 100,
  )
  const tabs = [
    { id: 'snapshot', label: 'Snapshot', icon: Gauge },
    { id: 'scene', label: 'Scene', icon: ImageIcon },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
    { id: 'evidence', label: 'Evidence', icon: FolderOpen },
  ] as const

  // Timeline: Accident → First Visit → Last Visit
  const firstVisit = treatments[0]?.date || deterministicChronology.timeline[0] || '—'
  const lastVisit =
    treatments.length > 0
      ? treatments[treatments.length - 1]?.date || deterministicChronology.timeline[deterministicChronology.timeline.length - 1]
      : '—'

  // Risks (drives the Risks tab and the decision recommendation)
  const risks: string[] = []
  if (!hasPolice) risks.push('No police report yet')
  if (treatmentContinuity === 'Fragmented' || treatments.length <= 1) risks.push('Treatment gaps')
  if (evidenceScore < 50) risks.push('Limited documentation')

  // Why matched
  const matchReasons: string[] = []
  const specialties = Array.isArray(attorneyProfile?.specialties)
    ? attorneyProfile.specialties
    : (typeof attorneyProfile?.specialties === 'string' ? (() => { try { return JSON.parse(attorneyProfile.specialties) } catch { return [] } })() : [])
  if (specialties?.length) matchReasons.push(`${claimType} cases`)
  if (venueState) matchReasons.push(`${venueState} jurisdiction`)
  if (valueLow > 0 && valueHigh > 0) matchReasons.push('Estimated value within your preferred range')

  const timeRemainingMs = caseExpiresAt ? caseExpiresAt.getTime() - now : null
  const isExpired = timeRemainingMs != null && timeRemainingMs <= 0
  const expiresIn = timeRemainingMs != null ? formatCountdown(timeRemainingMs) : null
  // The case is claimed by someone else when it's routing-locked (only set on an
  // accept) while this attorney has not accepted it. In that state accepting/paying
  // must be blocked outright — an expired window alone still leaves it available.
  const caseTaken =
    !accepted &&
    (!!selectedLead?.routingLocked || selectedLead?.offerStatus === 'ACCEPTED')
  // Once the response window lapses (or the case is taken) the attorney can no longer
  // act on the match: Accept/Decline are disabled and grayed out.
  const decisionLocked = !accepted && (caseTaken || isExpired)
  const decisionRecommendation =
    caseScore >= 70 && risks.length <= 1
      ? 'Strong accept candidate'
      : caseScore >= 45
        ? 'Accept if capacity and missing documents are manageable'
        : 'Review risks before accepting'

  // Viability breakdown (Liability / Causation / Damages). Mirrors the parent logic:
  // use the first positive of the component score, the prediction's sub-score, then the
  // overall viability — so we never show a contradictory 0% next to a real case value.
  const viabilityBreakdown = (() => {
    const v = (viability || {}) as Record<string, any>
    const overall = Number(selectedLead?.viabilityScore ?? v.overall ?? 0) || 0
    const firstPositive = (...vals: any[]) => {
      for (const val of vals) {
        const n = Number(val)
        if (Number.isFinite(n) && n > 0) return n
      }
      return 0
    }
    return {
      liability: firstPositive(selectedLead?.liabilityScore, v.liability, overall),
      causation: firstPositive(selectedLead?.causationScore, v.causation, overall),
      damages: firstPositive(selectedLead?.damagesScore, v.damages, overall),
    }
  })()

  return (
    <div className="space-y-6">
      {/* 1. Case Summary Card */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {claimType} – {location}
          </h2>
          {!accepted && (
            <div className="flex flex-wrap items-stretch gap-3">
              {!caseTaken && !isExpired && expiresIn && (
                <span className="inline-flex flex-col items-center justify-center rounded-lg border border-red-300 bg-red-50 px-6 py-3 text-red-700">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    Time left to accept:
                  </span>
                  <span className="text-base font-bold tabular-nums leading-tight">{expiresIn}</span>
                </span>
              )}
              <button
                onClick={onAccept}
                disabled={loading || decisionLocked}
                title={
                  caseTaken
                    ? 'This case has been assigned to another attorney'
                    : isExpired
                      ? 'The response window for this match has expired'
                      : undefined
                }
                className={`px-6 py-3 text-base font-semibold text-white rounded-lg ${
                  decisionLocked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                }`}
              >
                {caseTaken ? (
                  'No longer available'
                ) : isExpired ? (
                  'Response window expired'
                ) : routingFee ? (
                  <span className="inline-flex flex-col items-center leading-tight">
                    <span>Accept Case</span>
                    <span className="text-sm font-bold">{routingFee}</span>
                  </span>
                ) : (
                  'Accept Case'
                )}
              </button>
              <button
                onClick={onDecline}
                disabled={loading || decisionLocked}
                title={isExpired && !caseTaken ? 'The response window for this match has expired' : undefined}
                className={`px-6 py-3 text-base font-semibold rounded-lg border-2 ${
                  decisionLocked
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                Decline
              </button>
            </div>
          )}
        </div>
        {/* Case-taken / expired notices (the live countdown sits next to Accept) */}
        {!accepted && caseTaken && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <Clock className="h-4 w-4" />
            <span>This case has been assigned to another attorney. It is no longer available to accept.</span>
          </div>
        )}
        {!accepted && !caseTaken && isExpired && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <Clock className="h-4 w-4" />
            <span>Response window expired — this match has been released to another attorney and can no longer be accepted.</span>
          </div>
        )}
        {!accepted && decisionError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{decisionError}</span>
          </div>
        )}
        {/* The incident: when / where / how */}
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-brand-100 bg-white/60 p-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">When</span>
            <p className="font-semibold text-gray-900">{incidentWhen}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Where</span>
            <p className="font-semibold text-gray-900">{incidentWhere}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">How</span>
            <p className="font-semibold text-gray-900">{faultLabel ? `${faultLabel} at fault` : claimType}</p>
          </div>
        </div>

        {/* Description of what happened */}
        <div className="mt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</span>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{incidentDescription}</p>
        </div>

        {/* Key facts: estimate, treatment, insurance, evidence */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-gray-500">Estimated Case Value:</span>
            <p className="font-semibold text-gray-900">
              {valueLow || valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : 'Not available'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Case Strength:</span>
            <p className="font-semibold text-gray-900">
              {hasCaseScore ? `${caseStrength} (${caseScore}/100)` : 'Not scored yet'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Treatment:</span>
            <p className="font-semibold text-gray-900">
              {hasMedical ? 'Yes' : medicalSharingPending ? 'Pending auth.' : 'No'}
            </p>
            {(medSpecials || treatmentProviders > 0) && (
              <p className="text-xs text-gray-500">
                {[
                  treatmentProviders > 0 ? `${treatmentProviders} provider${treatmentProviders === 1 ? '' : 's'}` : null,
                  medSpecials ? `${formatCurrency(medSpecials)} billed` : null,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div>
            <span className="text-gray-500">Insurance:</span>
            <p className="font-semibold text-gray-900">{insuranceSummary}</p>
            {policyLimit && (
              <p className="text-xs text-gray-500">{formatCurrency(policyLimit)} policy limit</p>
            )}
          </div>
          <div>
            <span className="text-gray-500">Evidence:</span>
            <p className="font-semibold text-gray-900">{evidenceStatus}</p>
          </div>
          <div>
            <span className="text-gray-500">Timeline:</span>
            <p className="font-semibold text-gray-900">{expectedTimeline}</p>
          </div>
        </div>
        {medicalSharingPending && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Medical records pending authorization</p>
            <p className="mt-1">{medicalPendingMessage}</p>
          </div>
        )}
      </div>

      {accepted && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center px-4 py-2 rounded-lg bg-green-100 text-green-800 font-medium">
            ✓ Case Accepted
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                    aria-hidden
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="p-5">
          {activeTab === 'snapshot' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">60-Second Case Story</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {claimType} in {location}.{' '}
                  {valueLow || valueHigh
                    ? `Estimated value is ${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}${confidenceScore > 0 ? ` with ${confidenceScore}% confidence` : ''}.`
                    : 'A value estimate is not available yet — more case details are needed.'}{' '}
                  {liabilityScore > 0
                    ? `Liability is scored at ${Math.round(liabilityScore * 100)}%,`
                    : 'Liability has not been scored yet,'}{' '}
                  treatment is {hasMedical ? 'documented' : 'not yet documented'}, and {missingDocuments.length} key document
                  {missingDocuments.length === 1 ? ' is' : 's are'} still missing.
                </p>
                {medicalSharingPending && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Medical records and extracted treatment details are not visible yet because HIPAA authorization is pending.
                  </p>
                )}
              </div>

              {/* Viability Breakdown */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-slate-700">Viability Breakdown</label>
                  <StatHintsToggle showHints={showHints} onToggle={toggleHints} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="group relative rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-center" tabIndex={showHints ? 0 : -1}>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Liability
                      {showHints && <Info className="h-3 w-3 opacity-60" aria-hidden />}
                    </div>
                    <div className="mt-1 text-xl font-bold text-blue-600">{viabilityBreakdown.liability > 0 ? formatPercentage(viabilityBreakdown.liability) : '—'}</div>
                    {showHints && (
                      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-lg shadow-slate-900/20 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        How clearly the defendant is at fault. Scored 0–100% by the case model from the reported fault, incident facts (traffic/product/premises details), and supporting evidence like police reports or witness statements.
                        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-900" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="group relative rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-center" tabIndex={showHints ? 0 : -1}>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Causation
                      {showHints && <Info className="h-3 w-3 opacity-60" aria-hidden />}
                    </div>
                    <div className="mt-1 text-xl font-bold text-emerald-600">{viabilityBreakdown.causation > 0 ? formatPercentage(viabilityBreakdown.causation) : '—'}</div>
                    {showHints && (
                      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-lg shadow-slate-900/20 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        How strongly the incident — not a pre-existing condition — caused the injuries. Scored 0–100% from the treatment timeline (time-to-first-visit, continuity of care) and medical records; long gaps or prior conditions lower it.
                        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-900" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="group relative rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-center" tabIndex={showHints ? 0 : -1}>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Damages
                      {showHints && <Info className="h-3 w-3 opacity-60" aria-hidden />}
                    </div>
                    <div className="mt-1 text-xl font-bold text-purple-600">{viabilityBreakdown.damages > 0 ? formatPercentage(viabilityBreakdown.damages) : '—'}</div>
                    {showHints && (
                      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-lg shadow-slate-900/20 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        The severity and monetary value of the harm. Scored 0–100% from injury severity, documented medical specials/bills, and treatment intensity. Each sub-score is clamped to ≥5%, and if a component is missing it falls back to the overall viability score.
                        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-slate-900" aria-hidden />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Why This Case Matched You */}
              {matchReasons.length > 0 && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Why This Case Matched Your Profile</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {matchReasons.map((r, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advanced AI Analysis (Collapsed) */}
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span>Advanced AI Analysis</span>
                  {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {advancedOpen && (
                  <div className="p-4 border-t border-gray-200 text-sm text-gray-600 space-y-2">
                    <p>View full analysis including: venue signals, adjuster posture, missing treatment analysis, severity scoring, comparable case data.</p>
                    <p className="text-xs text-gray-500">Accept the case to unlock full analysis.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'scene' && (
            <SceneTab
              leadId={selectedLead?.id}
              sceneImageUrl={selectedLead?.assessment?.sceneImageUrl || null}
              sceneImageStatus={selectedLead?.assessment?.sceneImageStatus || null}
            />
          )}

          {activeTab === 'medical' && (
            <div className="space-y-4">
              {medicalSharingPending ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Medical records pending authorization</p>
                  <p className="mt-1">{medicalPendingMessage}</p>
                </div>
              ) : treatments.length > 0 || deterministicChronology.timeline.length > 0 || hasMedical ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Treatment continuity</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {treatmentContinuity ? treatmentContinuity.charAt(0).toUpperCase() + treatmentContinuity.slice(1) : 'Not assessed yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Providers</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{treatmentProviders || '—'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medical specials</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{medSpecials ? formatCurrency(medSpecials) : '—'}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Treatment window</p>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800">
                        {firstVisit}
                        <span className="text-slate-400">→</span>
                        {lastVisit}
                      </span>
                    </div>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Care timeline</p>
                    <ol className="mt-3 space-y-5 border-l-2 border-slate-200 pl-5">
                      <li className="relative">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-300" aria-hidden />
                        <p className="text-sm font-semibold text-slate-900">Accident</p>
                        <p className="text-xs text-slate-500">Alleged injury event</p>
                      </li>
                      {deterministicChronology.timeline.map((entry, i) => {
                        const { date, provider, dx, tx } = parseChronologyEntry(entry)
                        return (
                          <li key={i} className="relative">
                            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" aria-hidden />
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              {date && <span className="text-xs font-semibold text-brand-700">{date}</span>}
                              <span className="text-sm font-semibold text-slate-900">{provider || 'Treatment visit'}</span>
                            </div>
                            {(dx || tx) && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {dx && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                                    <span className="font-semibold">Dx</span>
                                    {dx}
                                  </span>
                                )}
                                {tx && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                    <span className="font-semibold">Tx</span>
                                    {tx}
                                  </span>
                                )}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                </>
              ) : (
                <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">No medical treatment data yet.</p>
              )}
            </div>
          )}

          {activeTab === 'insurance' && (() => {
            const ins = (parsedFacts?.insurance || {}) as Record<string, any>
            const coverageType = ins.coverage_type || ins.policyType || ins.type || null
            const noCoverage = ins.hasInsurance === false || ins.otherPartyInsured === 'no'
            const overSpecials = policyLimit && medSpecials ? medSpecials > policyLimit : false
            return (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carrier</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{insuranceSummary}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy limit</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{policyLimit ? formatCurrency(policyLimit) : '—'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {noCoverage ? 'No coverage reported' : coverageType ? String(coverageType).replace(/_/g, ' ') : 'On file'}
                    </p>
                  </div>
                </div>
                {overSpecials ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Medical specials ({formatCurrency(medSpecials!)}) already exceed the reported policy limit ({formatCurrency(policyLimit!)}). Check for excess/UM coverage or additional defendants.
                  </div>
                ) : policyLimit && medSpecials ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Medical specials to date are {formatCurrency(medSpecials)} against a {formatCurrency(policyLimit)} policy limit.
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Confirm coverage limits and layers (UM/UIM, umbrella) during intake to validate the value range.
                  </div>
                )}
              </div>
            )
          })()}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {medicalSharingPending && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Medical records pending authorization</p>
                  <p className="mt-1">{medicalPendingMessage}</p>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-4">
                {evidenceList.map((item) => (
                  <div key={item.label} className="flex h-full flex-col rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className={`mt-auto pt-2 text-sm font-medium ${item.status === 'Uploaded' ? 'text-green-700' : 'text-amber-700'}`}>
                      {item.status}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Best next document: {missingDocuments[0]?.label || 'No immediate missing document'}.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/**
 * Scene tab — shows the AI-generated incident-scene schematic for the lead.
 * Loads the stored PNG as a same-origin blob (so it renders inline without the
 * API's cross-origin frame restrictions), polls while generation is pending, and
 * lets the attorney regenerate it. Purely illustrative — not evidence.
 */
function SceneTab({
  leadId,
  sceneImageUrl,
  sceneImageStatus,
}: {
  leadId?: string
  sceneImageUrl: string | null
  sceneImageStatus: string | null
}) {
  const [status, setStatus] = useState<string>(sceneImageStatus || (sceneImageUrl ? 'ready' : 'pending'))
  const [fileUrl, setFileUrl] = useState<string | null>(sceneImageUrl)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  // Load the stored PNG as a same-origin blob URL for inline display.
  useEffect(() => {
    let cancelled = false
    if (!fileUrl) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setObjectUrl(null)
      return
    }
    setImgLoading(true)
    getEvidenceObjectUrl(fileUrl)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = url
        setObjectUrl(url)
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null)
      })
      .finally(() => {
        if (!cancelled) setImgLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fileUrl])

  // Revoke the blob URL on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  // Poll the lead while the image is still being generated.
  useEffect(() => {
    if (status !== 'pending' || fileUrl || !leadId) return
    let stopped = false
    let attempts = 0
    const intervalId = window.setInterval(async () => {
      attempts += 1
      if (stopped) return
      try {
        const lead = await getLead(leadId)
        const url = lead?.assessment?.sceneImageUrl || null
        const st = lead?.assessment?.sceneImageStatus || null
        if (url) {
          setFileUrl(url)
          setStatus('ready')
          window.clearInterval(intervalId)
        } else if (st === 'failed') {
          setStatus('failed')
          window.clearInterval(intervalId)
        }
      } catch {
        /* keep polling */
      }
      // Give up after ~2 minutes of polling.
      if (attempts >= 30) {
        window.clearInterval(intervalId)
      }
    }, 4000)
    return () => {
      stopped = true
      window.clearInterval(intervalId)
    }
  }, [status, fileUrl, leadId])

  const handleRegenerate = async () => {
    if (!leadId) return
    setStatus('pending')
    setFileUrl(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setObjectUrl(null)
    try {
      await regenerateLeadSceneImage(leadId)
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900">Incident reconstruction (AI schematic)</h3>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={status === 'pending' || !leadId}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${status === 'pending' ? 'animate-spin' : ''}`} />
          {status === 'pending' ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {objectUrl && status !== 'pending' ? (
          <img
            src={objectUrl}
            alt="AI-generated schematic reconstruction of the incident"
            className="mx-auto max-h-[520px] w-full object-contain bg-white"
          />
        ) : status === 'failed' ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <ImageOff className="h-8 w-8 text-slate-400" aria-hidden />
            <p className="text-sm font-medium text-slate-600">Couldn&apos;t generate a scene diagram for this case.</p>
            <p className="text-xs text-slate-500">This can happen when the incident description is sparse or the image service is unavailable. Try regenerating.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <RefreshCw className="h-7 w-7 animate-spin text-brand-500" aria-hidden />
            <p className="text-sm font-medium text-slate-600">Generating a schematic diagram of the incident…</p>
            <p className="text-xs text-slate-500">This usually takes a few seconds. It will appear here automatically.</p>
          </div>
        )}
        {imgLoading && objectUrl && (
          <div className="px-4 py-2 text-center text-xs text-slate-400">Loading image…</div>
        )}
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <strong>For context only — not evidence.</strong> This is an AI-generated schematic reconstruction based on the
        intake description. It may omit or misstate details and should not be relied on as an accurate depiction of the incident.
      </p>
    </div>
  )
}

