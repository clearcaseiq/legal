import { useEffect, useState } from 'react'
import type {
  AttorneyDashboardLead,
  AttorneyDashboardLeadAnalysis,
  AttorneyDashboardLeadFacts,
} from './attorneyDashboardShared'
import { formatCurrency } from '../lib/formatters'
import { getLeadTreatmentSummary } from '../lib/api'

type AttorneyDashboardWorkstreamDemandProps = {
  selectedLead: AttorneyDashboardLead
  selectedLeadFacts: AttorneyDashboardLeadFacts
  selectedLeadAnalysis: AttorneyDashboardLeadAnalysis
  handleDraftDemandLetter: any
  handleViewLatestDraft: any
  handleDownloadDemandDocx: any
  demandDraftLoading: boolean
  demandDraftId: string | null
  demandDraftMessage: string | null
  demandDraftContent: string | null
  leadCommandCenter?: any
}

export default function AttorneyDashboardWorkstreamDemand({
  selectedLead,
  selectedLeadFacts,
  selectedLeadAnalysis,
  handleDraftDemandLetter,
  handleViewLatestDraft,
  handleDownloadDemandDocx,
  demandDraftLoading,
  demandDraftId,
  demandDraftMessage,
  demandDraftContent,
  leadCommandCenter,
}: AttorneyDashboardWorkstreamDemandProps) {
  const analysis = (selectedLeadAnalysis || {}) as any
  const facts: any = selectedLeadFacts || {}
  const damages = facts?.damages || {}
  const injuries = Array.isArray(facts?.injuries) ? facts.injuries : []
  const treatments = Array.isArray(facts?.treatment) ? facts.treatment : []
  const filesCount = Array.isArray(selectedLead?.assessment?.files) ? selectedLead.assessment.files.length : 0
  const demandReady = leadCommandCenter
    ? leadCommandCenter.readiness.score >= 70 && leadCommandCenter.missingItems.length <= 1
    : filesCount >= 2 || (treatments.length > 0 && injuries.length > 0)
  const assessmentId = selectedLead.assessment?.id

  // Live medical specials from the logged treatment ledger (preferred over the
  // self-reported facts figure when records exist).
  const [ledgerBilled, setLedgerBilled] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    const leadId = selectedLead?.id
    if (!leadId) {
      setLedgerBilled(null)
      return
    }
    getLeadTreatmentSummary(leadId)
      .then((res) => {
        if (active) setLedgerBilled(res?.summary?.totalBilled ?? 0)
      })
      .catch(() => {
        if (active) setLedgerBilled(null)
      })
    return () => {
      active = false
    }
  }, [selectedLead?.id])

  const damagesBreakdown = buildDamagesBreakdown(damages, analysis, ledgerBilled)

  return (
    <>
      <div className="rounded-md border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Demand Package</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Availability</div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-gray-900">{demandReady ? 'Demand-ready' : 'Needs docs'}</span>
              {demandReady && assessmentId ? (
                <>
                  <button
                    onClick={() => handleDraftDemandLetter(assessmentId)}
                    disabled={demandDraftLoading}
                    className="px-2 py-1 text-xs font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
                  >
                    {demandDraftLoading ? 'Drafting…' : 'Draft demand letter'}
                  </button>
                  <button
                    onClick={() => handleViewLatestDraft(assessmentId)}
                    disabled={demandDraftLoading}
                    className="px-2 py-1 text-xs font-medium text-brand-700 border border-brand-200 rounded-md hover:bg-brand-50 disabled:opacity-50"
                  >
                    View draft
                  </button>
                  {demandDraftId ? (
                    <button
                      onClick={handleDownloadDemandDocx}
                      disabled={demandDraftLoading}
                      className="px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Download Word
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
            {demandDraftMessage ? (
              <div className="mt-1 text-xs text-gray-500">{demandDraftMessage}</div>
            ) : null}
            {demandDraftContent ? (
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-700">
                {demandDraftContent}
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-gray-500">Estimated Strength Score</div>
            <div className="text-gray-900">{selectedLead ? `${Math.round((selectedLead.viabilityScore ?? 0) * 100)}%` : 'N/A'}</div>
          </div>
        </div>
        {leadCommandCenter ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-gray-100 bg-slate-50 p-3">
              <div className="text-gray-500">Demand readiness</div>
              <div className="text-gray-900 font-medium">{leadCommandCenter.readiness.score}% • {leadCommandCenter.readiness.label}</div>
            </div>
            <div className="rounded-md border border-gray-100 bg-slate-50 p-3">
              <div className="text-gray-500">Primary blocker</div>
              <div className="text-gray-900 font-medium">
                {leadCommandCenter.missingItems[0]?.label || leadCommandCenter.defenseRisks[0]?.title || 'No major blocker'}
              </div>
            </div>
            <div className="rounded-md border border-gray-100 bg-slate-50 p-3">
              <div className="text-gray-500">Negotiation posture</div>
              <div className="text-gray-900 font-medium">{leadCommandCenter.negotiationSummary.eventCount > 0 ? 'Already active' : 'Pre-negotiation'}</div>
            </div>
          </div>
        ) : null}
        {leadCommandCenter?.missingItems?.length ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="font-medium text-amber-900">Close these blockers before finalizing demand</div>
            <div className="mt-2 space-y-1 text-amber-800">
              {leadCommandCenter.missingItems.slice(0, 3).map((item: any) => (
                <div key={item.key}>• {item.label}: {item.plaintiffReason}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="rounded-md border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Damages Breakdown</h4>
        <p className="text-xs text-gray-500 mb-3">
          Specials vs. general damages, matching the demand letter. Medical specials are itemized from logged
          treatment records when available.
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              Medical specials
              {damagesBreakdown.medicalFromLedger ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  from logged records
                </span>
              ) : null}
            </span>
            <span className="text-gray-900">
              {damagesBreakdown.medical > 0 ? formatCurrency(damagesBreakdown.medical) : '—'}
            </span>
          </div>
          <BreakdownRow label="Lost wages" value={damagesBreakdown.wages} />
          {damagesBreakdown.futureMedical > 0 ? (
            <BreakdownRow label="Future medical" value={damagesBreakdown.futureMedical} />
          ) : null}
          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
            <span className="text-gray-600">Total economic specials</span>
            <span className="font-medium text-gray-900">{formatCurrency(damagesBreakdown.specials)}</span>
          </div>
          <BreakdownRow label="Pain &amp; suffering (general)" value={damagesBreakdown.general} />
          <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-1">
            <span className="font-semibold text-gray-900">Total demand</span>
            <span className="font-semibold text-gray-900">{formatCurrency(damagesBreakdown.demand)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">Reconciliation (specials + general)</span>
            <span
              className={`text-xs font-medium ${
                damagesBreakdown.reconciles ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {formatCurrency(damagesBreakdown.specials + damagesBreakdown.general)}
              {damagesBreakdown.reconciles ? ' ✓' : ' (review)'}
            </span>
          </div>
        </div>
      </div>
      {(() => {
        const draft = analysis?.demandPackage?.demandDraft?.trim() || ''
        const aiSummary = analysis?.demandPackage?.damageSummary?.trim() || ''
        const currentDamageSummary = buildCurrentDamageSummary(damages)
        const summary = summaryContradictsDamages(aiSummary, damages) ? currentDamageSummary : aiSummary || currentDamageSummary
        const outline = analysis?.demandPackage?.liabilityOutline?.trim() || ''
        const hasDraft = draft.length >= 50 && !['n/a', 'na', 'not available', 'not available.'].includes(draft.toLowerCase())
        const hasSummary = summary.length > 0 && !['n/a', 'na', 'not available', 'not available.'].includes(summary.toLowerCase())
        const hasOutline = outline.length > 0 && !['n/a', 'na', 'not available', 'not available.'].includes(outline.toLowerCase())

        if (!hasDraft && !hasSummary && !hasOutline && !analysis?.demandPackage?.attorneyEditable) {
          return null
        }

        return (
          <div className="rounded-md border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Demand Package (AI Draft)</h4>
            <div className="space-y-3 text-sm">
              {hasDraft ? (
                <>
                  <div className="text-gray-500">Demand Letter Draft</div>
                  <div className="text-gray-900">{draft}</div>
                </>
              ) : null}
              {hasSummary ? (
                <>
                  <div className="text-gray-500">Damage Summary</div>
                  <div className="text-gray-900">{summary}</div>
                </>
              ) : null}
              {hasOutline ? (
                <>
                  <div className="text-gray-500">Liability Argument Outline</div>
                  <div className="text-gray-900">{outline}</div>
                </>
              ) : null}
              {analysis?.demandPackage?.attorneyEditable ? (
                <>
                  <div className="text-gray-500">Editable Attorney-ready Format</div>
                  <div className="text-gray-900">Available</div>
                </>
              ) : null}
            </div>
          </div>
        )
      })()}
    </>
  )
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900">{value > 0 ? formatCurrency(value) : '—'}</span>
    </div>
  )
}

// Mirror the demand letter's specials-vs-general math so the attorney sees the
// same breakdown on screen. General (pain & suffering) damages are the demand
// less economic specials, falling back to the analysis valuation split.
function buildDamagesBreakdown(damages: any, analysis: any, ledgerBilled?: number | null) {
  const reportedMedical = Number(damages?.med_charges || damages?.estimated_med_charges || 0)
  const ledgerMedical = Number(ledgerBilled || 0)
  const medical = ledgerMedical > 0 ? ledgerMedical : reportedMedical
  const medicalFromLedger = ledgerMedical > 0
  const wages = Number(damages?.wage_loss || damages?.estimated_wage_loss || 0)
  const futureMedical = Number(damages?.estimated_future_med_charges || 0)
  const specials = medical + wages + futureMedical

  const demand = Number(
    analysis?.expectedSettlementRange?.mid ??
      analysis?.estimatedValue?.medium ??
      analysis?.estimatedValue?.mid ??
      0
  )
  const painSufferingSplit = Number(analysis?.valuationBreakdown?.damageSplits?.painSuffering || 0)
  const general = demand > specials ? demand - specials : painSufferingSplit

  const reconciles = demand > 0 && Math.abs(specials + general - demand) <= Math.max(1, demand * 0.02)

  return { medical, medicalFromLedger, wages, futureMedical, specials, general, demand, reconciles }
}

function buildCurrentDamageSummary(damages: any) {
  const medicalCharges = Number(damages?.med_charges || damages?.estimated_med_charges || 0)
  const wageLoss = Number(damages?.wage_loss || damages?.estimated_wage_loss || 0)
  const outOfPocket = Number(damages?.estimated_out_of_pocket || 0)
  const futureMedical = Number(damages?.estimated_future_med_charges || 0)
  const parts = [
    medicalCharges > 0 ? `medical charges of ${formatCurrency(medicalCharges)}` : null,
    wageLoss > 0 ? `wage loss of ${formatCurrency(wageLoss)}` : null,
    outOfPocket > 0 ? `out-of-pocket expenses of ${formatCurrency(outOfPocket)}` : null,
    futureMedical > 0 ? `future medical estimates of ${formatCurrency(futureMedical)}` : null,
  ].filter(Boolean)

  return parts.length > 0
    ? `Current damages include ${parts.join(', ')}. Pain and suffering should be evaluated in addition to these economic damages.`
    : ''
}

function summaryContradictsDamages(summary: string, damages: any) {
  if (!summary || !buildCurrentDamageSummary(damages)) return false
  const lower = summary.toLowerCase()
  return (
    lower.includes('no reported medical charges') ||
    lower.includes('no reported medical expenses') ||
    lower.includes('no reported wage loss') ||
    lower.includes('no reported medical charges or wage loss')
  )
}
