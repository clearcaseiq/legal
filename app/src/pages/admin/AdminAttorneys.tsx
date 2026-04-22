import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminAttorneys } from '../../lib/api'
import { RefreshCw, ExternalLink, Users, Star, CheckCircle, Clock } from 'lucide-react'

export default function AdminAttorneys() {
  const navigate = useNavigate()
  const [attorneys, setAttorneys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadAttorneys = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminAttorneys()
      setAttorneys(data.attorneys || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load attorneys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAttorneys()
  }, [loadAttorneys])

  const filtered = attorneys.filter((a) => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (
      a.name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.lawFirm?.name?.toLowerCase().includes(s) ||
      (a.specialties && Array.isArray(a.specialties) && a.specialties.some((sp: string) => sp.toLowerCase().includes(s)))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Attorneys</h1>
        <button
          onClick={loadAttorneys}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search by name, email, firm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
        />
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Attorney / Firm
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    States / Counties
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Case types
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Tier
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/admin/attorneys/${a.id}`)}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-sm text-slate-500">{a.lawFirm?.name || '—'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center">
                          <Star className="mr-1 h-3 w-3 text-yellow-400" />
                          {typeof a.averageRating === 'number' ? a.averageRating.toFixed(1) : '0.0'}
                        </span>
                        <span>{a.totalReviews || 0} reviews</span>
                        <span className="inline-flex items-center text-emerald-700">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {a.verifiedReviewCount || 0} verified
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {Array.isArray(a.venues)
                        ? a.venues.slice(0, 2).map((v: any) => v.state || v).join(', ')
                        : typeof a.venues === 'string'
                        ? a.venues
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {Array.isArray(a.specialties)
                        ? a.specialties.slice(0, 2).join(', ')
                        : a.specialties || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {a.subscriptionTier || a.profile?.subscriptionTier || 'Standard'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          a.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="mt-2 flex items-center text-xs text-slate-500">
                        <Clock className="mr-1 h-3 w-3" />
                        ~{a.responseTimeHours ?? 24}h response
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/attorneys/${a.id}`)
                        }}
                        className="text-brand-600 hover:text-brand-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500">No attorneys found</div>
          )}
        </div>
      )}
    </div>
  )
}
