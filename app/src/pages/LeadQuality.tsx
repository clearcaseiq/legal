import { useState, useEffect } from 'react'
import { 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Star, 
  Clock, 
  Eye, 
  Phone, 
  MessageSquare,
  TrendingUp,
  Shield,
  Filter,
  Download
} from 'lucide-react'
import Tooltip from '../components/Tooltip'
import { getAttorneyFilteredLeads, getLeadQualityConflictChecks, getLeadQualityReports } from '../lib/api'

interface Lead {
  id: string
  viabilityScore: number
  liabilityScore: number
  causationScore: number
  damagesScore: number
  isExclusive: boolean
  sourceType: string
  hotnessLevel: string
  submittedAt: string
  status: string
  assessment: any
  evidenceChecklist: { required: any[] }
  conflictChecks: any[]
  qualityReports: any[]
}

// Scores are stored as 0-1 fractions in some records and 0-100 in others
const toPercent = (value: number | null | undefined) => {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(100, n <= 1 ? Math.round(n * 100) : Math.round(n))
}

const parseChecklist = (raw: any): { required: any[] } => {
  let parsed = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { parsed = null }
  }
  if (Array.isArray(parsed)) return { required: parsed }
  if (parsed && Array.isArray(parsed.required)) return { required: parsed.required }
  return { required: [] }
}

const formatClaimType = (claimType?: string | null) =>
  (claimType || 'Case').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

