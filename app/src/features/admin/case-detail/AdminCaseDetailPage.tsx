import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardCheck, RefreshCw, Send } from 'lucide-react'
import { bulkRouteCases, getAdminAttorneyDebug, getAdminAttorneyRecommendations, getAdminAttorneys, getAdminCaseDetail, getAdminCaseRoutingState, holdCaseForManualReview, manualReviewAction } from '../../../lib/api'
import { formatCaseId } from '../../../lib/caseId'
import { BackButton, Breadcrumbs, PageHeader } from '../../shared/ui'
import CaseDocumentsPanel from './CaseDocumentsPanel'
import CaseInterventionActions from './CaseInterventionActions'
import CaseMlOutputsPanel from './CaseMlOutputsPanel'
import CasePlaintiffIntakePanel from './CasePlaintiffIntakePanel'
import CaseRecommendationsPanel from './CaseRecommendationsPanel'
import CaseRoutingAuditPanel from './CaseRoutingAuditPanel'
import CaseRoutingDiagnosticsPanel from './CaseRoutingDiagnosticsPanel'
import CaseRoutingHistoryPanel from './CaseRoutingHistoryPanel'
import CaseRoutingSimulationPanel from './CaseRoutingSimulationPanel'
import CaseRoutingStatePanel from './CaseRoutingStatePanel'
import CaseSummaryHeader from './CaseSummaryHeader'
import HoldForReviewModal from './HoldForReviewModal'
import RouteCaseModal from './RouteCaseModal'

type DetailSection = 'overview' | 'routing' | 'diagnostics'

