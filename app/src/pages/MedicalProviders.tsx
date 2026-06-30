import { useState, useEffect } from 'react'
import {
  MapPin,
  Phone,
  Mail,
  Star,
  Shield,
  DollarSign,
  Clock,
  Search,
  Plus,
  Eye,
  Calendar,
  TrendingUp,
  CheckCircle,
  FileText,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Activity,
  Receipt,
  Loader2,
} from 'lucide-react'
import Tooltip from '../components/Tooltip'
import {
  getMedicalProviderDirectory,
  getProviderReferrals,
  createProviderReferral,
  updateProviderReferral,
  getAttorneyFilteredLeads,
  generateReferralLetterOfProtection,
  getReferralLetterOfProtection,
  sendLetterOfProtection,
  getReferralTreatmentRecords,
  createReferralTreatmentRecord,
  deleteTreatmentRecord,
  type TreatmentRecordInput,
} from '../lib/api'

interface MedicalProvider {
  id: string
  name: string
  specialty: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  acceptsLien: boolean
  lienTerms: any
  averageLienRate: number
  isVerified: boolean
  rating: number
  totalReviews: number
  serviceRadius: number
}

interface LetterOfProtection {
  id: string
  status: string
  sentAt: string | null
  content: string
  lienHolderId: string | null
}

interface ProviderReferral {
  id: string
  providerId: string
  leadId: string
  referralType: string
  status: string
  referralDate: string
  notes: string
  provider: MedicalProvider
  lead?: { id: string; assessment?: { claimType?: string | null } } | null
  lettersOfProtection?: LetterOfProtection[]
}

interface TreatmentRecord {
  id: string
  referralId: string
  visitDate: string
  visitType: string
  diagnosis: string | null
  diagnosisCode: string | null
  billedAmount: number | null
  status: string
  notes: string | null
}

interface TreatmentSummary {
  totalRecords: number
  completedVisits: number
  totalBilled: number
  firstVisitDate: string | null
  lastVisitDate: string | null
}

interface LeadOption {
  id: string
  label: string
  sublabel: string
}

const VISIT_TYPES: { value: TreatmentRecordInput['visitType']; label: string }[] = [
  { value: 'initial_eval', label: 'Initial Evaluation' },
  { value: 'follow_up', label: 'Follow-up Visit' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'other', label: 'Other' },
]

const RECORD_STATUSES: { value: NonNullable<TreatmentRecordInput['status']>; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'no_show', label: 'No-show' },
  { value: 'cancelled', label: 'Cancelled' },
]

const formatClaimType = (claimType?: string | null) =>
  (claimType || 'Case').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)

const formatDate = (dateString?: string | null) =>
  dateString ? new Date(dateString).toLocaleDateString() : '—'

const labelize = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

