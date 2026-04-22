import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminQueueCases, getAllAdminCases, bulkRouteCases, getAdminAttorneys } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/formatters'
import { 
  FileText, 
  Users, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Eye,
  Filter,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Download,
  ArrowUpDown,
  Send,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import Tooltip from '../components/Tooltip'

interface QueueCase {
  id: string
  claimType: string
  venueState: string
  venueCounty?: string
  status: string
  facts: any
  prediction?: {
    viability: {
      overall: number
    }
    bands: {
      p25: number
      median: number
      p75: number
    }
  }
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone?: string
  } | null
  createdAt: string
  updatedAt: string
  fileCount: number
  introductions?: Array<{
    id: string
    status: string
    createdAt: string
    attorney?: {
      id: string
      name: string
      email?: string
    }
  }>
  leadSubmission?: {
    assignedAttorney?: {
      id: string
      name: string
      email?: string
    } | null
    assignmentType?: string
  } | null
  counts?: { files: number; introductions: number }
}

type SortField = 'createdAt' | 'claimType' | 'venueState' | 'status' | 'viability' | 'estimatedValue'
type SortDirection = 'asc' | 'desc'

export default function AdminDashboard() {
  console.log('AdminDashboard: Component rendering')
  const navigate = useNavigate()
  const [queueCases, setQueueCases] = useState<QueueCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<QueueCase | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'all'>('queue')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [attorneys, setAttorneys] = useState<any[]>([])
  const [selectedAttorney, setSelectedAttorney] = useState<string>('')
  const [attorneyEmail, setAttorneyEmail] = useState('')
  const [routingMessage, setRoutingMessage] = useState('')
  const [skipEligibilityCheck, setSkipEligibilityCheck] = useState(false)
  const [autoRoute, setAutoRoute] = useState(false)
  const [routing, setRouting] = useState(false)
  const [routeSuccess, setRouteSuccess] = useState<string | null>(null)

  const getLatestIntroduction = (caseItem: QueueCase) => {
    if (!caseItem.introductions || caseItem.introductions.length === 0) return null
    return [...caseItem.introductions].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })[0]
  }

  const getRoutedAttorney = (caseItem: QueueCase): { name: string; email?: string } | null => {
    const fromLead = caseItem.leadSubmission?.assignedAttorney
    if (fromLead) return { name: fromLead.name, email: fromLead.email }
    const intro = getLatestIntroduction(caseItem)
    if (intro?.attorney) return { name: intro.attorney.name, email: intro.attorney.email }
    return null
  }

  const loadQueueCases = useCallback(async () => {
    try {
      console.log('AdminDashboard: Loading queue cases...')
      setLoading(true)
      setError(null)
      const data = await getAdminQueueCases()
      console.log('AdminDashboard: Queue cases loaded:', data)
      setQueueCases(data.cases || [])
    } catch (err: any) {
      console.error('AdminDashboard: Failed to load queue cases:', err)
      console.error('AdminDashboard: Error status:', err.response?.status)
      console.error('AdminDashboard: Error data:', err.response?.data)
      if (err.response?.status === 401) {
        // No token or invalid token - redirect to login
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        navigate('/login?redirect=/admin')
        return
      } else if (err.response?.status === 403) {
        setError('Admin access required. Your email must be in the ADMIN_EMAILS environment variable. Contact support if you believe this is an error.')
        // Don't navigate away - show the error message
      } else {
        setError(err.response?.data?.error || 'Failed to load queue cases')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const loadAllCases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllAdminCases(statusFilter || undefined)
      setQueueCases(data.cases || [])
    } catch (err: any) {
      console.error('Failed to load all cases:', err)
      if (err.response?.status === 401) {
        // No token or invalid token - redirect to login
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        navigate('/login?redirect=/admin')
        return
      } else if (err.response?.status === 403) {
        setError('Admin access required. Your email must be in the ADMIN_EMAILS environment variable. Contact support if you believe this is an error.')
        // Don't navigate away - show the error message
      } else {
        setError(err.response?.data?.error || 'Failed to load cases')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate, statusFilter])

  useEffect(() => {
    console.log('AdminDashboard: useEffect triggered')
    // Check for auth token immediately - redirect if not present
    const token = localStorage.getItem('auth_token')
    const user = localStorage.getItem('user')
    console.log('AdminDashboard: Token exists:', !!token)
    console.log('AdminDashboard: User:', user ? JSON.parse(user).email : 'none')
    
    if (!token) {
      console.log('AdminDashboard: No token, redirecting to login')
      // Use window.location to force a full page reload and redirect
      window.location.href = '/login?redirect=/admin'
      return
    }

    // Load data after a small delay to ensure token is available
    const timer = setTimeout(() => {
      console.log('AdminDashboard: Loading data for tab:', activeTab)
      if (activeTab === 'queue') {
        loadQueueCases()
      } else {
        loadAllCases()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [navigate, activeTab, statusFilter, loadQueueCases, loadAllCases])

  const loadAttorneys = useCallback(async () => {
    try {
      const data = await getAdminAttorneys()
      setAttorneys(data.attorneys || [])
    } catch (err: any) {
      console.error('Failed to load attorneys:', err)
    }
  }, [])

  const goToCompliance = () => {
    navigate('/admin/compliance')
  }

  useEffect(() => {
    if (showRouteModal) {
      loadAttorneys()
    }
  }, [showRouteModal, loadAttorneys])

  const filteredCases = queueCases.filter(caseItem => {
    if (searchTerm === '') return true
    
    const searchLower = searchTerm.toLowerCase()
    const matchesClaimType = caseItem.claimType.toLowerCase().includes(searchLower)
    const matchesVenue = caseItem.venueState.toLowerCase().includes(searchLower)
    const matchesUser = caseItem.user ? (
      caseItem.user.email?.toLowerCase().includes(searchLower) ||
      `${caseItem.user.firstName || ''} ${caseItem.user.lastName || ''}`.toLowerCase().includes(searchLower)
    ) : false
    
    return matchesClaimType || matchesVenue || matchesUser
  })

  const sortedCases = [...filteredCases].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case 'claimType':
        aValue = a.claimType.toLowerCase()
        bValue = b.claimType.toLowerCase()
        break
      case 'venueState':
        aValue = a.venueState.toLowerCase()
        bValue = b.venueState.toLowerCase()
        break
      case 'status':
        aValue = a.status.toLowerCase()
        bValue = b.status.toLowerCase()
        break
      case 'viability':
        aValue = a.prediction?.viability?.overall || 0
        bValue = b.prediction?.viability?.overall || 0
        break
      case 'estimatedValue':
        aValue = a.prediction?.bands?.median || 0
        bValue = b.prediction?.bands?.median || 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleCaseSelection = (caseId: string) => {
    const newSelected = new Set(selectedCases)
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId)
    } else {
      newSelected.add(caseId)
    }
    setSelectedCases(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedCases.size === sortedCases.length) {
      setSelectedCases(new Set())
    } else {
      setSelectedCases(new Set(sortedCases.map(c => c.id)))
    }
  }

  const handleBulkRoute = async () => {
    if (selectedCases.size === 0) {
      setError('Please select at least one case to route')
      return
    }

    if (!autoRoute && !selectedAttorney) {
      setError('Please select an attorney')
      return
    }

    setRouting(true)
    setError(null)
    setRouteSuccess(null)

    try {
      const target = attorneyEmail.trim() || selectedAttorney
      const result = await bulkRouteCases(
        Array.from(selectedCases),
        autoRoute ? undefined : target,
        routingMessage || undefined,
        { skipEligibilityCheck: true, autoRoute }
      )

      setRouteSuccess(`Successfully routed ${result.routed} case(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`)
      if (result.failed > 0 && Array.isArray(result.errors) && result.errors.length > 0) {
        const detail = result.errors
          .map((err: any) => `${err.caseId}: ${err.error}`)
          .join(' | ')
        setError(`Routing failed for some cases: ${detail}`)
      }
      setSelectedCases(new Set())
      setShowRouteModal(false)
      setSelectedAttorney('')
      setAttorneyEmail('')
      setRoutingMessage('')
      setSkipEligibilityCheck(false)
      setAutoRoute(false)

      // Refresh cases
      if (activeTab === 'queue') {
        loadQueueCases()
      } else {
        loadAllCases()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to route cases')
    } finally {
      setRouting(false)
    }
  }

  const handleAutoRoute = async () => {
    if (selectedCases.size === 0) {
      setError('Please select at least one case to route')
      return
    }

    setRouting(true)
    setError(null)
    setRouteSuccess(null)

    try {
      const result = await bulkRouteCases(
        Array.from(selectedCases),
        undefined,
        routingMessage || undefined,
        { autoRoute: true, skipEligibilityCheck }
      )

      setRouteSuccess(`Successfully auto-routed ${result.routed} case(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`)
      if (result.failed > 0 && Array.isArray(result.errors) && result.errors.length > 0) {
        const detail = result.errors
          .map((err: any) => `${err.caseId}: ${err.error}`)
          .join(' | ')
        setError(`Auto-route failed for some cases: ${detail}`)
      }
      setSelectedCases(new Set())
      setShowRouteModal(false)
      setSelectedAttorney('')
      setAttorneyEmail('')
      setRoutingMessage('')
      setSkipEligibilityCheck(false)
      setAutoRoute(false)

      // Refresh cases
      if (activeTab === 'queue') {
        loadQueueCases()
      } else {
        loadAllCases()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to auto-route cases')
    } finally {
      setRouting(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Case ID', 'Case Type', 'User Name', 'User Email', 'Location', 'Status', 'Viability', 'Estimated Value', 'Created']
    const rows = sortedCases.map(caseItem => [
      caseItem.id,
      caseItem.claimType.replace('_', ' '),
      caseItem.user ? `${caseItem.user.firstName || ''} ${caseItem.user.lastName || ''}`.trim() : 'Anonymous',
      caseItem.user?.email || 'N/A',
      `${caseItem.venueCounty ? `${caseItem.venueCounty}, ` : ''}${caseItem.venueState}`,
      caseItem.status.replace('_', ' '),
      caseItem.prediction ? `${Math.round(caseItem.prediction.viability.overall * 100)}%` : 'N/A',
      caseItem.prediction?.bands?.median ? formatCurrency(caseItem.prediction.bands.median) : 'N/A',
      formatDate(caseItem.createdAt)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `cases_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToJSON = () => {
    const data = sortedCases.map(caseItem => ({
      id: caseItem.id,
      claimType: caseItem.claimType,
      venue: {
        state: caseItem.venueState,
        county: caseItem.venueCounty
      },
      status: caseItem.status,
      user: caseItem.user ? {
        name: `${caseItem.user.firstName || ''} ${caseItem.user.lastName || ''}`.trim(),
        email: caseItem.user.email,
        phone: caseItem.user.phone
      } : null,
      prediction: caseItem.prediction ? {
        viability: caseItem.prediction.viability.overall,
        estimatedValue: caseItem.prediction.bands.median,
        valueRange: {
          p25: caseItem.prediction.bands.p25,
          p75: caseItem.prediction.bands.p75
        }
      } : null,
      createdAt: caseItem.createdAt,
      fileCount: caseItem.fileCount
    }))

    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `cases_${activeTab}_${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800'
      case 'INTAKE': return 'bg-blue-100 text-blue-800'
      case 'UNDER_REVIEW': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Always render the page structure, show loading state inline if needed
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">View and manage all cases in the system</p>
          <p className="mt-1 text-xs text-gray-400">Page loaded successfully</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            User Roles
          </button>
          <button
            onClick={() => navigate('/admin/feature-toggles')}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Feature Toggles
          </button>
          <button
            onClick={() => navigate('/admin/firm-settings')}
            className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Firm Settings
          </button>
          <button
            onClick={goToCompliance}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Compliance Admin
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && queueCases.length === 0 && !error && (
        <div className="mb-6 text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          {error.includes('Admin access required') && (
            <div className="mt-4 p-3 bg-white rounded border border-red-200">
              <p className="text-sm text-gray-700 font-medium mb-2">To fix this:</p>
              <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                <li>Make sure you're logged in with an admin email (admin@caseiq.com)</li>
                <li>The default admin email is already configured, but if you need to add more, set the ADMIN_EMAILS environment variable in your .env file: <code className="bg-gray-100 px-1 rounded">ADMIN_EMAILS=admin@caseiq.com,your-email@example.com</code></li>
                <li>Restart the API server after setting the environment variable</li>
              </ol>
            </div>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Return to Dashboard
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'queue'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Queue ({queueCases.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Cases
          </button>
        </nav>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by case type, user email, name, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          {activeTab === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="COMPLETED">Completed</option>
              <option value="INTAKE">Intake</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="FILED">Filed</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="SETTLED">Settled</option>
              <option value="TRIAL">Trial</option>
              <option value="CLOSED">Closed</option>
            </select>
          )}
          <button
            onClick={() => activeTab === 'queue' ? loadQueueCases() : loadAllCases()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedCases.size > 0 && (
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-brand-900">
                {selectedCases.size} case{selectedCases.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedCases(new Set())}
                className="text-sm text-brand-600 hover:text-brand-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'queue' && (
                <button
                  onClick={() => setShowRouteModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Route to Attorney
                </button>
              )}
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={exportToJSON}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <Tooltip content="Select all">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center"
                      aria-label="Select all"
                    >
                      {selectedCases.size === sortedCases.length && sortedCases.length > 0 ? (
                        <CheckSquare className="h-5 w-5 text-brand-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </Tooltip>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Case ID
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('claimType')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Case Type
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('venueState')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Location
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Routed To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Status
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('viability')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Viability
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('estimatedValue')}
                    className="flex items-center hover:text-gray-700"
                  >
                    Est. Value
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCases.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No cases found</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {activeTab === 'queue' 
                        ? 'No cases are currently in the queue.' 
                        : 'No cases match your filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCaseSelection(caseItem.id)}
                        className="flex items-center"
                      >
                        {selectedCases.has(caseItem.id) ? (
                          <CheckSquare className="h-5 w-5 text-brand-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {caseItem.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {caseItem.claimType.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {caseItem.user ? (
                        <>
                          <div className="text-sm text-gray-900">
                            {caseItem.user.firstName || ''} {caseItem.user.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">{caseItem.user.email || 'No email'}</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Anonymous user</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {caseItem.venueCounty && `${caseItem.venueCounty}, `}{caseItem.venueState}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const attorney = getRoutedAttorney(caseItem)
                        return attorney ? (
                          <div>
                            <div className="font-medium">{attorney.name}</div>
                            {attorney.email && (
                              <div className="text-xs text-gray-500">{attorney.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseItem.status)}`}>
                        {caseItem.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {caseItem.prediction 
                        ? `${Math.round(caseItem.prediction.viability.overall * 100)}%`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {caseItem.prediction?.bands?.median 
                        ? formatCurrency(caseItem.prediction.bands.median)
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(caseItem.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedCase(caseItem)}
                        className="text-brand-600 hover:text-brand-900 inline-flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedCase(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Case Details</h2>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Case ID</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedCase.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCase.status)}`}>
                      {selectedCase.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Case Type</label>
                  <p className="text-gray-900 capitalize">{selectedCase.claimType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">
                    {selectedCase.venueCounty && `${selectedCase.venueCounty}, `}{selectedCase.venueState}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">{formatDate(selectedCase.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Files</label>
                  <p className="text-gray-900">{selectedCase.counts?.files ?? selectedCase.fileCount ?? 0}</p>
                </div>
              </div>

              {/* Routing Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Routing</h3>
                {(() => {
                  const routed = getRoutedAttorney(selectedCase)
                  return routed ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Routed to: </span>
                      <span className="text-gray-700">{routed.name}</span>
                      {routed.email && (
                        <span className="text-gray-600"> ({routed.email})</span>
                      )}
                    </div>
                    {selectedCase.leadSubmission?.assignmentType && (
                      <div className="text-xs text-gray-500">
                        Assignment: {selectedCase.leadSubmission.assignmentType}
                      </div>
                    )}
                    {selectedCase.introductions && selectedCase.introductions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Introductions: {selectedCase.introductions.length}</div>
                        {selectedCase.introductions.map((intro) => (
                          <div key={intro.id} className="flex items-center justify-between text-xs text-gray-600">
                            <span>{intro.attorney?.name || 'Unknown'}</span>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(intro.status)}`}>
                              {intro.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  ) : (
                    <p className="text-sm text-gray-500">Not routed yet.</p>
                  )
                })()}
              </div>

              {/* User Info */}
              {selectedCase.user ? (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">User Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-gray-900">
                        {selectedCase.user.firstName || ''} {selectedCase.user.lastName || ''}
                        {!selectedCase.user.firstName && !selectedCase.user.lastName && 'Anonymous user'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedCase.user.email || 'No email'}</p>
                    </div>
                    {selectedCase.user.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{selectedCase.user.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">User Information</h3>
                  <p className="text-gray-500 italic">Anonymous case - no user information available</p>
                </div>
              )}

              {/* Prediction */}
              {selectedCase.prediction && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Prediction</h3>
                  <div className="bg-brand-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Viability</label>
                        <p className="text-2xl font-bold text-brand-600">
                          {Math.round(selectedCase.prediction.viability.overall * 100)}%
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Estimated Value</label>
                        <p className="text-2xl font-bold text-brand-600">
                          {formatCurrency(selectedCase.prediction.bands.median)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Value Range</label>
                        <p className="text-gray-900">
                          {formatCurrency(selectedCase.prediction.bands.p25)} - {formatCurrency(selectedCase.prediction.bands.p75)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Case Facts Summary */}
              {selectedCase.facts && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Case Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedCase.facts.incident?.narrative && (
                      <div className="mb-3">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Incident</label>
                        <p className="text-gray-900 text-sm">{selectedCase.facts.incident.narrative}</p>
                      </div>
                    )}
                    {selectedCase.facts.damages && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        {selectedCase.facts.damages.med_charges !== undefined && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Medical Charges</label>
                            <p className="text-gray-900">{formatCurrency(selectedCase.facts.damages.med_charges)}</p>
                          </div>
                        )}
                        {selectedCase.facts.damages.wage_loss !== undefined && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Wage Loss</label>
                            <p className="text-gray-900">{formatCurrency(selectedCase.facts.damages.wage_loss)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route Cases Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Route Cases to Attorney</h2>
              <p className="mt-1 text-sm text-gray-600">
                Route {selectedCases.size} case{selectedCases.size !== 1 ? 's' : ''} to an attorney
              </p>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {routeSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
                  {routeSuccess}
                </div>
              )}
              <div>
                <label htmlFor="attorneyEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Or enter attorney email
                </label>
                <input
                  id="attorneyEmail"
                  type="email"
                  value={attorneyEmail}
                  onChange={(e) => { setAttorneyEmail(e.target.value); setSelectedAttorney('') }}
                  disabled={autoRoute}
                  placeholder="e.g. aaron.gomez31@lawfirm.com"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 mb-3 ${
                    autoRoute ? 'bg-gray-100 text-gray-500 border-gray-200' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label htmlFor="attorney" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Attorney
                </label>
                <select
                  id="attorney"
                  value={selectedAttorney}
                  onChange={(e) => { setSelectedAttorney(e.target.value); setAttorneyEmail('') }}
                  disabled={autoRoute}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-brand-500 focus:border-brand-500 ${
                    autoRoute ? 'bg-gray-100 text-gray-500 border-gray-200' : 'border-gray-300'
                  }`}
                >
                  <option value="">Choose an attorney...</option>
                  {attorneys.map((attorney) => (
                    <option key={attorney.id} value={attorney.id}>
                      {attorney.name} {attorney.isVerified && '✓'} - {attorney.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Optional Message
                </label>
                <textarea
                  id="message"
                  value={routingMessage}
                  onChange={(e) => setRoutingMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Add a note for the attorney (optional)"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRoute}
                  onChange={(e) => setAutoRoute(e.target.checked)}
                  className="form-checkbox"
                />
                Auto Route (use rules engine)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={skipEligibilityCheck}
                  onChange={(e) => setSkipEligibilityCheck(e.target.checked)}
                  className="form-checkbox"
                />
                Skip eligibility checks (force route)
              </label>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRouteModal(false)
                  setError(null)
                  setRouteSuccess(null)
                  setSelectedAttorney('')
                  setAttorneyEmail('')
                  setRoutingMessage('')
                  setSkipEligibilityCheck(false)
                  setAutoRoute(false)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={routing}
              >
                Cancel
              </button>
              <button
                onClick={handleAutoRoute}
                disabled={routing}
                className="px-4 py-2 border border-brand-600 text-brand-600 rounded-md hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {routing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600 mr-2"></div>
                    Auto Routing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Auto Route
                  </>
                )}
              </button>
              <button
                onClick={handleBulkRoute}
                disabled={routing || (!autoRoute && !selectedAttorney && !attorneyEmail.trim())}
                className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {routing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Routing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {autoRoute ? 'Auto Route' : 'Route Cases'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
