import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAdminCaseDetail, bulkRouteCases, getAdminAttorneys, holdCaseForManualReview, getAdminCaseRoutingState, getAdminAttorneyDebug, getAdminAttorneyRecommendations, runAdminRouteEngine } from '../../lib/api'
import { DECLINE_REASONS } from '../../components/DeclineModal'
import { formatCurrency, formatDate } from '../../lib/formatters'
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  User,
  BarChart3,
  FolderOpen,
  GitBranch,
  Send,
  AlertTriangle,
  ClipboardCheck,
  Star,
  CheckCircle,
  Clock,
} from 'lucide-react'

export default function AdminCaseDetail() {
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
  const [holdReason, setHoldReason] = useState('')
  const [holdNote, setHoldNote] = useState('')
  const [routing, setRouting] = useState(false)
  const [holding, setHolding] = useState(false)
  const [routingState, setRoutingState] = useState<any>(null)
  const [attorneyDebug, setAttorneyDebug] = useState<any>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routingTarget, setRoutingTarget] = useState<string | null>(null)
  const [routeSuccess, setRouteSuccess] = useState<{ attorneyId: string; attorneyName: string } | null>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [recommendationsMeta, setRecommendationsMeta] = useState<{ eligibleCount?: number; qualifiedCount?: number; message?: string } | null>(null)
  const [simulationOptions, setSimulationOptions] = useState({
    maxAttorneysPerWave: 3,
    skipPreRoutingGate: false,
  })
  const [simulationLoading, setSimulationLoading] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any | null>(null)

  const loadCase = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminCaseDetail(id)
      setCaseData(data)
      const recommendationData = await getAdminAttorneyRecommendations(id, 5)
      setRecommendations(recommendationData.recommendations || [])
      setRecommendationsMeta({
        eligibleCount: recommendationData.eligibleCount ?? recommendationData.stats?.eligibleCount,
        qualifiedCount: recommendationData.qualifiedCount ?? recommendationData.stats?.qualifiedCount,
        message: recommendationData.message,
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCase()
  }, [id])

  useEffect(() => {
    if (showRouteModal) {
      getAdminAttorneys().then((d) => setAttorneys(d.attorneys || []))
    }
  }, [showRouteModal])

  const checkRoutingState = async (email?: string) => {
    if (!id) return
    try {
      setRoutingState(null)
      const state = await getAdminCaseRoutingState(id, email || attorneyEmail.trim() || undefined)
      setRoutingState(state)
    } catch (e: any) {
      setRoutingState({ error: e.response?.data?.error || e.message })
    }
  }

  const checkAttorneyDebug = async () => {
    const email = attorneyEmail.trim()
    if (!email) return
    try {
      setAttorneyDebug(null)
      const data = await getAdminAttorneyDebug(email)
      setAttorneyDebug(data)
    } catch (e: any) {
      setAttorneyDebug({ error: e.response?.data?.error || e.message })
    }
  }

  const handleRoute = async (targetOverride?: string, targetMeta?: { attorneyId?: string; attorneyName?: string }) => {
    const target = targetOverride || attorneyEmail.trim() || selectedAttorney
    if (!id || !target) return
    const targetAttorneyId = targetMeta?.attorneyId || (target.includes('@') ? '' : target)
    const targetAttorneyName = targetMeta?.attorneyName
      || recommendations.find((rec: any) => rec.attorney.id === targetAttorneyId)?.attorney.name
      || attorneys.find((attorney: any) => attorney.id === targetAttorneyId)?.name
      || target

    setRouting(true)
    setRoutingTarget(targetAttorneyId || target)
    setRouteSuccess(null)
    setError(null)
    try {
      const result = await bulkRouteCases(
        [id],
        target,
        undefined,
        { skipEligibilityCheck: true }
      )
      if (result?.failed > 0 && result?.errors?.length) {
        const msg = result.errors.map((e: any) => e.error || e).join('; ')
        setRouteError(msg)
        setRouting(false)
        return
      }
      setRouteError(null)
      setRouteSuccess({
        attorneyId: targetAttorneyId || target,
        attorneyName: targetAttorneyName,
      })
      window.setTimeout(() => {
        setShowRouteModal(false)
        setSelectedAttorney('')
        setAttorneyEmail('')
        setRoutingState(null)
        setAttorneyDebug(null)
        setRouteSuccess(null)
        setRoutingTarget(null)
        navigate('/admin/routing-queue', {
          state: {
            routedCaseId: id,
            routedAttorneyId: targetAttorneyId || null,
            routedAttorneyName: targetAttorneyName,
          },
        })
      }, 900)
    } catch (err: any) {
      setRouteError(err.response?.data?.error || err.message || 'Failed to route')
    } finally {
      setRouting(false)
      if (!routeSuccess) {
        setRoutingTarget(null)
      }
    }
  }

  const handleHold = async () => {
    if (!id || !holdReason) return
    setHolding(true)
    setError(null)
    try {
      await holdCaseForManualReview(id, holdReason, holdNote.trim() || undefined)
      setShowHoldModal(false)
      setHoldReason('')
      setHoldNote('')
      await loadCase()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to hold case')
    } finally {
      setHolding(false)
    }
  }

  const handleRunSimulation = async () => {
    if (!id) return
    try {
      setSimulationLoading(true)
      const result = await runAdminRouteEngine(id, {
        maxAttorneysPerWave: simulationOptions.maxAttorneysPerWave,
        skipPreRoutingGate: simulationOptions.skipPreRoutingGate,
        dryRun: true,
      })
      setSimulationResult(result)
    } catch (err: any) {
      setSimulationResult({
        success: false,
        errors: [err.response?.data?.error || err.message || 'Simulation failed'],
      })
    } finally {
      setSimulationLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/admin/cases')} className="flex items-center gap-2 text-slate-600">
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </button>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error || 'Case not found'}
        </div>
      </div>
    )
  }

  const facts = caseData.facts || {}
  const incident = facts.incident || {}
  const viability = caseData.prediction?.viability || {}
  const bands = caseData.prediction?.bands || {}
  const user = caseData.user

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/cases')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </button>
        <div className="flex items-center gap-2">
          {caseData.manualReviewStatus === 'pending' ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg">
              <ClipboardCheck className="h-4 w-4" />
              In manual review
            </span>
          ) : (
            <button
              onClick={() => setShowHoldModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              <ClipboardCheck className="h-4 w-4" />
              Hold for review
            </button>
          )}
          <button
            onClick={() => checkRoutingState()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Check routing state
          </button>
          <button
            onClick={() => { setShowRouteModal(true); setRouteError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            <Send className="h-4 w-4" />
            Route case
          </button>
          <button onClick={loadCase} className="p-2 text-slate-600 hover:text-slate-900">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Case summary header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Case summary</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Case ID</p>
            <p className="font-mono text-sm">{caseData.id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Plaintiff</p>
            <p className="font-medium">
              {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Claim type</p>
            <p className="capitalize">{(caseData.claimType || '').replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Location</p>
            <p>
              {caseData.venueCounty ? `${caseData.venueCounty}, ` : ''}
              {caseData.venueState}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Incident date</p>
            <p>{incident.date || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <p>{caseData.status}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Case score</p>
            <p>
              {viability.overall != null ? `${Math.round(viability.overall * 100)}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Estimated value</p>
            <p>{bands.median ? formatCurrency(bands.median) : '—'}</p>
          </div>
        </div>
      </div>

      {routingState && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-900 mb-2">Routing state (diagnostic)</h3>
          <p className="text-xs text-amber-800 mb-2">
            Use this to verify the case was routed correctly. If introductions exist but the attorney doesn&apos;t see it, ensure they log in with the same email.
          </p>
          <pre className="text-xs overflow-auto max-h-48 p-3 bg-white rounded border border-amber-200">{JSON.stringify(routingState, null, 2)}</pre>
          <button onClick={() => setRoutingState(null)} className="mt-2 text-xs text-amber-700 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plaintiff profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            Plaintiff profile
          </h2>
          {user ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Email:</span> {user.email}
              </p>
              <p>
                <span className="text-slate-500">Phone:</span> {user.phone || '—'}
              </p>
              <p>
                <span className="text-slate-500">Account created:</span>{' '}
                {formatDate(user.createdAt)}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">No user linked</p>
          )}
        </div>

        {/* Intake responses */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" />
            Intake responses
          </h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Incident summary:</span>{' '}
              {incident.narrative?.slice(0, 200) || '—'}
              {incident.narrative?.length > 200 ? '...' : ''}
            </p>
            <p>
              <span className="text-slate-500">Incident date:</span> {incident.date || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ML outputs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" />
          ML outputs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Viability</p>
            <p>{viability.overall != null ? `${Math.round(viability.overall * 100)}%` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Settlement estimate</p>
            <p>{bands.median ? formatCurrency(bands.median) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Value range</p>
            <p>
              {bands.p25 && bands.p75
                ? `${formatCurrency(bands.p25)} – ${formatCurrency(bands.p75)}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" />
          Routing recommendations
        </h2>
        {routeSuccess && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Routed to {routeSuccess.attorneyName}. Sending you to the routing queue...
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>Eligible: {recommendationsMeta?.eligibleCount ?? recommendations.length}</span>
          <span>Qualified: {recommendationsMeta?.qualifiedCount ?? recommendations.length}</span>
          {recommendationsMeta?.message && <span>{recommendationsMeta.message}</span>}
        </div>
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.map((rec: any) => {
              const isRoutingCard = routing && routingTarget === rec.attorney.id
              const isRoutedCard = routeSuccess?.attorneyId === rec.attorney.id
              return (
              <div
                key={rec.attorney.id}
                className={`rounded-lg border p-4 ${
                  isRoutedCard ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Rank #{rec.rank}</p>
                    <p className="mt-1 font-semibold text-slate-900">{rec.attorney.name}</p>
                    <p className="text-sm text-slate-500">{rec.attorney.email || 'No email on file'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">{Math.round((rec.matchScore?.overall || 0) * 100)}%</p>
                    <p className="text-xs text-slate-500">overall</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    Fit {Math.round((rec.matchScore?.fitScore || 0) * 100)}%
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                    Trust {Math.round((rec.matchScore?.trustScore || 0) * 100)}%
                  </span>
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">
                    {rec.attorney.subscriptionTier || 'standard'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center">
                    <Star className="mr-1 h-4 w-4 text-yellow-400" />
                    {typeof rec.attorney.averageRating === 'number' ? rec.attorney.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span>{rec.attorney.totalReviews || 0} reviews</span>
                  <span className="inline-flex items-center text-emerald-700">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    {rec.attorney.verifiedReviewCount || 0} verified
                  </span>
                  <span className="inline-flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    ~{rec.attorney.responseTimeHours ?? 24}h
                  </span>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => { void handleRoute(rec.attorney.id, { attorneyId: rec.attorney.id, attorneyName: rec.attorney.name }) }}
                    disabled={routing || Boolean(routeSuccess)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                      isRoutedCard ? 'bg-emerald-600' : 'bg-brand-600 hover:bg-brand-700'
                    }`}
                  >
                    {isRoutedCard ? 'Routed' : isRoutingCard ? 'Routing...' : 'Route now'}
                  </button>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <p className="text-slate-500">No recommendation shortlist available for this case.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" />
          Routing simulation
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Dry-run the classic routing engine without creating introductions. Use this to preview candidate counts and shortlist behavior under different wave settings.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Max attorneys per wave</label>
            <input
              type="number"
              min={1}
              max={10}
              value={simulationOptions.maxAttorneysPerWave}
              onChange={(e) => setSimulationOptions((current) => ({
                ...current,
                maxAttorneysPerWave: Math.max(1, Number.parseInt(e.target.value || '1', 10)),
              }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={simulationOptions.skipPreRoutingGate}
                onChange={(e) => setSimulationOptions((current) => ({
                  ...current,
                  skipPreRoutingGate: e.target.checked,
                }))}
                className="rounded border-slate-300"
              />
              Skip pre-routing gate
            </label>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <button
              type="button"
              onClick={() => { void handleRunSimulation() }}
              disabled={simulationLoading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {simulationLoading ? 'Running simulation...' : 'Run simulation'}
            </button>
          </div>
        </div>
        {simulationResult && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Success</p>
                <p className="font-medium">{simulationResult.success ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Gate passed</p>
                <p className="font-medium">{simulationResult.gatePassed ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Eligible candidates</p>
                <p className="font-medium">{simulationResult.candidatesEligible ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Qualified candidates</p>
                <p className="font-medium">{simulationResult.candidatesQualified ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Wave size</p>
                <p className="font-medium">{simulationResult.waveSize ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Strategy</p>
                <p className="font-medium capitalize">{simulationResult.strategy || 'classic'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tier attempted</p>
                <p className="font-medium">{simulationResult.tierAttempted ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Gate reason</p>
                <p className="font-medium">{simulationResult.gateReason || '—'}</p>
              </div>
            </div>
            {Array.isArray(simulationResult.routedTo) && simulationResult.routedTo.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Simulated shortlist</p>
                <div className="flex flex-wrap gap-2">
                  {simulationResult.routedTo.map((attorneyId: string) => {
                    const rec = recommendations.find((item: any) => item.attorney.id === attorneyId)
                    return (
                      <span
                        key={attorneyId}
                        className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 border border-slate-200"
                      >
                        {rec?.attorney.name || attorneyId}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {Array.isArray(simulationResult.errors) && simulationResult.errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {simulationResult.errors.join('; ')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5" />
          Routing audit trail
        </h2>
        {Array.isArray(caseData.routingAudit) && caseData.routingAudit.length > 0 ? (
          <div className="space-y-3">
            {caseData.routingAudit.map((entry: any) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{String(entry.action || '').replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status {entry.statusCode || 'N/A'}
                      {entry.metadata?.actorEmail ? ` • ${entry.metadata.actorEmail}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
                </div>
                {entry.metadata && (
                  <div className="mt-2 text-xs text-slate-600">
                    {entry.metadata.reason && <p>Reason: {entry.metadata.reason}</p>}
                    {entry.metadata.note && <p>Note: {entry.metadata.note}</p>}
                    {entry.metadata.error && <p>Error: {entry.metadata.error}</p>}
                    {Array.isArray(entry.metadata.routedTo) && entry.metadata.routedTo.length > 0 && (
                      <p>Routed to: {entry.metadata.routedTo.join(', ')}</p>
                    )}
                    {Array.isArray(entry.metadata.attorneyIds) && entry.metadata.attorneyIds.length > 0 && (
                      <p>Attorney IDs: {entry.metadata.attorneyIds.join(', ')}</p>
                    )}
                    {typeof entry.metadata.gateReason === 'string' && entry.metadata.gateReason && (
                      <p>Gate reason: {entry.metadata.gateReason}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No routing audit entries recorded for this case yet.</p>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5" />
          Documents
        </h2>
        {caseData.files?.length > 0 ? (
          <ul className="space-y-2">
            {caseData.files.map((f: any) => (
              <li key={f.id} className="text-sm">
                {f.originalName} – {f.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No documents uploaded</p>
        )}
      </div>

      {/* Routing history */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5" />
          Routing history
        </h2>
        {caseData.introductions?.length > 0 ? (
          <div className="space-y-3">
            {caseData.introductions.map((intro: any) => (
              <div
                key={intro.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="font-medium">{intro.attorney?.name}</p>
                  <p className="text-sm text-slate-500">
                    Wave {intro.waveNumber} • {intro.status} • {formatDate(intro.createdAt)}
                  </p>
                  {intro.declineReason && (
                    <p className="text-sm text-amber-600 mt-1">
                      Reason:{' '}
                      {DECLINE_REASONS.find((r) => r.value === intro.declineReason)?.label ??
                        intro.declineReason}
                    </p>
                  )}
                </div>
                {intro.attorney?.email && (
                  <button
                    onClick={async () => {
                      setAttorneyEmail(intro.attorney.email)
                      setRouteSuccess(null)
                      setShowRouteModal(true)
                      setAttorneyDebug(null)
                      setRouteError(null)
                      try {
                        const data = await getAdminAttorneyDebug(intro.attorney.email)
                        setAttorneyDebug(data)
                      } catch (e: any) {
                        setAttorneyDebug({ error: e.response?.data?.error || e.message })
                      }
                    }}
                    className="text-xs text-amber-600 hover:text-amber-800 hover:underline"
                    title="Debug why case doesn't show on dashboard"
                  >
                    Debug
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No routing activity yet</p>
        )}
      </div>

      {/* Route modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Route case to attorney</h3>
            {routeSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Routed to {routeSuccess.attorneyName}. Sending you to the routing queue...
              </div>
            )}
            {recommendations.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-medium text-slate-700 mb-2">Recommended shortlist</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {recommendations.map((rec: any) => {
                    const isSelected = selectedAttorney === rec.attorney.id
                    const isRoutingCard = routing && routingTarget === rec.attorney.id
                    const isRoutedCard = routeSuccess?.attorneyId === rec.attorney.id
                    return (
                      <div
                        key={rec.attorney.id}
                        onClick={() => {
                          setSelectedAttorney(rec.attorney.id)
                          setAttorneyEmail('')
                        }}
                        className={`rounded-lg border p-4 text-left transition ${
                          isRoutedCard
                            ? 'border-emerald-300 bg-emerald-50/60'
                            : isSelected
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Rank #{rec.rank}</p>
                            <p className="mt-1 font-semibold text-slate-900">{rec.attorney.name}</p>
                            <p className="text-sm text-slate-500">{rec.attorney.email || 'No email on file'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-slate-900">{Math.round((rec.matchScore?.overall || 0) * 100)}%</p>
                            <p className="text-xs text-slate-500">overall</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            Fit {Math.round((rec.matchScore?.fitScore || 0) * 100)}%
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            Trust {Math.round((rec.matchScore?.trustScore || 0) * 100)}%
                          </span>
                          <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">
                            {rec.attorney.subscriptionTier || 'standard'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center">
                            <Star className="mr-1 h-4 w-4 text-yellow-400" />
                            {typeof rec.attorney.averageRating === 'number' ? rec.attorney.averageRating.toFixed(1) : '0.0'}
                          </span>
                          <span>{rec.attorney.totalReviews || 0} reviews</span>
                          <span className="inline-flex items-center text-emerald-700">
                            <CheckCircle className="mr-1 h-4 w-4" />
                            {rec.attorney.verifiedReviewCount || 0} verified
                          </span>
                          <span className="inline-flex items-center">
                            <Clock className="mr-1 h-4 w-4" />
                            ~{rec.attorney.responseTimeHours ?? 24}h
                          </span>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRoute(rec.attorney.id, { attorneyId: rec.attorney.id, attorneyName: rec.attorney.name })
                            }}
                            disabled={routing || Boolean(routeSuccess)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                              isRoutedCard ? 'bg-emerald-600' : 'bg-brand-600 hover:bg-brand-700'
                            }`}
                          >
                            {isRoutedCard ? 'Routed' : isRoutingCard ? 'Routing...' : 'Route now'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <label className="block text-sm font-medium text-slate-700 mb-1">Recommended attorney or fallback list</label>
            <select
              value={selectedAttorney}
              onChange={(e) => { setSelectedAttorney(e.target.value); setAttorneyEmail('') }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
            >
              <option value="">Select attorney</option>
              {attorneys.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.lawFirm?.name ? `(${a.lawFirm.name})` : ''} — {a.email}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-slate-700 mb-1">Or enter attorney email</label>
            <input
              type="email"
              value={attorneyEmail}
              onChange={(e) => { setAttorneyEmail(e.target.value); setSelectedAttorney('') }}
              placeholder="e.g. aaron.gomez31@lawfirm.com"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-3"
            />
            <p className="text-xs text-slate-500 mb-3">Pick from the ranked shortlist above, use the full attorney list, or type an email override.</p>
                {routingState && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs font-mono overflow-auto max-h-40">
                    <pre>{JSON.stringify(routingState, null, 2)}</pre>
                  </div>
                )}
                {attorneyDebug && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono overflow-auto max-h-48">
                    <p className="font-semibold text-amber-800 mb-1">Attorney dashboard debug</p>
                    <pre>{JSON.stringify(attorneyDebug, null, 2)}</pre>
                  </div>
                )}
                {routeError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {routeError}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={checkAttorneyDebug}
                disabled={!attorneyEmail.trim()}
                className="px-4 py-2 text-sm text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                title="Why doesn't this show on attorney dashboard?"
              >
                Debug attorney
              </button>
              <button
                onClick={() => checkRoutingState(attorneyEmail.trim() || undefined)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Verify routing
              </button>
              <button
                onClick={() => { setShowRouteModal(false); setAttorneyDebug(null); setRoutingState(null); setRouteError(null); }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleRoute() }}
                disabled={(!selectedAttorney && !attorneyEmail.trim()) || routing}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {routing ? 'Routing...' : 'Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold for manual review modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Hold for manual review</h3>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
            <select
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
            >
              <option value="">Select reason</option>
              <option value="low_confidence">Low confidence</option>
              <option value="duplicate">Duplicate</option>
              <option value="conflicting_facts">Conflicting facts</option>
              <option value="suspicious_documents">Suspicious documents</option>
              <option value="near_sol">Near SOL</option>
              <option value="unsupported_jurisdiction">Unsupported jurisdiction</option>
              <option value="premium_case">Premium case review</option>
              <option value="ocr_failure">OCR failure</option>
            </select>
            <label className="block text-sm font-medium text-slate-700 mb-2">Note (optional)</label>
            <textarea
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              placeholder="Internal note for reviewers..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4 min-h-[80px]"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleHold}
                disabled={!holdReason || holding}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {holding ? 'Holding...' : 'Hold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
