import { ChevronRight } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import type {
  AttorneyDashboardLead,
  AttorneyDashboardLeadAnalysis,
  AttorneyDashboardLeadFacts,
  AttorneyDashboardLeadPrediction,
} from './attorneyDashboardShared'

type AttorneyDashboardWorkstreamOverviewProps = {
  selectedLead: AttorneyDashboardLead
  selectedLeadFacts: AttorneyDashboardLeadFacts
  selectedLeadPrediction: AttorneyDashboardLeadPrediction
  selectedLeadAnalysis: AttorneyDashboardLeadAnalysis
  leadEvidenceFiles: any[]
  contactHistory: any[]
  buildMedicalChronology: any
  formatRelativeDate: any
  getTreatmentContinuity: any
  getSeverityScore: any
  getAdjusterPrediction: any
  goToSection: any
  handleStatusUpdate: any
  handleCreateContactFromCommand: any
}

export default function AttorneyDashboardWorkstreamOverview({
  selectedLead,
  selectedLeadFacts,
  selectedLeadPrediction,
  selectedLeadAnalysis,
  leadEvidenceFiles,
  contactHistory,
  buildMedicalChronology,
  formatRelativeDate,
  getTreatmentContinuity,
  getSeverityScore,
  getAdjusterPrediction,
  goToSection,
  handleStatusUpdate,
  handleCreateContactFromCommand,
}: AttorneyDashboardWorkstreamOverviewProps) {
  const facts: any = selectedLeadFacts || {}
  const injuries = Array.isArray(facts?.injuries) ? facts.injuries : []
  const treatments = Array.isArray(facts?.treatment) ? facts.treatment : []
  const chrono = buildMedicalChronology(facts)
  const location = [selectedLead?.assessment?.venueCounty, selectedLead?.assessment?.venueState].filter(Boolean).join(', ') || '—'
  const incidentDate = formatRelativeDate(facts?.incident?.date)
  const injury = injuries.length > 0 ? injuries[0]?.type || injuries[0]?.description || 'Not documented' : 'Not documented'
  const evidenceCount = (Array.isArray(selectedLead?.assessment?.files) ? selectedLead.assessment.files.length : 0) + leadEvidenceFiles.length
  const hasMedical = treatments.length > 0 || leadEvidenceFiles.some((f: any) => f?.category === 'medical')
  const hasPolice = leadEvidenceFiles.some((f: any) => f?.category === 'police')
  const hasPhotos = leadEvidenceFiles.some((f: any) => f?.category === 'photos')
  const evidenceList = [
    { label: 'Medical Records', status: hasMedical },
    { label: 'Injury Photos', status: hasPhotos },
    { label: 'Police Report', status: hasPolice },
    { label: 'Wage Loss Docs', status: false },
  ]
  const nextActions: string[] = []
  if (contactHistory.length === 0) nextActions.push('Call plaintiff to confirm injuries')
  if (!hasPolice) nextActions.push('Request police report')
  if (!hasMedical) nextActions.push('Upload medical bills')
  if (contactHistory.length === 0) nextActions.push('Schedule consultation')
  if (nextActions.length === 0) nextActions.push('Review case and prepare demand letter')
  const formatShortDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const activityItems: { time: string; label: string }[] = []
  const incidentDateForTimeline = facts?.incident?.date
  const submittedAt = selectedLead?.submittedAt || selectedLead?.assessment?.createdAt
  if (incidentDateForTimeline) activityItems.push({ time: formatShortDate(String(incidentDateForTimeline)), label: 'Accident' })
  if (submittedAt) activityItems.push({ time: formatShortDate(String(submittedAt)), label: 'Intake submitted' })
  if (['contacted', 'consulted', 'retained'].includes(selectedLead?.status || '')) {
    activityItems.push({ time: submittedAt ? formatShortDate(String(submittedAt)) : '—', label: 'Case accepted' })
  }
  if (leadEvidenceFiles.length > 0) activityItems.push({ time: '—', label: 'Medical records uploaded' })
  activityItems.reverse()
  const timelineEntries: { date: string; label: string }[] = []
  const incidentDateStr = facts?.incident?.date ? new Date(facts.incident.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
  if (incidentDateStr) timelineEntries.push({ date: incidentDateStr, label: 'Accident' })
  chrono.timeline.slice(0, 4).forEach((entry: string) => {
    const parts = entry.split(' — ')
    timelineEntries.push({ date: parts[0] || '—', label: parts.slice(1).join(' — ') || entry })
  })
  const treatmentContinuity = getTreatmentContinuity(treatments)
  const prediction = (selectedLeadPrediction || {}) as any
  const bands = prediction?.bands || {}
  const caseScore = Math.round((selectedLead?.viabilityScore ?? 0) * 100)
  const valueLow = bands?.p25 ?? bands?.low ?? 0
  const valueHigh = bands?.p75 ?? bands?.high ?? bands?.median ?? 0
  const severity = getSeverityScore(facts)
  const analysisData = (selectedLeadAnalysis || {}) as any
  const adjuster = analysisData?.adjusterPrediction
    ? { posture: analysisData.adjusterPrediction.strategy || 'Not available', risk: analysisData.adjusterPrediction.riskIndicator || 'Not available' }
    : getAdjusterPrediction(selectedLead)
  const explainData = (selectedLeadPrediction?.explain || {}) as any
  const comparableCount = analysisData?.comparableCaseData?.count ?? explainData?.comparables?.count ?? null
  const venueSignal =
    analysisData?.comparableCaseData?.venueSignal ||
    explainData?.venueSignal ||
    (selectedLead?.assessment?.venueState ? `Standard for ${selectedLead.assessment.venueState}` : '—')
  const evidenceScore = Math.round((evidenceList.filter((e) => e.status).length / evidenceList.length) * 100)
  const hasGaps = chrono.gapsAndRedFlags && chrono.gapsAndRedFlags.length > 0
  const docCompleteness = evidenceScore >= 75 ? 'High' : evidenceScore >= 50 ? 'Moderate' : 'Low'
  const comparativeRiskLabel =
    (facts?.liability?.comparativeNegligence ?? facts?.liability?.comparative_negligence) === true
      ? 'Medium'
      : (selectedLead?.liabilityScore || 0) < 0.5
        ? 'Possible'
        : 'Low'
  const treatmentGapRisk = treatments.length === 0 ? 'High' : treatments.length === 1 ? 'Medium' : 'Low'
  const opportunityScore = Math.round(
    (valueLow && valueHigh ? 25 : 0) +
      (selectedLead?.liabilityScore || 0) * 25 +
      evidenceScore * 0.25 +
      (treatments.length >= 2 ? 25 : treatments.length === 1 ? 15 : 0),
  )
  const opportunityLabel = opportunityScore >= 70 ? 'Strong' : opportunityScore >= 40 ? 'Moderate' : 'Weak'
  const opportunityBar = Math.min(100, Math.max(0, opportunityScore))
  const nextActionKey = nextActions[0] || ''
  const nextActionContext =
    nextActionKey === 'Call plaintiff to confirm injuries'
      ? 'Call plaintiff to confirm injury details.'
      : nextActionKey === 'Request police report'
        ? 'Request police report to confirm liability.'
        : nextActionKey === 'Upload medical bills'
          ? 'Upload medical bills to strengthen case value.'
          : nextActionKey === 'Schedule consultation'
            ? 'Schedule consultation with plaintiff.'
            : nextActionKey || 'Review case and prepare demand letter.'
  const nextActionValueImpact =
    nextActionKey === 'Request police report'
      ? 10
      : nextActionKey === 'Upload medical bills'
        ? 25
        : nextActionKey === 'Schedule consultation' || nextActionKey === 'Call plaintiff to confirm injuries'
          ? 5
          : 0
  const lastTreatmentDate =
    chrono.timeline.length > 0
      ? (() => {
          const last = chrono.timeline[chrono.timeline.length - 1]
          const parts = last.split(' — ')
          return parts[0] || null
        })()
      : null
  const medianSettlement = bands?.median ?? (valueLow && valueHigh ? (valueLow + valueHigh) / 2 : 0)
  const venueState = selectedLead?.assessment?.venueState || 'California'
  const timelineEstimate = treatments.length >= 2 ? '8–14 months' : treatments.length === 1 ? '6–12 months' : '8–14 months'
  const checklistItems = [
    { label: 'Liability plausible', status: (selectedLead?.liabilityScore || 0) >= 0.5 },
    { label: 'Injury documented', status: injuries.length > 0 },
    { label: 'Treatment continuous', status: !hasGaps },
    { label: 'Police report', status: hasPolice },
  ]
  const incidentDateObj = facts?.incident?.date ? new Date(facts.incident.date) : null
  const solYears = 2
  const solDeadlineDate = incidentDateObj ? new Date(incidentDateObj.getTime() + solYears * 365 * 24 * 60 * 60 * 1000) : null
  const solYearsRemaining = solDeadlineDate ? Math.max(0, (solDeadlineDate.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000)) : null
  const solDeadlineStr = solDeadlineDate ? solDeadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
  const valueDrivers = [
    { label: 'Medical Records', impact: hasMedical ? 0 : 25 },
    { label: 'Police Report', impact: hasPolice ? 0 : 10 },
    { label: 'Wage Loss Proof', impact: 15 },
  ].filter((d) => d.impact > 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Case Opportunity Score</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-brand-700">{opportunityScore}%</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${opportunityLabel === 'Strong' ? 'bg-emerald-100 text-emerald-800' : opportunityLabel === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
                {opportunityLabel}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${opportunityBar}%` }} />
            </div>
          </div>
          <div className="text-xs text-gray-600 shrink-0">Combines value · liability · evidence · treatment</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Snapshot</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-500">Incident Date</span><p className="font-medium">{incidentDate}</p></div>
              <div><span className="text-gray-500">Jurisdiction</span><p className="font-medium">{location}</p></div>
              <div><span className="text-gray-500">Injury Summary</span><p className="font-medium">{injury}</p></div>
              <div><span className="text-gray-500">Liability Confidence</span><p className="font-medium">{Math.round((selectedLead?.liabilityScore || 0) * 100)}%</p></div>
              <div><span className="text-gray-500">Evidence Count</span><p className="font-medium">{evidenceCount}</p></div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Evidence Status</h4>
              <span className="text-xs font-medium text-gray-600">Evidence Score: {evidenceScore}%</span>
            </div>
            <div className="space-y-3">
              {evidenceList.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    {item.status ? <span className="text-green-600">✔</span> : <span className="text-gray-400">✘</span>}
                    <span className={item.status ? 'text-gray-900' : 'text-gray-500'}>{item.label}</span>
                  </div>
                  {!item.status ? (
                    <div className="flex gap-1 shrink-0">
                      {item.label === 'Police Report' || item.label === 'Medical Records' || item.label === 'Injury Photos' ? (
                        <>
                          <button onClick={() => goToSection('evidence')} className="px-2 py-1 text-xs font-medium text-brand-600 border border-brand-200 rounded hover:bg-brand-50">Request Upload</button>
                          <button onClick={() => goToSection('evidence')} className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50">Upload Manually</button>
                        </>
                      ) : null}
                      {item.label === 'Wage Loss Docs' ? (
                        <button onClick={() => goToSection('evidence')} className="px-2 py-1 text-xs font-medium text-brand-600 border border-brand-200 rounded hover:bg-brand-50">Send Upload Link</button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Value Drivers</h4>
            <div className="space-y-2 text-sm">
              {valueDrivers.length > 0 ? valueDrivers.map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-700">{d.label}</span>
                  <span className="font-medium text-emerald-600">+{d.impact}%</span>
                </div>
              )) : (
                <p className="text-gray-500 text-xs">All key documents present</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Treatment Timeline</h4>
            {timelineEntries.length > 0 ? (
              <div className="space-y-2">
                {timelineEntries.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-gray-600 font-medium shrink-0 w-24">{entry.date}</span>
                    <span className="text-gray-700">— {entry.label}</span>
                  </div>
                ))}
                {hasGaps ? (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm font-semibold text-amber-800">⚠ Treatment Gap Detected</p>
                    {lastTreatmentDate ? <p className="text-xs text-amber-700 mt-0.5">No documented treatment after {lastTreatmentDate}.</p> : null}
                    <p className="text-xs text-amber-700 mt-0.5">This may reduce settlement value.</p>
                    <button onClick={() => goToSection('evidence')} className="mt-2 px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded hover:bg-amber-200">Request Medical Records</button>
                  </div>
                ) : null}
                <p className="text-xs text-gray-500 mt-2">Continuity: {treatmentContinuity}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No treatment timeline yet</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Activity</h4>
            {activityItems.length > 0 ? (
              <div className="space-y-2 text-sm">
                {activityItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium shrink-0 w-28">{item.time}</span>
                    <span className="text-gray-700">— {item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No activity yet</p>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Next Best Action</h4>
            <p className="text-sm text-gray-700 mb-2">{nextActionContext}</p>
            {nextActionValueImpact > 0 ? <p className="text-xs text-emerald-700 mb-3">Completing this may increase case value by ~{nextActionValueImpact}%.</p> : null}
            <div className="flex gap-2">
              <button onClick={() => goToSection('evidence')} className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50">Send Upload Link</button>
              <button onClick={() => goToSection('evidence')} className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">Request Documents</button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Case Review</h4>
            <div className="space-y-2 text-sm">
              {checklistItems.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  {c.status ? <span className="text-green-600">✔</span> : <span className="text-amber-600">⚠</span>}
                  <span className={c.status ? 'text-gray-900' : 'text-gray-600'}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-brand-100 bg-brand-50/30 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Similar Cases in {venueState}</h4>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Median Settlement</span><p className="font-semibold text-brand-700">{medianSettlement ? `$${Math.round(medianSettlement).toLocaleString()}` : '—'}</p></div>
              <div><span className="text-gray-500">Range</span><p className="font-medium">{valueLow && valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : '—'}</p></div>
              <div><span className="text-gray-500">Avg Time to Settlement</span><p className="font-medium">{timelineEstimate || '8–14 months'}</p></div>
            </div>
          </div>

          {solYearsRemaining != null && solDeadlineStr ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Statute of Limitations</h4>
              <p className="text-lg font-bold text-amber-800">{solYearsRemaining >= 1 ? `${Math.floor(solYearsRemaining)} years` : `${Math.round(solYearsRemaining * 12)} months`} remaining</p>
              <p className="text-xs text-gray-600 mt-0.5">Deadline: {solDeadlineStr}</p>
            </div>
          ) : null}

          {selectedLead?.status === 'consulted' || selectedLead?.status === 'retained' ? (
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Consultation Outcome</h4>
              <p className="text-xs text-gray-500 mb-2">Log outcome for this consultation</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleStatusUpdate('retained')} className="px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-50">Interested</button>
                <button onClick={() => handleCreateContactFromCommand({ contactType: 'note', notes: 'Consultation outcome: Need more docs' })} className="px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200 rounded hover:bg-amber-50">Need more docs</button>
                <button onClick={() => handleCreateContactFromCommand({ contactType: 'note', notes: 'Consultation outcome: Declined' })} className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50">Declined</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Risk Indicators</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="p-2 rounded bg-gray-50">
            <span className="text-gray-500">Treatment gaps:</span>
            <span className={`ml-1 font-medium ${treatmentGapRisk === 'High' ? 'text-amber-700' : treatmentGapRisk === 'Medium' ? 'text-amber-600' : 'text-green-700'}`}>{treatmentGapRisk}</span>
          </div>
          <div className="p-2 rounded bg-gray-50">
            <span className="text-gray-500">Documentation:</span>
            <span className={`ml-1 font-medium ${docCompleteness === 'High' ? 'text-green-700' : docCompleteness === 'Moderate' ? 'text-amber-600' : 'text-amber-700'}`}>{docCompleteness}</span>
          </div>
          <div className="p-2 rounded bg-gray-50">
            <span className="text-gray-500">Comparative negligence:</span>
            <span className={`ml-1 font-medium ${comparativeRiskLabel === 'Low' ? 'text-green-700' : 'text-amber-600'}`}>{comparativeRiskLabel}</span>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-gray-200 overflow-hidden group">
        <summary className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span>Case Intelligence (AI)</span>
          <ChevronRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="p-4 border-t border-gray-200 text-sm text-gray-600 space-y-2">
          <div>Venue multiplier: {venueSignal}</div>
          <div>Adjuster posture: {adjuster.posture}</div>
          <div>Comparable cases: {comparableCount ?? '—'}</div>
          <div>Severity scoring: {severity.label}</div>
        </div>
      </details>
    </div>
  )
}
