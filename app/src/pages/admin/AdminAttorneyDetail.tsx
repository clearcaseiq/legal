import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAdminAttorneyDetail } from '../../lib/api'
import { formatDate, formatEnumLabel } from '../../lib/formatters'
import { formatSpecialty } from '../../lib/constants'
import { BackButton } from '../../features/shared/ui'
import {
  RefreshCw,
  User,
  Settings,
  BarChart3,
  FileText,
  Pause,
  Star,
} from 'lucide-react'

export default function AdminAttorneyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [attorney, setAttorney] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAttorney = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminAttorneyDetail(id)
      setAttorney(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load attorney')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttorney()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error || !attorney) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => navigate('/admin/attorneys')} label="Back to attorneys" />
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {error || 'Attorney not found'}
        </div>
      </div>
    )
  }

  const perf = attorney.performance || {}
  const profile = attorney.profile || attorney.attorneyProfile

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => navigate('/admin/attorneys')} label="Back to attorneys" />
        <button onClick={loadAttorney} className="p-2 text-slate-600 hover:text-slate-900">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="h-6 w-6" />
          Profile
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Name</p>
            <p className="font-medium">{attorney.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Firm</p>
            <p>{attorney.lawFirm?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Email</p>
            <p>{attorney.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Phone</p>
            <p>{attorney.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                attorney.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {attorney.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500">Verified</p>
            <p>{attorney.isVerified ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Average rating</p>
            <p>{typeof attorney.averageRating === 'number' ? attorney.averageRating.toFixed(1) : '0.0'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Reviews</p>
            <p>{attorney.totalReviews || 0} total</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Verified reviews</p>
            <p>{attorney.verifiedReviewCount || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Response time</p>
            <p>~{attorney.responseTimeHours ?? 24}h</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-slate-500">Jurisdictions</p>
          <p className="text-sm">
            {(() => {
              const j = profile?.jurisdictions
              const formatJurisdiction = (item: any): string => {
                if (!item) return ''
                if (typeof item === 'string') return formatEnumLabel(item)
                const state = item.state || item.name || ''
                const counties = Array.isArray(item.counties) ? item.counties.join(', ') : ''
                return counties ? `${state} (${counties})` : String(state)
              }
              if (j) {
                if (typeof j === 'string') return j
                if (Array.isArray(j)) return j.map(formatJurisdiction).filter(Boolean).join('; ') || '—'
                return formatJurisdiction(j) || '—'
              }
              if (attorney.venues) {
                return Array.isArray(attorney.venues)
                  ? attorney.venues.map((v: any) => v.state || v).join(', ')
                  : attorney.venues
              }
              return '—'
            })()}
          </p>
        </div>
        <div className="mt-2">
          <p className="text-xs text-slate-500">Case types / Specialties</p>
          <p className="text-sm">
            {Array.isArray(attorney.specialties)
              ? attorney.specialties.map((s: string) => formatSpecialty(s)).join(', ')
              : attorney.specialties
              ? formatSpecialty(attorney.specialties)
              : '—'}
          </p>
        </div>
      </div>

      {/* Performance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5" />
          Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Acceptance rate</p>
            <p className="text-lg font-semibold">{perf.acceptanceRate ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Median response time</p>
            <p className="text-lg font-semibold">{perf.medianResponseMinutes ?? 0} min</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total routed</p>
            <p className="text-lg font-semibold">{perf.totalRouted ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Accepted / Declined / Pending</p>
            <p className="text-sm">
              {perf.accepted ?? 0} / {perf.declined ?? 0} / {perf.pending ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Public trust metrics</p>
            <p className="text-sm">
              {attorney.totalReviews || 0} reviews / {attorney.verifiedReviewCount || 0} verified
            </p>
          </div>
        </div>
      </div>

      {/* Recent routed cases */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" />
          Recent routed cases (last 25)
        </h2>
        {attorney.recentCases?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500">Case ID</th>
                  <th className="text-left py-2 text-slate-500">Claim type</th>
                  <th className="text-left py-2 text-slate-500">State</th>
                  <th className="text-left py-2 text-slate-500">Status</th>
                  <th className="text-left py-2 text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {attorney.recentCases.map((c: any) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/admin/cases/${c.id}`)}
                  >
                    <td className="py-2 font-mono">{c.id?.slice(0, 8)}...</td>
                    <td className="py-2">{c.claimType ? formatSpecialty(c.claimType) : '—'}</td>
                    <td className="py-2">{c.venueState}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${
                          c.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'DECLINED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {formatEnumLabel(c.status)}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No routed cases yet</p>
        )}
      </div>

      {/* Admin actions placeholder */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900 mb-2">Admin actions</h3>
        <p className="text-sm text-slate-500">
          Edit routing profile, pause routing, boost priority, assign premium access, flag for review
          — coming in Phase 2.
        </p>
      </div>
    </div>
  )
}
