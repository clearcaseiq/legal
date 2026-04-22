import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Users, DollarSign, AlertTriangle, Star, Building2, ArrowLeft, Plus } from 'lucide-react'
import { addFirmAttorney, updateFirmAttorney } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { US_STATES } from '../lib/constants'
import { invalidateFirmDashboardSummary, useFirmDashboardSummary } from '../hooks/useFirmDashboardSummary'

const CASE_TYPES = [
  { value: 'auto', label: 'Auto Accident' },
  { value: 'slip_and_fall', label: 'Slip-and-Fall' },
  { value: 'dog_bite', label: 'Dog Bite' },
  { value: 'medmal', label: 'Medical Malpractice' },
  { value: 'product', label: 'Product Liability' },
  { value: 'nursing_home_abuse', label: 'Nursing Home Abuse' },
  { value: 'wrongful_death', label: 'Wrongful Death' },
  { value: 'high_severity_surgery', label: 'High-Severity / Surgery' }
]

interface FirmDashboardData {
  firm: {
    id: string
    name: string
    slug?: string | null
    primaryEmail?: string | null
    phone?: string | null
    website?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
  }
  metrics: {
    attorneyCount: number
    totalLeadsReceived: number
    totalLeadsAccepted: number
    feesCollectedFromPayments: number
    totalPlatformSpend: number
    avgAttorneyRating: number
    totalReviews: number
    verifiedReviewCount: number
    firmROI: number | null
  }
  attorneys: Array<{
    id: string
    name: string
    email: string | null
    isVerified: boolean
    responseTimeHours: number
    averageRating: number
    totalReviews: number
    verifiedReviewCount: number
    subscriptionTier: string | null
    specialties: string[]
    jurisdictions: Array<{ state: string; counties?: string[] }>
    dashboard: {
      totalLeadsReceived: number
      totalLeadsAccepted: number
      feesCollectedFromPayments: number
      totalPlatformSpend: number
    } | null
  }>
}