export default function MedicalProviders() {
  const [providers, setProviders] = useState<MedicalProvider[]>([])
  const [referrals, setReferrals] = useState<ProviderReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('providers')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    specialty: '',
    city: '',
    state: '',
    acceptsLien: false,
    isVerified: false,
    minRating: 0,
  })

  // Refer-patient modal state
  const [referProvider, setReferProvider] = useState<MedicalProvider | null>(null)
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [referForm, setReferForm] = useState({ leadId: '', referralType: 'treatment', notes: '' })
  const [referSubmitting, setReferSubmitting] = useState(false)

  useEffect(() => {
    loadProviders()
    loadReferrals()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const data = await getMedicalProviderDirectory({ limit: 100 })
      setProviders((data?.providers ?? []) as MedicalProvider[])
    } catch (err) {
      console.error('Failed to load providers:', err)
      setError('Failed to load medical providers.')
    } finally {
      setLoading(false)
    }
  }

  const loadReferrals = async () => {
    try {
      const data = await getProviderReferrals({ limit: 100 })
      setReferrals((data?.referrals ?? []) as ProviderReferral[])
    } catch (err) {
      console.error('Failed to load referrals:', err)
    }
  }

  const openReferModal = async (provider: MedicalProvider) => {
    setReferProvider(provider)
    setReferForm({ leadId: '', referralType: 'treatment', notes: '' })
    if (leadOptions.length === 0) {
      try {
        setLeadsLoading(true)
        const data = await getAttorneyFilteredLeads({ limit: 100 })
        const options: LeadOption[] = (data?.leads ?? []).map((lead: any) => ({
          id: lead.id,
          label: formatClaimType(lead.assessment?.claimType),
          sublabel:
            [lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') ||
            `Lead ${String(lead.id).slice(0, 8)}`,
        }))
        setLeadOptions(options)
      } catch (err) {
        console.error('Failed to load leads:', err)
      } finally {
        setLeadsLoading(false)
      }
    }
  }

  const submitReferral = async () => {
    if (!referProvider || !referForm.leadId) return
    try {
      setReferSubmitting(true)
      await createProviderReferral({
        leadId: referForm.leadId,
        providerId: referProvider.id,
        referralType: referForm.referralType,
        notes: referForm.notes || undefined,
      })
      setReferProvider(null)
      await loadReferrals()
      setActiveTab('referrals')
    } catch (err) {
      console.error('Failed to create referral:', err)
    } finally {
      setReferSubmitting(false)
    }
  }

  const filteredProviders = providers.filter((provider) => {
    if (
      searchTerm &&
      !provider.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !provider.city.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    if (filters.specialty && provider.specialty !== filters.specialty) return false
    if (filters.city && provider.city !== filters.city) return false
    if (filters.state && provider.state !== filters.state) return false
    if (filters.acceptsLien && !provider.acceptsLien) return false
    if (filters.isVerified && !provider.isVerified) return false
    if (filters.minRating && provider.rating < filters.minRating) return false
    return true
  })

  const specialties = [...new Set(providers.map((p) => p.specialty))]
  const cities = [...new Set(providers.map((p) => p.city))]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-lg text-gray-600">Loading medical providers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Medical Providers</h1>
          <p className="mt-2 text-gray-600">Find and coordinate with lien-based medical providers</p>
        </div>
        <div className="flex space-x-4">
          <button className="btn-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </button>
          <button className="btn-primary" onClick={() => setActiveTab('analytics')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'providers', name: 'Provider Directory', icon: MapPin },
            { id: 'referrals', name: 'My Referrals', icon: Calendar },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Provider Directory */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search providers by name, specialty, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <select
                  value={filters.specialty}
                  onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Specialties</option>
                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="form-select"
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.acceptsLien}
                    onChange={(e) => setFilters({ ...filters, acceptsLien: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Accepts Lien</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isVerified}
                    onChange={(e) => setFilters({ ...filters, isVerified: e.target.checked })}
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div key={provider.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                    <p className="text-sm text-gray-600">{provider.specialty}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {provider.isVerified && (
                      <Tooltip content="Verified Provider">
                        <Shield className="h-4 w-4 text-green-500" />
                      </Tooltip>
                    )}
                    {provider.acceptsLien && (
                      <Tooltip content="Accepts Lien">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {provider.address}, {provider.city}, {provider.state} {provider.zipCode}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {provider.phone || '—'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {provider.email || '—'}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">{provider.rating}</span>
                    <span className="ml-1 text-sm text-gray-500">({provider.totalReviews} reviews)</span>
                  </div>
                  <div className="text-sm text-gray-500">{provider.serviceRadius} mi radius</div>
                </div>

                {provider.acceptsLien && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="text-sm font-medium text-blue-900">Lien Terms</div>
                    <div className="text-sm text-blue-700">
                      {provider.averageLienRate}% rate • Min:{' '}
                      {formatCurrency(provider.lienTerms?.minimumAmount || 0)}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button className="flex-1 btn-primary text-sm" onClick={() => openReferModal(provider)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Refer Patient
                  </button>
                  <button className="btn-secondary text-sm">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProviders.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No providers found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* My Referrals */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          {referrals.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No referrals yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Refer a client to a provider from the directory to start tracking treatment.
              </p>
            </div>
          ) : (
            referrals.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} onStatusChange={loadReferrals} />
            ))
          )}
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Referrals</p>
                  <p className="text-2xl font-semibold text-gray-900">{referrals.length}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Accepted</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {referrals.filter((r) => r.status === 'accepted').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {referrals.filter((r) => r.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {referrals.filter((r) => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="px-2 py-2 border-b border-gray-200 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Specialty Breakdown</h3>
            </div>
            <div className="space-y-4">
              {specialties.map((specialty) => {
                const specialtyReferrals = referrals.filter((r) => r.provider?.specialty === specialty).length
                const percentage = referrals.length > 0 ? (specialtyReferrals / referrals.length) * 100 : 0
                return (
                  <div key={specialty} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{specialty}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">{specialtyReferrals}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Refer Patient Modal */}
      {referProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Refer Patient to {referProvider.name}</h3>
              <button onClick={() => setReferProvider(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client / Case</label>
                {leadsLoading ? (
                  <div className="flex items-center text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading cases...
                  </div>
                ) : (
                  <select
                    value={referForm.leadId}
                    onChange={(e) => setReferForm({ ...referForm, leadId: e.target.value })}
                    className="form-select w-full"
                  >
                    <option value="">Select a case...</option>
                    {leadOptions.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.label} — {lead.sublabel}
                      </option>
                    ))}
                  </select>
                )}
                {!leadsLoading && leadOptions.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">No cases available to refer.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Type</label>
                <select
                  value={referForm.referralType}
                  onChange={(e) => setReferForm({ ...referForm, referralType: e.target.value })}
                  className="form-select w-full"
                >
                  <option value="treatment">Treatment</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="second_opinion">Second Opinion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={referForm.notes}
                  onChange={(e) => setReferForm({ ...referForm, notes: e.target.value })}
                  rows={3}
                  className="form-input w-full"
                  placeholder="Reason for referral, body parts injured, etc."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
              <button className="btn-secondary" onClick={() => setReferProvider(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!referForm.leadId || referSubmitting}
                onClick={submitReferral}
              >
                {referSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Create Referral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const statusBadgeClass = (status: string) =>
  status === 'pending'
    ? 'bg-yellow-100 text-yellow-800'
    : status === 'accepted'
    ? 'bg-green-100 text-green-800'
    : status === 'declined'
    ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-800'

function ReferralCard({
  referral,
  onStatusChange,
}: {
  referral: ProviderReferral
  onStatusChange: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(referral.status)

  // Letter of Protection state
  const [lop, setLop] = useState<LetterOfProtection | null>(referral.lettersOfProtection?.[0] ?? null)
  const [lopBusy, setLopBusy] = useState(false)
  const [showLetter, setShowLetter] = useState(false)

  // Treatment ledger state
  const [records, setRecords] = useState<TreatmentRecord[]>([])
  const [summary, setSummary] = useState<TreatmentSummary | null>(null)
  const [recordsLoaded, setRecordsLoaded] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [savingRecord, setSavingRecord] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [recordForm, setRecordForm] = useState<TreatmentRecordInput>({
    visitDate: new Date().toISOString().slice(0, 10),
    visitType: 'follow_up',
    diagnosis: '',
    diagnosisCode: '',
    billedAmount: null,
    status: 'completed',
    notes: '',
  })

  const toggleExpanded = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && !recordsLoaded) {
      await loadRecords()
      if (!lop) {
        try {
          const existing = await getReferralLetterOfProtection(referral.id)
          if (existing) setLop(existing as LetterOfProtection)
        } catch (err) {
          console.error('Failed to load letter of protection:', err)
        }
      }
    }
  }

  const loadRecords = async () => {
    try {
      setRecordsLoading(true)
      const data = await getReferralTreatmentRecords(referral.id)
      setRecords((data?.records ?? []) as TreatmentRecord[])
      setSummary((data?.summary ?? null) as TreatmentSummary | null)
      setRecordsLoaded(true)
    } catch (err) {
      console.error('Failed to load treatment records:', err)
    } finally {
      setRecordsLoading(false)
    }
  }

  const changeStatus = async (newStatus: string) => {
    setStatus(newStatus)
    try {
      await updateProviderReferral(referral.id, { status: newStatus })
      onStatusChange()
    } catch (err) {
      console.error('Failed to update referral status:', err)
      setStatus(referral.status)
    }
  }

  const generateLetter = async () => {
    try {
      setLopBusy(true)
      const created = await generateReferralLetterOfProtection(referral.id)
      setLop(created as LetterOfProtection)
      setShowLetter(true)
    } catch (err) {
      console.error('Failed to generate letter of protection:', err)
    } finally {
      setLopBusy(false)
    }
  }

  const sendLetter = async () => {
    if (!lop) return
    try {
      setLopBusy(true)
      const updated = await sendLetterOfProtection(lop.id, referral.provider.email || undefined)
      setLop({ ...lop, status: 'sent', sentAt: updated.sentAt ?? new Date().toISOString() })
    } catch (err) {
      console.error('Failed to send letter of protection:', err)
    } finally {
      setLopBusy(false)
    }
  }

  const addRecord = async () => {
    if (!recordForm.visitDate) return
    try {
      setSavingRecord(true)
      await createReferralTreatmentRecord(referral.id, {
        ...recordForm,
        diagnosis: recordForm.diagnosis || null,
        diagnosisCode: recordForm.diagnosisCode || null,
        notes: recordForm.notes || null,
        billedAmount:
          recordForm.billedAmount === null || recordForm.billedAmount === undefined
            ? null
            : Number(recordForm.billedAmount),
      })
      setShowAddForm(false)
      setRecordForm({
        visitDate: new Date().toISOString().slice(0, 10),
        visitType: 'follow_up',
        diagnosis: '',
        diagnosisCode: '',
        billedAmount: null,
        status: 'completed',
        notes: '',
      })
      await loadRecords()
    } catch (err) {
      console.error('Failed to add treatment record:', err)
    } finally {
      setSavingRecord(false)
    }
  }

  const removeRecord = async (recordId: string) => {
    try {
      await deleteTreatmentRecord(recordId)
      await loadRecords()
    } catch (err) {
      console.error('Failed to delete treatment record:', err)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={toggleExpanded} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <div>
            <div className="text-sm font-semibold text-gray-900">{referral.provider?.name}</div>
            <div className="text-sm text-gray-500">
              {referral.provider?.specialty} • {labelize(referral.referralType)} •{' '}
              {formatDate(referral.referralDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lop && (
            <Tooltip content={lop.status === 'sent' ? 'LOP sent' : 'LOP drafted'}>
              <span
                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  lop.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <FileText className="h-3 w-3 mr-1" />
                {lop.status === 'sent' ? 'LOP Sent' : 'LOP Draft'}
              </span>
            </Tooltip>
          )}
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value)}
            className={`text-xs font-semibold rounded-full border-0 px-3 py-1 focus:ring-2 focus:ring-primary-500 ${statusBadgeClass(
              status
            )}`}
          >
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {expanded && (
        <div className="mt-6 space-y-6 border-t border-gray-100 pt-6">
          {referral.notes && (
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Referral notes: </span>
              {referral.notes}
            </div>
          )}

          {/* Letter of Protection */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-primary-600" />
                  Letter of Protection (Lien)
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {lop
                    ? lop.status === 'sent'
                      ? `Sent ${formatDate(lop.sentAt)} — lien established.`
                      : 'Draft ready. Review and send to the provider.'
                    : 'Tell the provider this is a PI case and they will be paid from the settlement.'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {!lop && (
                  <button className="btn-secondary text-sm" disabled={lopBusy} onClick={generateLetter}>
                    {lopBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Generate Draft
                  </button>
                )}
                {lop && (
                  <button className="btn-secondary text-sm" onClick={() => setShowLetter((v) => !v)}>
                    <Eye className="h-4 w-4 mr-1" />
                    {showLetter ? 'Hide' : 'View'}
                  </button>
                )}
                {lop && lop.status !== 'sent' && (
                  <button className="btn-primary text-sm" disabled={lopBusy} onClick={sendLetter}>
                    {lopBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Send to Provider
                  </button>
                )}
              </div>
            </div>
            {lop && showLetter && (
              <pre className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-4 text-xs text-gray-700">
                {lop.content}
              </pre>
            )}
          </div>

          {/* Treatment / diagnoses / bills ledger */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-primary-600" />
                Treatment, Diagnoses &amp; Bills
              </h4>
              <button className="btn-secondary text-sm" onClick={() => setShowAddForm((v) => !v)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Record
              </button>
            </div>

            {summary && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" /> Completed Visits
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{summary.completedVisits}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Receipt className="h-3 w-3 mr-1" /> Total Billed
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(summary.totalBilled)}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" /> Last Visit
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{formatDate(summary.lastVisitDate)}</div>
                </div>
              </div>
            )}

            {showAddForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Visit Date</label>
                    <input
                      type="date"
                      value={recordForm.visitDate}
                      onChange={(e) => setRecordForm({ ...recordForm, visitDate: e.target.value })}
                      className="form-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Visit Type</label>
                    <select
                      value={recordForm.visitType}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, visitType: e.target.value as TreatmentRecordInput['visitType'] })
                      }
                      className="form-select w-full text-sm"
                    >
                      {VISIT_TYPES.map((vt) => (
                        <option key={vt.value} value={vt.value}>
                          {vt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={recordForm.status}
                      onChange={(e) =>
                        setRecordForm({
                          ...recordForm,
                          status: e.target.value as NonNullable<TreatmentRecordInput['status']>,
                        })
                      }
                      className="form-select w-full text-sm"
                    >
                      {RECORD_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis</label>
                    <input
                      type="text"
                      value={recordForm.diagnosis ?? ''}
                      onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                      className="form-input w-full text-sm"
                      placeholder="e.g. Cervical strain"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ICD-10 (optional)</label>
                    <input
                      type="text"
                      value={recordForm.diagnosisCode ?? ''}
                      onChange={(e) => setRecordForm({ ...recordForm, diagnosisCode: e.target.value })}
                      className="form-input w-full text-sm"
                      placeholder="e.g. S13.4"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Billed Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recordForm.billedAmount ?? ''}
                      onChange={(e) =>
                        setRecordForm({
                          ...recordForm,
                          billedAmount: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className="form-input w-full text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    type="text"
                    value={recordForm.notes ?? ''}
                    onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                    className="form-input w-full text-sm"
                    placeholder="Treatment details, plan, etc."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button className="btn-secondary text-sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                  <button className="btn-primary text-sm" disabled={savingRecord} onClick={addRecord}>
                    {savingRecord ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Save Record
                  </button>
                </div>
              </div>
            )}

            {recordsLoading ? (
              <div className="flex items-center text-sm text-gray-500 py-4">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading records...
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No treatment records logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Diagnosis</th>
                      <th className="px-3 py-2">Billed</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((record) => (
                      <tr key={record.id} className="text-sm text-gray-700">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(record.visitDate)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{labelize(record.visitType)}</td>
                        <td className="px-3 py-2">
                          {record.diagnosis || '—'}
                          {record.diagnosisCode && (
                            <span className="ml-1 text-xs text-gray-400">({record.diagnosisCode})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {record.billedAmount != null ? formatCurrency(record.billedAmount) : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs">{labelize(record.status)}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <button
                            className="text-gray-400 hover:text-red-600"
                            onClick={() => removeRecord(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
