/**
 * Events page - dedicated screen for upcoming consultations (not post-acceptance).
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import { useAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

export default function EventsPage() {
  const navigate = useNavigate()
  const { data, loading } = useAttorneyDashboardSummary()
  const upcomingConsults = data?.upcomingConsults ?? []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Today&apos;s events</h1>
          <p className="text-sm text-gray-500 mt-1">Upcoming consultations</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            {upcomingConsults.length > 0 ? (
              <ul className="space-y-3">
                {upcomingConsults.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-sky-50 border border-sky-100">
                    <Calendar className="h-4 w-4 text-sky-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {new Date(c.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(c.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-gray-600">{c.plaintiffName || '—'} · {(c.claimType || 'Case').replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500">{c.type === 'phone' ? 'Phone consultation' : c.type === 'video' ? 'Video' : 'In person'}</p>
                    </div>
                    {c.leadId && (
                      <button
                        onClick={() => navigate(`/attorney-dashboard/documents/${c.leadId}`)}
                        className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700 shrink-0"
                      >
                        View case
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-12">No upcoming consultations scheduled.</p>
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => navigate('/attorney-dashboard?action=scheduleConsult')}
              className="w-full py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
            >
              Schedule consultation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