export default function AdminCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attorneys, setAttorneys] = useState<any[]>([])
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [selectedAttorney, setSelectedAttorney] = useState('')
  const [attorneyEmail, setAttorneyEmail] = useState('')
  const [routing, setRouting] = useState(false)
  const [holding, setHolding] = useState(false)
  const [routingState, setRoutingState] = useState<any>(null)
  const [routingStateLoading, setRoutingStateLoading] = useState(false)
  const [attorneyDebug, setAttorneyDebug] = useState<any>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routingTarget, setRoutingTarget] = useState<string | null>(null)
  const [routeSuccess, setRouteSuccess] = useState<{ attorneyId: string; attorneyName: string; invitedEmail?: string } | null>(null)
  const [invitePrompt, setInvitePrompt] = useState<{ email: string; message: string } | null>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [recommendationsMeta, setRecommendationsMeta] = useState<{ eligibleCount?: number; qualifiedCount?: number; message?: string } | null>(null)
  const [interventionStatus, setInterventionStatus] = useState<string | null>(null)
  const [section, setSection] = useState<DetailSection>('overview')
  const [simulationRequest, setSimulationRequest] = useState(0)

  const loadCase = async () => {
    if (!id) return
    try {
      setLoading(true); setError(null)
      const data = await getAdminCaseDetail(id)
      setCaseData(data)
      const recommendationData = await getAdminAttorneyRecommendations(id, 5)
      setRecommendations(recommendationData.recommendations || [])
      setRecommendationsMeta({ eligibleCount: recommendationData.eligibleCount ?? recommendationData.stats?.eligibleCount, qualifiedCount: recommendationData.qualifiedCount ?? recommendationData.stats?.qualifiedCount, message: recommendationData.message })
    } catch (err: any) { setError(err.response?.data?.error || 'Failed to load case') } finally { setLoading(false) }
  }
  useEffect(() => { void loadCase() }, [id])
  useEffect(() => { if (showRouteModal) getAdminAttorneys().then((data) => setAttorneys(data.attorneys || [])) }, [showRouteModal])

  const checkRoutingState = async (email?: string) => {
    if (!id) return
    setRoutingStateLoading(true)
    try { setRoutingState(null); setRoutingState(await getAdminCaseRoutingState(id, email || attorneyEmail.trim() || undefined)); setSection('diagnostics') }
    catch (err: any) { setRoutingState({ error: err.response?.data?.error || err.message }); setSection('diagnostics') }
    finally { setRoutingStateLoading(false) }
  }
  const checkAttorneyDebug = async () => {
    const email = attorneyEmail.trim()
    if (!email) return
    try { setAttorneyDebug(null); setAttorneyDebug(await getAdminAttorneyDebug(email)) }
    catch (err: any) { setAttorneyDebug({ error: err.response?.data?.error || err.message }) }
  }
  const openRouteModal = () => { setShowRouteModal(true); setRouteError(null) }
  const handleRoute = async (targetOverride?: string, targetMeta?: { attorneyId?: string; attorneyName?: string }, inviteIfMissing = false) => {
    const target = targetOverride || attorneyEmail.trim() || selectedAttorney
    if (!id || !target) return
    const targetAttorneyId = targetMeta?.attorneyId || (target.includes('@') ? '' : target)
    const targetAttorneyName = targetMeta?.attorneyName || recommendations.find((rec) => rec.attorney.id === targetAttorneyId)?.attorney.name || attorneys.find((attorney) => attorney.id === targetAttorneyId)?.name || target
    setRouting(true); setRoutingTarget(targetAttorneyId || target); setRouteSuccess(null); setError(null); if (inviteIfMissing) setInvitePrompt(null)
    try {
      const result = await bulkRouteCases([id], target, undefined, { skipEligibilityCheck: true, inviteIfMissing })
      if (result?.requiresInvite) { setInvitePrompt({ email: result.email || target, message: result.message || 'No registered attorney uses this email.' }); setRouting(false); setRoutingTarget(null); return }
      if (result?.failed > 0 && result?.errors?.length) { setRouteError(result.errors.map((item: any) => item.error || item).join('; ')); setRouting(false); return }
      setRouteError(null)
      const inviteLabel = result?.invited?.email ? `${result.invited.email} (invited${result.invited.emailSent === false ? ' — invite email could NOT be sent' : ''})` : targetAttorneyName
      if (result?.invited?.email && result.invited.emailSent === false) setRouteError('The attorney profile was created, but the invite email could not be sent. Check the email provider configuration and notify the attorney directly.')
      setRouteSuccess({ attorneyId: targetAttorneyId || target, attorneyName: inviteLabel, invitedEmail: result?.invited?.email })
      window.setTimeout(() => { setShowRouteModal(false); setSelectedAttorney(''); setAttorneyEmail(''); setRoutingState(null); setAttorneyDebug(null); setRouteSuccess(null); setRoutingTarget(null); setInvitePrompt(null); navigate('/admin/routing-queue', { state: { routedCaseId: id, routedAttorneyId: targetAttorneyId || null, routedAttorneyName: targetAttorneyName } }) }, 900)
    } catch (err: any) { setRouteError(err.response?.data?.error || err.message || 'Failed to route') }
    finally { setRouting(false); if (!routeSuccess) setRoutingTarget(null) }
  }
  const handleHold = async (reason: string, note?: string) => {
    if (!id || !reason) return
    setHolding(true); setError(null)
    try { await holdCaseForManualReview(id, reason, note); setShowHoldModal(false); await loadCase() }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Failed to hold case') } finally { setHolding(false) }
  }
  const handleManualReviewAction = async (action: 'release' | 'request_info' | 'compliance' | 'reject') => {
    if (!id) return
    setHolding(true); setError(null); setInterventionStatus(null)
    try { await manualReviewAction(id, action, `Admin case detail action: ${action}`); setInterventionStatus(`Action completed: ${action.replace(/_/g, ' ')}`); await loadCase() }
    catch (err: any) { setError(err.response?.data?.error || err.message || 'Action failed') } finally { setHolding(false) }
  }
  const closeRouteModal = () => { setShowRouteModal(false); setAttorneyDebug(null); setRoutingState(null); setRouteError(null); setInvitePrompt(null) }
  const debugIntroduction = async (email: string) => { setAttorneyEmail(email); setRouteSuccess(null); openRouteModal(); setAttorneyDebug(null); try { setAttorneyDebug(await getAdminAttorneyDebug(email)) } catch (err: any) { setAttorneyDebug({ error: err.response?.data?.error || err.message }) } }
  const crumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Cases', to: '/admin/cases' }, { label: caseData ? formatCaseId({ id: caseData.id, claimType: caseData.claimType, createdAt: caseData.createdAt }) : 'Case' }]
  if (loading) return <div className="space-y-6"><Breadcrumbs items={crumbs} /><div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-brand-600" /></div></div>
  if (error || !caseData) return <div className="space-y-4"><Breadcrumbs items={crumbs} /><BackButton onClick={() => navigate('/admin/cases')} label="Back to cases" /><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error || 'Case not found'}</div></div>
  const facts = caseData.facts || {}
  const plaintiffContext = facts.plaintiffContext || {}
  const isGuest = (email?: string) => /^guest\+.+@caseiq\.local$/i.test(email || '')
  const hasRealAccount = !!caseData.user && !isGuest(caseData.user.email)
  const contactName = (hasRealAccount ? `${caseData.user.firstName || ''} ${caseData.user.lastName || ''}`.trim() : '') || plaintiffContext.firstName || ''
  const contactEmail = (hasRealAccount ? caseData.user.email : '') || plaintiffContext.email || ''
  const contactPhone = (hasRealAccount ? caseData.user.phone : '') || plaintiffContext.phone || ''
  const tab = (id: DetailSection, label: string) => <button key={id} type="button" onClick={() => setSection(id)} className={`rounded-lg px-4 py-2 text-sm font-medium ${section === id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
  return <div className="space-y-6"><Breadcrumbs items={crumbs} /><PageHeader title="Case detail" actions={<div className="flex items-center gap-2"><BackButton onClick={() => navigate('/admin/cases')} label="Back to cases" />{caseData.manualReviewStatus === 'pending' ? <span className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-amber-800"><ClipboardCheck className="h-4 w-4" />In manual review</span> : <button onClick={() => setShowHoldModal(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"><ClipboardCheck className="h-4 w-4" />Hold for review</button>}<button onClick={() => void checkRoutingState()} disabled={routingStateLoading} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60">{routingStateLoading ? 'Checking…' : 'Check routing state'}</button><button onClick={openRouteModal} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"><Send className="h-4 w-4" />Route case</button><button onClick={() => void loadCase()} className="p-2 text-slate-600 hover:text-slate-900"><RefreshCw className="h-4 w-4" /></button></div>} /><nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">{tab('overview', 'Overview')}{tab('routing', 'Routing')}{tab('diagnostics', 'Diagnostics')}</nav>
    {section === 'overview' && <div className="space-y-6"><CaseSummaryHeader caseData={caseData} contactName={contactName} /><CasePlaintiffIntakePanel caseData={caseData} contactName={contactName} contactEmail={contactEmail} contactPhone={contactPhone} hasRealAccount={hasRealAccount} plaintiffContext={plaintiffContext} /><CaseMlOutputsPanel caseData={caseData} /><CaseDocumentsPanel files={caseData.files} /><CaseInterventionActions caseData={caseData} holding={holding} routingStateLoading={routingStateLoading} interventionStatus={interventionStatus} onHold={() => setShowHoldModal(true)} onManualReviewAction={handleManualReviewAction} onSimulate={() => { setSimulationRequest((current) => current + 1); setSection('routing') }} onRoute={openRouteModal} onDiagnose={() => void checkRoutingState()} onDocuments={() => navigate(`/admin/documents?case=${caseData.id}`)} /></div>}
    {section === 'routing' && <div className="space-y-6"><CaseRecommendationsPanel recommendations={recommendations} recommendationsMeta={recommendationsMeta} routing={routing} routingTarget={routingTarget} routeSuccess={routeSuccess} onRoute={handleRoute} /><CaseRoutingSimulationPanel caseId={caseData.id} recommendations={recommendations} runRequest={simulationRequest} /><CaseRoutingAuditPanel entries={caseData.routingAudit} /><CaseRoutingHistoryPanel introductions={caseData.introductions} onDebug={debugIntroduction} /></div>}
    {section === 'diagnostics' && <div className="space-y-6"><CaseRoutingStatePanel routingState={routingState} onDismiss={() => setRoutingState(null)} /><CaseRoutingDiagnosticsPanel entries={caseData.routingDiagnostics} /></div>}
    {showRouteModal && <RouteCaseModal attorneys={attorneys} recommendations={recommendations} selectedAttorney={selectedAttorney} attorneyEmail={attorneyEmail} setSelectedAttorney={setSelectedAttorney} setAttorneyEmail={setAttorneyEmail} routing={routing} routingTarget={routingTarget} routeSuccess={routeSuccess} routeError={routeError} invitePrompt={invitePrompt} routingState={routingState} attorneyDebug={attorneyDebug} onRoute={handleRoute} onDebug={() => void checkAttorneyDebug()} onVerify={(email?: string) => void checkRoutingState(email)} onClose={closeRouteModal} onDismissInvite={() => setInvitePrompt(null)} />}
    {showHoldModal && <HoldForReviewModal holding={holding} onClose={() => setShowHoldModal(false)} onHold={handleHold} />}
  </div>
}