export default function FirmDashboard() {
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [newAttorney, setNewAttorney] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    specialties: [] as string[],
    jurisdictions: [] as string[]
  })
  const [stateSearchQuery, setStateSearchQuery] = useState('')
  const [editingAttorneyId, setEditingAttorneyId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editStateSearch, setEditStateSearch] = useState('')
  const [editAttorney, setEditAttorney] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    specialties: [] as string[],
    jurisdictions: [] as string[]
  })
  const navigate = useNavigate()
  const { data, loading, error } = useFirmDashboardSummary()

  const toggleAttorneyArrayValue = (key: 'specialties' | 'jurisdictions', value: string) => {
    setNewAttorney(prev => {
      const current = prev[key]
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value]
      }
    })
  }

  const toggleEditArrayValue = (key: 'specialties' | 'jurisdictions', value: string) => {
    setEditAttorney(prev => {
      const current = prev[key]
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value]
      }
    })
  }

  const startEditAttorney = (attorney: FirmDashboardData['attorneys'][number]) => {
    const nameParts = (attorney.name || '').trim().split(/\s+/).filter(Boolean)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''

    setEditingAttorneyId(attorney.id)
    setEditError(null)
    setEditStateSearch('')
    setEditAttorney({
      firstName,
      middleName,
      lastName,
      specialties: Array.isArray(attorney.specialties) ? attorney.specialties : [],
      jurisdictions: Array.isArray(attorney.jurisdictions)
        ? attorney.jurisdictions.map(j => j.state)
        : []
    })
  }

  const handleSaveEditAttorney = async () => {
    if (!editingAttorneyId) return
    setEditError(null)
    if (editAttorney.specialties.length === 0) {
      setEditError('Please select at least one specialty.')
      return
    }
    if (editAttorney.jurisdictions.length === 0) {
      setEditError('Please select at least one jurisdiction.')
      return
    }
    try {
      setEditSaving(true)
      await updateFirmAttorney(editingAttorneyId, {
        firstName: editAttorney.firstName.trim() || undefined,
        middleName: editAttorney.middleName.trim() || undefined,
        lastName: editAttorney.lastName.trim() || undefined,
        specialties: editAttorney.specialties,
        venues: editAttorney.jurisdictions,
        jurisdictions: editAttorney.jurisdictions.map(state => ({ state }))
      })
      setEditingAttorneyId(null)
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update attorney.'
      setEditError(message)
    } finally {
      setEditSaving(false)
    }
  }

  const handleAddAttorney = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(null)
    if (!newAttorney.email.trim()) {
      setAddError('Attorney email is required.')
      return
    }
    if (newAttorney.specialties.length === 0) {
      setAddError('Please select at least one specialty.')
      return
    }
    if (newAttorney.jurisdictions.length === 0) {
      setAddError('Please select at least one jurisdiction.')
      return
    }
    try {
      setAdding(true)
      await addFirmAttorney({
        email: newAttorney.email.trim(),
        firstName: newAttorney.firstName.trim() || undefined,
        middleName: newAttorney.middleName.trim() || undefined,
        lastName: newAttorney.lastName.trim() || undefined,
        specialties: newAttorney.specialties,
        venues: newAttorney.jurisdictions,
        jurisdictions: newAttorney.jurisdictions.map(state => ({ state }))
      })
      setAddSuccess('Attorney added to firm.')
      setNewAttorney({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        specialties: [],
        jurisdictions: []
      })
      setStateSearchQuery('')
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to add attorney.'
      setAddError(message)
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading firm dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { firm, metrics, attorneys } = data

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="inline-flex items-center text-sm text-brand-600 hover:text-brand-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Attorney Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-brand-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{firm.name}</h1>
            <p className="text-sm text-gray-600">
              {firm.city && firm.state ? `${firm.city}, ${firm.state}` : 'Firm Dashboard'}
            </p>
            {firm.website && (
              <a
                href={firm.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-600 hover:text-brand-500"
              >
                {firm.website}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Attorneys in Firm</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.attorneyCount}</p>
            </div>
            <Users className="h-8 w-8 text-brand-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Leads Received</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.totalLeadsReceived}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Fees Collected</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(metrics.feesCollectedFromPayments)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Attorney Rating</p>
              <div className="mt-1 flex items-center">
                <Star className="h-5 w-5 text-yellow-400 mr-1" />
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.avgAttorneyRating ? metrics.avgAttorneyRating.toFixed(1) : 'N/A'}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.totalReviews} total reviews • {metrics.verifiedReviewCount} verified reviews
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Attorneys table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Firm Attorneys</h2>
            <p className="text-sm text-gray-500">
              {attorneys.length} attorney{attorneys.length !== 1 ? 's' : ''} in this firm
            </p>
          </div>
          <form onSubmit={handleAddAttorney} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={newAttorney.firstName}
              onChange={(e) => setNewAttorney({ ...newAttorney, firstName: e.target.value })}
              placeholder="First name"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm"
            />
            <input
              type="text"
              value={newAttorney.middleName}
              onChange={(e) => setNewAttorney({ ...newAttorney, middleName: e.target.value })}
              placeholder="Middle name"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm"
            />
            <input
              type="text"
              value={newAttorney.lastName}
              onChange={(e) => setNewAttorney({ ...newAttorney, lastName: e.target.value })}
              placeholder="Last name"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm"
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              {adding ? 'Adding…' : 'Add Attorney'}
            </button>
          </form>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="email"
              value={newAttorney.email}
              onChange={(e) => setNewAttorney({ ...newAttorney, email: e.target.value })}
              placeholder="Attorney email"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm sm:col-span-3"
              required
            />
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialties *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CASE_TYPES.map(type => (
                <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAttorney.specialties.includes(type.value)}
                    onChange={() => toggleAttorneyArrayValue('specialties', type.value)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jurisdictions (States) *
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({newAttorney.jurisdictions.length} selected)
              </span>
            </label>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search states by name or code..."
                value={stateSearchQuery}
                onChange={(e) => setStateSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div className="border border-gray-200 rounded-lg p-4 max-h-72 overflow-y-auto bg-gray-50">
              {US_STATES.filter(state => {
                const query = stateSearchQuery.toLowerCase()
                return (
                  state.code.toLowerCase().includes(query) ||
                  state.name.toLowerCase().includes(query)
                )
              }).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No states found matching your search</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {US_STATES
                    .filter(state => {
                      const query = stateSearchQuery.toLowerCase()
                      return (
                        state.code.toLowerCase().includes(query) ||
                        state.name.toLowerCase().includes(query)
                      )
                    })
                    .map(state => (
                      <label
                        key={state.code}
                        className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-all ${
                          newAttorney.jurisdictions.includes(state.code)
                            ? 'bg-brand-50 border-2 border-brand-300 shadow-sm'
                            : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newAttorney.jurisdictions.includes(state.code)}
                          onChange={() => toggleAttorneyArrayValue('jurisdictions', state.code)}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 focus:ring-2"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-gray-700 font-medium">{state.code}</span>
                          <span className="text-xs text-gray-500 truncate">{state.name}</span>
                        </div>
                      </label>
                    ))}
                </div>
              )}
            </div>
          </div>
          {addError && (
            <p className="mt-2 text-sm text-red-600">{addError}</p>
          )}
          {addSuccess && (
            <p className="mt-2 text-sm text-green-600">{addSuccess}</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attorney</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jurisdictions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attorneys.map((attorney: any) => (
                <tr key={attorney.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{attorney.name}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {attorney.subscriptionTier || 'pay-per-case'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {attorney.isVerified ? 'Verified' : 'Unverified'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>{attorney.email || 'N/A'}</div>
                    <div className="text-xs text-gray-500">
                      Response: ~{attorney.responseTimeHours}h
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {attorney.specialties.slice(0, 4).map((s: string) => (
                        <span
                          key={s}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700"
                        >
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {attorney.specialties.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{attorney.specialties.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs">
                    <div className="space-y-1">
                      {attorney.jurisdictions.slice(0, 2).map((j: any, idx: number) => (
                        <div key={idx}>
                          {j.counties && j.counties.length > 0
                            ? `${j.counties.join(', ')}, ${j.state}`
                            : j.state}
                        </div>
                      ))}
                      {attorney.jurisdictions.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{attorney.jurisdictions.length - 2} more
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{attorney.averageRating.toFixed(1)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {attorney.totalReviews} reviews • {attorney.verifiedReviewCount} verified
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {attorney.dashboard ? (
                      <>
                        <div>Received: {attorney.dashboard.totalLeadsReceived}</div>
                        <div>Accepted: {attorney.dashboard.totalLeadsAccepted}</div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No data</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    <button
                      type="button"
                      onClick={() => startEditAttorney(attorney)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingAttorneyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Attorney</h3>
              <button
                type="button"
                onClick={() => setEditingAttorneyId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={editAttorney.firstName}
                  onChange={(e) => setEditAttorney({ ...editAttorney, firstName: e.target.value })}
                  placeholder="First name"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm"
                />
                <input
                  type="text"
                  value={editAttorney.middleName}
                  onChange={(e) => setEditAttorney({ ...editAttorney, middleName: e.target.value })}
                  placeholder="Middle name"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm"
                />
                <input
                  type="text"
                  value={editAttorney.lastName}
                  onChange={(e) => setEditAttorney({ ...editAttorney, lastName: e.target.value })}
                  placeholder="Last name"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialties *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CASE_TYPES.map(type => (
                    <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editAttorney.specialties.includes(type.value)}
                        onChange={() => toggleEditArrayValue('specialties', type.value)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jurisdictions (States) *
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({editAttorney.jurisdictions.length} selected)
                  </span>
                </label>
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search states by name or code..."
                    value={editStateSearch}
                    onChange={(e) => setEditStateSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
                  {US_STATES.filter(state => {
                    const query = editStateSearch.toLowerCase()
                    return (
                      state.code.toLowerCase().includes(query) ||
                      state.name.toLowerCase().includes(query)
                    )
                  }).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No states found matching your search</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {US_STATES
                        .filter(state => {
                          const query = editStateSearch.toLowerCase()
                          return (
                            state.code.toLowerCase().includes(query) ||
                            state.name.toLowerCase().includes(query)
                          )
                        })
                        .map(state => (
                          <label
                            key={state.code}
                            className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-all ${
                              editAttorney.jurisdictions.includes(state.code)
                                ? 'bg-brand-50 border-2 border-brand-300 shadow-sm'
                                : 'hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={editAttorney.jurisdictions.includes(state.code)}
                              onChange={() => toggleEditArrayValue('jurisdictions', state.code)}
                              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 focus:ring-2"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-gray-700 font-medium">{state.code}</span>
                              <span className="text-xs text-gray-500 truncate">{state.name}</span>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {editError && (
                <p className="text-sm text-red-600">{editError}</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingAttorneyId(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditAttorney}
                disabled={editSaving}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