export default function LeadQuality() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [conflictChecks, setConflictChecks] = useState<any[]>([])
  const [qualityReports, setQualityReports] = useState<any[]>([])
  const [filters, setFilters] = useState({
    hotnessLevel: '',
    sourceType: '',
    viabilityMin: 0,
    isExclusive: false
  })

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const [leadsResult, conflictsResult, reportsResult] = await Promise.allSettled([
        getAttorneyFilteredLeads({ limit: 100 }),
        getLeadQualityConflictChecks({ limit: 50 }),
        getLeadQualityReports({ limit: 50 })
      ])

      if (leadsResult.status === 'fulfilled') {
        const mapped: Lead[] = (leadsResult.value.leads || []).map((lead: any) => ({
          id: lead.id,
          viabilityScore: toPercent(lead.viabilityScore),
          liabilityScore: toPercent(lead.liabilityScore),
          causationScore: toPercent(lead.causationScore),
          damagesScore: toPercent(lead.damagesScore),
          isExclusive: Boolean(lead.isExclusive),
          sourceType: lead.sourceType || 'direct',
          hotnessLevel: lead.hotnessLevel || 'warm',
          submittedAt: lead.submittedAt,
          status: lead.status,
          assessment: lead.assessment || {},
          evidenceChecklist: parseChecklist(lead.evidenceChecklist),
          conflictChecks: [],
          qualityReports: []
        }))
        setLeads(mapped)
      } else {
        setLoadError('We could not load your leads. Please refresh to try again.')
      }

      if (conflictsResult.status === 'fulfilled') {
        setConflictChecks(conflictsResult.value.conflictChecks || [])
      }
      if (reportsResult.status === 'fulfilled') {
        setQualityReports(reportsResult.value.reports || [])
      }
    } catch (err) {
      console.error('Failed to load leads:', err)
      setLoadError('We could not load your leads. Please refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  const getHotnessColor = (level: string) => {
    switch (level) {
      case 'hot': return 'text-red-600 bg-red-100'
      case 'warm': return 'text-orange-600 bg-orange-100'
      case 'cold': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'organic_search': return '🔍'
      case 'paid_ad': return '💰'
      case 'referral': return '👥'
      case 'direct': return '📱'
      default: return '❓'
    }
  }

  const getHoursAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    return hours
  }

  const filteredLeads = leads.filter(lead => {
    if (filters.hotnessLevel && lead.hotnessLevel !== filters.hotnessLevel) return false
    if (filters.sourceType && lead.sourceType !== filters.sourceType) return false
    if (filters.viabilityMin && lead.viabilityScore < filters.viabilityMin) return false
    if (filters.isExclusive && !lead.isExclusive) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-lg text-gray-600">Loading lead quality data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Lead Quality & Transparency</h1>
          <p className="mt-2 text-gray-600">Detailed lead analysis with viability scoring and evidence tracking</p>
        </div>
        <div className="flex space-x-4">
          <button className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
          <button className="btn-primary">
            <Target className="h-4 w-4 mr-2" />
            Quality Settings
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hotness Level</label>
            <select
              value={filters.hotnessLevel}
              onChange={(e) => setFilters({ ...filters, hotnessLevel: e.target.value })}
              className="form-select"
            >
              <option value="">All Levels</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
            <select
              value={filters.sourceType}
              onChange={(e) => setFilters({ ...filters, sourceType: e.target.value })}
              className="form-select"
            >
              <option value="">All Sources</option>
              <option value="organic_search">Organic Search</option>
              <option value="paid_ad">Paid Ad</option>
              <option value="referral">Referral</option>
              <option value="direct">Direct</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Viability</label>
            <select
              value={filters.viabilityMin}
              onChange={(e) => setFilters({ ...filters, viabilityMin: parseInt(e.target.value) })}
              className="form-select"
            >
              <option value={0}>Any</option>
              <option value={50}>50%+</option>
              <option value={70}>70%+</option>
              <option value={80}>80%+</option>
              <option value={90}>90%+</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.isExclusive}
                onChange={(e) => setFilters({ ...filters, isExclusive: e.target.checked })}
                className="form-checkbox"
              />
              <span className="ml-2 text-sm text-gray-700">Exclusive Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Quality Overview', icon: Target },
            { id: 'evidence', name: 'Evidence Checklist', icon: FileText },
            { id: 'conflicts', name: 'Conflict Checks', icon: Shield },
            { id: 'reports', name: 'Quality Reports', icon: TrendingUp }
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Lead Quality Table */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Lead Quality Analysis</h3>
            </div>
            {loadError && (
              <div className="px-6 py-4 text-sm text-red-700 bg-red-50 border-b border-red-100">
                {loadError}
              </div>
            )}
            {!loadError && filteredLeads.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leads yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {leads.length === 0
                    ? 'New leads assigned to you will appear here with their quality scores.'
                    : 'No leads match the current filters.'}
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viability Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakdown</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotness</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatClaimType(lead.assessment?.claimType)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || 'Venue not set'}
                            </div>
                          </div>
                          {lead.isExclusive && (
                            <Tooltip content="Exclusive Lead">
                              <Star className="h-4 w-4 text-yellow-500 ml-2" />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-2xl font-bold text-primary-600">{formatPercentage(lead.viabilityScore)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-blue-600">L:</span>
                            <span>{formatPercentage(lead.liabilityScore)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">C:</span>
                            <span>{formatPercentage(lead.causationScore)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-600">D:</span>
                            <span>{formatPercentage(lead.damagesScore)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.evidenceChecklist.required.length > 0 ? (
                          <div className="flex items-center">
                            {lead.evidenceChecklist.required.filter((item: any) => item.uploaded).length}/
                            {lead.evidenceChecklist.required.length}
                            <div className="ml-2">
                              {lead.evidenceChecklist.required.every((item: any) => item.uploaded) ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not started</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getSourceIcon(lead.sourceType)}</span>
                          <span className="text-sm text-gray-900">{lead.sourceType.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHotnessColor(lead.hotnessLevel)}`}>
                          {lead.hotnessLevel} ({getHoursAgo(lead.submittedAt)}h ago)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Tooltip content="View Details">
                            <button 
                              onClick={() => setSelectedLead(lead)}
                              className="text-primary-600 hover:text-primary-900"
                              aria-label="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Call">
                            <button className="text-green-600 hover:text-green-900" aria-label="Call">
                              <Phone className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Message">
                            <button className="text-blue-600 hover:text-blue-900" aria-label="Message">
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {filteredLeads.length === 0 && (
            <div className="card">
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No evidence checklists yet</h3>
                <p className="mt-1 text-sm text-gray-500">Evidence checklists for your leads will appear here.</p>
              </div>
            </div>
          )}
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatClaimType(lead.assessment?.claimType)} - Evidence Checklist
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHotnessColor(lead.hotnessLevel)}`}>
                      {lead.hotnessLevel}
                    </span>
                    {lead.isExclusive && (
                      <Tooltip content="Exclusive">
                        <Star className="h-4 w-4 text-yellow-500" />
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                {lead.evidenceChecklist.required.length === 0 && (
                  <p className="text-sm text-gray-500">No evidence checklist has been generated for this lead yet.</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.evidenceChecklist.required.map((item: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {item.uploaded ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertTriangle className={`h-5 w-5 ${item.critical ? 'text-red-500' : 'text-yellow-500'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.critical && (
                          <div className="text-xs text-red-600">Critical</div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <button className="text-sm text-primary-600 hover:text-primary-900">
                          {item.uploaded ? 'View' : 'Upload'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'conflicts' && (
        <div className="space-y-6">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Conflict Check Results</h3>
              <p className="mt-1 text-sm text-gray-500">
                Preliminary automated screens against your leads on this platform. Always run your firm's full conflict check before engagement.
              </p>
            </div>
            <div className="px-6 py-4">
              {conflictChecks.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No conflict checks run yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Run a conflict check from a lead's detail page and the results will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflictChecks.map((check: any) => (
                    <div key={check.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatClaimType(check.lead?.assessment?.claimType)}
                          {check.lead?.assessment?.venueState ? ` — ${check.lead.assessment.venueState}` : ''}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {check.conflictType === 'none'
                            ? 'No conflicts found in this screen'
                            : `Flagged: ${String(check.conflictType).replace(/_/g, ' ')}`}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Checked {new Date(check.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          check.riskLevel === 'high'
                            ? 'bg-red-100 text-red-800'
                            : check.riskLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {check.riskLevel} risk
                        </span>
                        {check.isResolved && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quality Reports</h3>
            </div>
            <div className="px-6 py-4">
              {qualityReports.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quality issues reported</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    If a lead is spam, a duplicate, or has quality problems, report it from the lead's detail page and it will be tracked here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qualityReports.map((report: any) => (
                    <div key={report.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatClaimType(report.lead?.assessment?.claimType)}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {report.reportReason || report.resolution || 'Quality issue reported'}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Reported {new Date(report.createdAt).toLocaleDateString()}
                          {report.isSpam ? ' · Spam' : ''}
                          {report.isDuplicate ? ' · Duplicate' : ''}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {Number(report.creditIssued) > 0 && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ${report.creditIssued} credit
                          </span>
                        )}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          report.status === 'resolved' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status || 'open'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Lead Quality Details</h3>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Viability Breakdown */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Viability Score Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Liability</div>
                      <div className="text-2xl font-bold text-blue-700">{formatPercentage(selectedLead.liabilityScore)}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Causation</div>
                      <div className="text-2xl font-bold text-green-700">{formatPercentage(selectedLead.causationScore)}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-600">Damages</div>
                      <div className="text-2xl font-bold text-purple-700">{formatPercentage(selectedLead.damagesScore)}</div>
                    </div>
                    <div className="text-center p-3 bg-primary-50 rounded-lg">
                      <div className="text-sm font-medium text-primary-600">Overall</div>
                      <div className="text-2xl font-bold text-primary-700">{formatPercentage(selectedLead.viabilityScore)}</div>
                    </div>
                  </div>
                </div>

                {/* Evidence Status */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Evidence Status</h4>
                  <div className="space-y-2">
                    {selectedLead.evidenceChecklist.required.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          {item.uploaded ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className={`h-4 w-4 ${item.critical ? 'text-red-500' : 'text-yellow-500'}`} />
                          )}
                          <span className="text-sm">{item.name}</span>
                          {item.critical && <span className="text-xs text-red-600">(Critical)</span>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.uploaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.uploaded ? 'Uploaded' : 'Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Source Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Source Type:</span>
                      <span className="ml-2 font-medium">{selectedLead.sourceType.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Exclusive:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        selectedLead.isExclusive ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedLead.isExclusive ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button className="btn-primary">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Now
                  </button>
                  <button className="btn-secondary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </button>
                  <button className="btn-secondary">
                    <Eye className="h-4 w-4 mr-2" />
                    Full Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
