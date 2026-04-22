import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import { getLoginRedirect } from '../lib/auth'
import { usePlaintiffSessionSummary } from '../hooks/usePlaintiffSessionSummary'

interface Assessment {
  id: string
  claimType: string
  venue: { state: string; county?: string }
  status: string
  created_at: string
}

export default function Assessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { data, loading: isLoading, error } = usePlaintiffSessionSummary(true)

  useEffect(() => {
    if (data?.assessments) {
      setAssessments(Array.isArray(data.assessments) ? data.assessments : [])
    }
    if (error) {
      setLoadError(error)
    }
  }, [data?.assessments, error])

  useEffect(() => {
    if (loadError?.toLowerCase().includes('authentication') || loadError?.toLowerCase().includes('unauthorized')) {
      navigate(getLoginRedirect('/assessments', 'plaintiff'))
    }
  }, [loadError, navigate])

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-ui-sm text-slate-600 dark:text-slate-400">Loading assessments…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-ui-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight">
          All assessments
        </h1>
        <Link to="/dashboard" className="text-ui-sm font-medium text-brand-600 hover:text-brand-800 dark:text-brand-400 link-underline">
          Back to dashboard
        </Link>
      </div>

      {loadError && (
        <ErrorBanner
          message={loadError}
          onDismiss={() => setLoadError(null)}
        />
      )}

      {assessments.length === 0 && !loadError ? (
        <EmptyState
          icon={FileText}
          title="No assessments yet"
          description="Start a free case assessment to see your reports here, or open your dashboard to continue a case in progress."
        >
          <Link
            to="/assessment/start"
            className="btn-primary text-ui-sm"
          >
            Start assessment
          </Link>
          <Link to="/dashboard" className="btn-outline text-ui-sm">
            Go to dashboard
          </Link>
        </EmptyState>
      ) : assessments.length > 0 ? (
        <div className="surface-panel overflow-hidden divide-y divide-slate-200 dark:divide-slate-700 p-0">
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 app-data-table hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
            >
              <div>
                <Link
                  to={`/results/${assessment.id}`}
                  className="font-medium text-ui-md text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {assessment.claimType.charAt(0).toUpperCase() + assessment.claimType.slice(1)} case
                </Link>
                <p className="text-ui-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {assessment.venue.state}
                  {assessment.venue.county ? `, ${assessment.venue.county}` : ''} ·{' '}
                  {new Date(assessment.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`inline-flex self-start px-2.5 py-1 text-ui-xs font-semibold rounded-full tabular-nums ${
                  assessment.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : assessment.status === 'DRAFT'
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {assessment.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
