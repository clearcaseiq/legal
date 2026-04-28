/**
 * Pre-Acceptance View - Streamlined layout for attorneys to review routed cases in 10-20 seconds.
 * Answers: Is this case worth my time? What's the likely value? What evidence exists?
 */

import { useState } from 'react'
import { formatCurrency } from '../lib/formatters'
import { ChevronDown, ChevronRight } from 'lucide-react'

function formatClaimType(s: string) {
  return (s || 'unknown').replace(/_/g, ' ')
}

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
  onRequestInfo?: (notes: string) => void
  loading?: boolean
  caseExpiresAt?: Date | null
  /** When true, hide Accept/Decline buttons (case already accepted) */
  accepted?: boolean
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
  comparableCount,
  comparableAvgSettlement,
  venueState,
  attorneyProfile,
  onAccept,
  onDecline,
  onRequestInfo,
  loading,
  caseExpiresAt,
  accepted = false
}: PreAcceptanceViewProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [requestInfoOpen, setRequestInfoOpen] = useState(false)
  const [requestInfoNotes, setRequestInfoNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'snapshot' | 'value' | 'risks' | 'documents' | 'decision'>('snapshot')

  const claimType = formatClaimType(selectedLead?.assessment?.claimType || '')
  const location = [selectedLead?.assessment?.venueCounty, selectedLead?.assessment?.venueState]
    .filter(Boolean)
    .join(', ') || '—'
  const valueLow = bands?.p25 ?? bands?.low ?? 0
  const valueHigh = bands?.p75 ?? bands?.high ?? bands?.median ?? 0
  const caseScore = Math.round((selectedLead?.viabilityScore ?? viability?.overall ?? 0) * 100)
  const caseStrength =
    caseScore >= 70 ? 'Strong' : caseScore >= 40 ? 'Moderate' : 'Weak'

  // Evidence status
  const evidenceItems = evidenceChecklist?.required || []
  const evidenceUploaded = evidenceItems.filter((e: any) => e?.uploaded).length
  const evidenceTotal = evidenceItems.length || 1
  const evidenceScore = evidenceTotal > 0 ? Math.round((evidenceUploaded / evidenceTotal) * 100) : 0
  const evidenceStatus = evidenceUploaded > 0 ? `${evidenceUploaded}/${evidenceTotal} uploaded` : 'Pending'
  const expectedTimeline = '8–14 months'
  const hasMedical = treatments.length > 0 || leadEvidenceFiles.some((f: any) => f?.category === 'medical')
  const hasPolice = leadEvidenceFiles.some((f: any) => f?.category === 'police') || filesCount > 0
  const hasPhotos = leadEvidenceFiles.some((f: any) => f?.category === 'photos')

  const evidenceList = [
    { label: 'Medical records', status: hasMedical ? 'Uploaded' : 'Missing' },
    { label: 'Injury photos', status: hasPhotos ? 'Uploaded' : 'Missing' },
    { label: 'Police report', status: hasPolice ? 'Uploaded' : 'Missing' },
    { label: 'Wage loss docs', status: 'Missing' }
  ]
  const missingDocuments = evidenceList.filter((item) => item.status !== 'Uploaded')
  const attorneyFitScore = Math.round(
    [
      venueState ? 1 : 0.5,
      attorneyProfile?.specialties ? 1 : 0.5,
      valueLow > 0 || valueHigh > 0 ? 1 : 0.5,
      liabilityScore >= 0.5 ? 1 : 0,
    ].reduce((sum, score) => sum + score, 0) / 4 * 100,
  )
  const readinessScore = Math.round((caseScore + evidenceScore + confidenceScore + Math.round(liabilityScore * 100)) / 4)
  const tabs = [
    { id: 'snapshot', label: 'Snapshot' },
    { id: 'value', label: 'Value' },
    { id: 'risks', label: 'Risks' },
    { id: 'documents', label: 'Documents' },
    { id: 'decision', label: 'Decision' },
  ] as const

  // Timeline: Accident → First Visit → Last Visit
  const firstVisit = treatments[0]?.date || deterministicChronology.timeline[0] || '—'
  const lastVisit =
    treatments.length > 0
      ? treatments[treatments.length - 1]?.date || deterministicChronology.timeline[deterministicChronology.timeline.length - 1]
      : '—'

  // Strengths & Risks
  const strengths: string[] = []
  if (hasMedical) strengths.push('Injury documented')
  if (liabilityScore >= 0.5) strengths.push('Liability indicators present')
  if (venueSignal && !venueSignal.includes('No venue')) strengths.push('Venue favorable')

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

  const expiresIn = caseExpiresAt
    ? (() => {
        const ms = caseExpiresAt.getTime() - Date.now()
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        return h > 0 ? `${h}h ${m}m` : `${m}m`
      })()
    : null
  const deadlineUrgency = expiresIn ? `Response window: ${expiresIn}` : 'No response deadline shown'
  const decisionRecommendation =
    caseScore >= 70 && risks.length <= 1
      ? 'Strong accept candidate'
      : caseScore >= 45
        ? 'Accept if capacity and missing documents are manageable'
        : 'Review risks before accepting'
  const riskRows = [
    { label: 'Treatment continuity', value: treatmentContinuity || 'Unknown', level: treatmentContinuity === 'Fragmented' || treatments.length <= 1 ? 'high' : 'low' },
    { label: 'Documentation completeness', value: `${evidenceScore}%`, level: evidenceScore < 50 ? 'high' : evidenceScore < 75 ? 'medium' : 'low' },
    { label: 'Comparative fault', value: comparativeRisk, level: comparativeRisk === 'Yes' || comparativeRisk === 'Possible' ? 'medium' : 'low' },
    { label: 'Confidence', value: `${confidenceScore}%`, level: confidenceScore < 50 ? 'medium' : 'low' },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Case Summary Card */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {claimType} – {location}
          </h2>
          {!accepted && (
            <div className="flex gap-3">
              <button
                onClick={onAccept}
                disabled={loading}
                className="px-6 py-3 text-base font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Accept Case
              </button>
              <button
                onClick={onDecline}
                disabled={loading}
                className="px-6 py-3 text-base font-semibold text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Estimated Case Value:</span>
            <p className="font-semibold text-gray-900">
              {valueLow || valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : 'Not available'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Case Strength:</span>
            <p className="font-semibold text-gray-900">
              {caseStrength} ({caseScore}/100)
            </p>
          </div>
          <div>
            <span className="text-gray-500">Medical Treatment:</span>
            <p className="font-semibold text-gray-900">{hasMedical ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-gray-500">Evidence:</span>
            <p className="font-semibold text-gray-900">
              {evidenceStatus}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Timeline:</span>
            <p className="font-semibold text-gray-900">
              {expectedTimeline}
            </p>
          </div>
        </div>
        {!accepted && expiresIn && (
          <p className="mt-4 text-sm font-medium text-amber-700">Case expires in {expiresIn}</p>
        )}
      </div>

      {accepted && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center px-4 py-2 rounded-lg bg-green-100 text-green-800 font-medium">
            ✓ Case Accepted
          </div>
          {onRequestInfo && (
            <button
              onClick={() => setRequestInfoOpen(true)}
              disabled={loading}
              className="px-6 py-3 text-base font-semibold text-amber-600 border-2 border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-50"
            >
              Request Info
            </button>
          )}
        </div>
      )}

      {requestInfoOpen && onRequestInfo && accepted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">What information do you need?</label>
          <textarea
            value={requestInfoNotes}
            onChange={(e) => setRequestInfoNotes(e.target.value)}
            placeholder="e.g. medical records, police report, wage loss documentation..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onRequestInfo(requestInfoNotes)
                setRequestInfoOpen(false)
                setRequestInfoNotes('')
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
            >
              Send Request
            </button>
            <button
              onClick={() => setRequestInfoOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 pt-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-t-lg border px-3 py-2 font-medium ${
                  activeTab === tab.id
                    ? 'border-slate-200 border-b-white bg-white text-brand-700'
                    : 'border-transparent bg-slate-50 text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {activeTab === 'snapshot' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <DecisionMetric label="Acceptability" value={`${readinessScore}%`} helper={decisionRecommendation} tone={readinessScore >= 70 ? 'green' : readinessScore >= 45 ? 'amber' : 'red'} />
                <DecisionMetric label="Attorney fit" value={`${attorneyFitScore}%`} helper={matchReasons[0] || 'Fit based on case and venue signals'} tone="blue" />
                <DecisionMetric label="File completeness" value={`${evidenceScore}%`} helper={`${evidenceUploaded}/${evidenceTotal} key items uploaded`} tone={evidenceScore >= 75 ? 'green' : 'amber'} />
                <DecisionMetric label="Urgency" value={expiresIn || 'Normal'} helper={deadlineUrgency} tone={expiresIn ? 'amber' : 'slate'} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">60-second case story</h3>
                <p className="mt-2 text-sm text-slate-700">
                  {claimType} in {location}. Estimated value is{' '}
                  {valueLow || valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : 'not available'} with{' '}
                  {confidenceScore}% confidence. Liability is scored at {Math.round(liabilityScore * 100)}%, treatment is{' '}
                  {hasMedical ? 'documented' : 'not yet documented'}, and {missingDocuments.length} key document
                  {missingDocuments.length === 1 ? ' is' : 's are'} still missing.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'value' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Value confidence</h3>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {valueLow || valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : 'Not available'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Confidence is {confidenceScore}%. Add medical bills, complete treatment records, and insurance details to tighten the range.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Comparable case signal</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <InfoRow label="Similar cases" value={comparableCount != null ? `${comparableCount} on file` : 'Not enough data'} />
                  <InfoRow label="Typical range" value={valueLow && valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : '—'} />
                  <InfoRow label="Venue signal" value={venueSignal || 'No venue data'} />
                  <InfoRow label="Average settlement" value={comparableAvgSettlement ? formatCurrency(comparableAvgSettlement) : '—'} />
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="space-y-3">
              {riskRows.map((row) => (
                <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <p className="text-sm text-slate-600">{row.value}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskTone(row.level)}`}>
                    {row.level === 'high' ? 'High risk' : row.level === 'medium' ? 'Watch' : 'Low risk'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {evidenceList.map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className={`mt-2 text-sm font-medium ${item.status === 'Uploaded' ? 'text-green-700' : 'text-amber-700'}`}>
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

          {activeTab === 'decision' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Decision recommendation</h3>
                <p className="mt-2 text-lg font-bold text-slate-900">{decisionRecommendation}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>Case score: {caseScore}/100</li>
                  <li>Liability: {Math.round(liabilityScore * 100)}%</li>
                  <li>File completeness: {evidenceScore}%</li>
                  <li>Attorney fit: {attorneyFitScore}%</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Decision capture</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Use Accept when the case fits your venue, value, and capacity. Use Decline with a reason when there is a conflict, jurisdiction issue, capacity issue, or low-value concern.
                </p>
                {!accepted && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={onAccept} disabled={loading} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      Accept
                    </button>
                    <button onClick={onDecline} disabled={loading} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                      Decline with reason
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Key Metrics - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Case Value</h3>
          <p className="text-lg font-bold text-gray-900">
            {valueLow || valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : 'Not available'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Confidence: {confidenceScore}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Liability</h3>
          <p className="text-lg font-bold text-gray-900">{Math.round(liabilityScore * 100)}% likelihood</p>
          <p className="text-xs text-gray-500 mt-1">Comparative negligence risk: {comparativeRisk}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Evidence</h3>
          <p className="text-lg font-bold text-gray-900">Medical treatment: {hasMedical ? 'Yes' : 'No'}</p>
          <p className="text-xs text-gray-500 mt-1">Police report: {hasPolice ? 'Uploaded' : 'Not uploaded'}</p>
          <p className="text-xs text-gray-500">Photos: {hasPhotos ? 'Uploaded' : 'Not uploaded'}</p>
        </div>
      </div>

      {/* 4. Key Strengths & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Case Strengths</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {strengths.length > 0 ? (
              strengths.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-600">✔</span> {s}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No strengths identified</li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Potential Risks</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {risks.length > 0 ? (
              risks.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-amber-600">•</span> {r}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No significant risks identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* 5. Evidence Status */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Evidence Status</h3>
        <p className="text-sm text-gray-500 mb-3">Evidence Score: {evidenceScore}%</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {evidenceList.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-gray-600">{item.label}:</span>
              <span className={item.status === 'Uploaded' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Medical Chronology */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Medical Treatment Summary</h3>
        {treatments.length > 0 || deterministicChronology.timeline.length > 0 ? (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              Treatment continuity: {treatmentContinuity ? treatmentContinuity.charAt(0).toUpperCase() + treatmentContinuity.slice(1) : 'Unknown'}
            </p>
            <p className="text-gray-600">
              First Visit: {firstVisit} • Last Visit: {lastVisit}
            </p>
            <p className="text-gray-600 font-medium mt-2">Timeline</p>
            <p className="text-gray-700">
              Accident → {deterministicChronology.timeline[0] || 'First visit'} → {deterministicChronology.timeline[deterministicChronology.timeline.length - 1] || lastVisit}
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No medical treatment data yet</p>
        )}
      </div>

      {/* 7. Plaintiff Summary (De-identified) */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Plaintiff Summary (De-identified)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Location:</span>
            <p className="font-medium">{location}</p>
          </div>
          <div>
            <span className="text-gray-500">Incident Type:</span>
            <p className="font-medium">{claimType}</p>
          </div>
          <div>
            <span className="text-gray-500">Treatment:</span>
            <p className="font-medium">{hasMedical ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-gray-500">Insurance:</span>
            <p className="font-medium">Unknown</p>
          </div>
        </div>
      </div>

      {/* 8. Comparable Cases */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Comparable Cases {venueState ? `(${venueState})` : ''}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Average settlement:</span>
            <p className="font-medium">
              {comparableAvgSettlement ? formatCurrency(comparableAvgSettlement) : valueLow && valueHigh ? formatCurrency((valueLow + valueHigh) / 2) : '—'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Typical range:</span>
            <p className="font-medium">{valueLow && valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : '—'}</p>
          </div>
          <div>
            <span className="text-gray-500">Similar cases accepted:</span>
            <p className="font-medium">{comparableCount != null ? `${comparableCount} on file` : '—'}</p>
          </div>
        </div>
      </div>

      {/* 9. Why This Case Matched You */}
      {matchReasons.length > 0 && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Why this case matched your profile</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {matchReasons.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-brand-600">✔</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 10. Advanced AI Analysis (Collapsed) */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
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
  )
}

function DecisionMetric({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string
  helper: string
  tone: 'green' | 'amber' | 'red' | 'blue' | 'slate'
}) {
  const tones = {
    green: 'border-green-200 bg-green-50 text-green-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs">{helper}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function riskTone(level: string) {
  if (level === 'high') return 'bg-red-100 text-red-700'
  if (level === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}
