import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  getEvidenceFiles, 
  getEvidenceFile,
  updateEvidenceFile, 
  deleteEvidenceFile,
  processEvidenceFile,
  getEvidenceInsights,
  createEvidenceAnnotation
} from '../lib/api'
import { TrashIcon } from '../components/TrashIcon'
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Video,
  Search, 
  Eye,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  Tag,
  Info,
  Settings,
  Grid,
  List
} from 'lucide-react'

interface EvidenceFile {
  id: string
  originalName: string
  filename: string
  mimetype: string
  size: number
  fileUrl: string
  category: string
  subcategory?: string
  description?: string
  dataType?: string
  tags?: string
  relevanceScore?: number
  provenanceSource?: string
  provenanceNotes?: string
  provenanceActor?: string
  provenanceDate?: string
  aiSummary?: string
  aiClassification?: string
  aiHighlights?: string
  assessmentId?: string
  uploadMethod: string
  captureDate?: string
  location?: string
  exifData?: string
  processingStatus: string
  ocrText?: string
  isHIPAA: boolean
  accessLevel: string
  isVerified: boolean
  createdAt: string
  extractedData?: ExtractedData[]
  processingJobs?: ProcessingJob[]
  annotations?: EvidenceAnnotation[]
}

interface EvidenceAnnotation {
  id: string
  content: string
  anchor?: string
  pageNumber?: number
  createdAt: string
}

interface ExtractedData {
  id: string
  icdCodes?: string
  cptCodes?: string
  dollarAmounts?: string
  totalAmount?: number
  currency: string
  dates?: string
  entities?: string
  keywords?: string
  confidence: number
}

interface ProcessingJob {
  id: string
  jobType: string
  status: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
}

export default function EvidenceDashboard() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const navigate = useNavigate()
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingFile, setEditingFile] = useState<EvidenceFile | null>(null)
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  const [allCases, setAllCases] = useState(false)
  const [insights, setInsights] = useState<any>(null)
  const [annotationText, setAnnotationText] = useState('')
  const [annotationPage, setAnnotationPage] = useState('')
  const [annotationAnchor, setAnnotationAnchor] = useState('')
  const [annotationItems, setAnnotationItems] = useState<EvidenceAnnotation[]>([])
  const [tagsInput, setTagsInput] = useState('')
  const [relevanceInput, setRelevanceInput] = useState('')
  const [accessLogs, setAccessLogs] = useState<any[]>([])

  // Load evidence files
  const loadFiles = async () => {
    try {
      setLoading(true)
      const scopeAssessmentId = allCases ? undefined : assessmentId
      const evidenceFiles = await getEvidenceFiles(
        scopeAssessmentId,
        selectedCategory !== 'all' ? selectedCategory : undefined,
        selectedStatus !== 'all' ? selectedStatus : undefined,
        searchTerm || undefined
      )
      setFiles(evidenceFiles)
      setFilteredFiles(evidenceFiles)
    } catch (error) {
      console.error('Failed to load evidence files:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter files based on search and filters
  useEffect(() => {
    let filtered = files

    // Search filter
    if (searchTerm) {
      const needle = searchTerm.toLowerCase()
      filtered = filtered.filter(file => 
        file.originalName.toLowerCase().includes(needle) ||
        file.description?.toLowerCase().includes(needle) ||
        file.category.toLowerCase().includes(needle) ||
        parseTags(file.tags).some(tag => tag.toLowerCase().includes(needle)) ||
        (file.aiSummary || '').toLowerCase().includes(needle) ||
        (file.aiClassification || '').toLowerCase().includes(needle)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => file.category === selectedCategory)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(file => file.processingStatus === selectedStatus)
    }

    setFilteredFiles(filtered)
  }, [files, searchTerm, selectedCategory, selectedStatus])

  // Load files on mount
  useEffect(() => {
    loadFiles()
  }, [assessmentId, allCases, selectedCategory, selectedStatus, searchTerm])

  useEffect(() => {
    if (!assessmentId) {
      setAllCases(true)
    }
  }, [assessmentId])

  useEffect(() => {
    const loadInsights = async () => {
      if (!assessmentId || allCases) {
        setInsights(null)
        return
      }
      try {
        const data = await getEvidenceInsights(assessmentId)
        setInsights(data)
      } catch (error) {
        console.error('Failed to load evidence insights:', error)
        setInsights(null)
      }
    }
    loadInsights()
  }, [assessmentId, allCases])

  // Process file
  const handleProcessFile = async (fileId: string) => {
    try {
      setProcessingFiles(prev => new Set(prev).add(fileId))
      await processEvidenceFile(fileId)
      await loadFiles() // Reload to get updated status
    } catch (error) {
      console.error('Failed to process file:', error)
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteEvidenceFile(fileId)
        await loadFiles()
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }
  }

  // Update file
  const handleUpdateFile = async (fileId: string, updates: any) => {
    try {
      await updateEvidenceFile(fileId, updates)
      await loadFiles()
      setEditingFile(null)
    } catch (error) {
      console.error('Failed to update file:', error)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="h-6 w-6 text-blue-500" />
    if (mimetype.startsWith('video/')) return <Video className="h-6 w-6 text-purple-500" />
    if (mimetype === 'application/pdf') return <FileText className="h-6 w-6 text-red-500" />
    return <File className="h-6 w-6 text-gray-500" />
  }

  // Get processing status icon
  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  // Calculate statistics
  const stats = {
    total: files.length,
    completed: files.filter(f => f.processingStatus === 'completed').length,
    processing: files.filter(f => f.processingStatus === 'processing').length,
    pending: files.filter(f => f.processingStatus === 'pending').length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    totalValue: files.reduce((sum, file) => {
      const extractedData = file.extractedData?.[0]
      return sum + (extractedData?.totalAmount || 0)
    }, 0)
  }

  const parseTags = (value?: string) => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value.split(',').map(tag => tag.trim()).filter(Boolean)
    }
  }

  const openEdit = async (file: EvidenceFile) => {
    setAnnotationText('')
    setAnnotationPage('')
    setAnnotationAnchor('')
    try {
      const detail = await getEvidenceFile(file.id)
      setEditingFile(detail)
      setTagsInput(parseTags(detail.tags).join(', '))
      setRelevanceInput(typeof detail.relevanceScore === 'number' ? String(detail.relevanceScore) : '')
      setAccessLogs(Array.isArray(detail.accessLogs) ? detail.accessLogs : [])
      setAnnotationItems(Array.isArray(detail.annotations) ? detail.annotations : [])
    } catch (error) {
      console.error('Failed to load evidence detail:', error)
      setEditingFile(file)
      setTagsInput(parseTags(file.tags).join(', '))
      setRelevanceInput(typeof file.relevanceScore === 'number' ? String(file.relevanceScore) : '')
      setAccessLogs([])
      setAnnotationItems([])
    }
  }

  const handleAddAnnotation = async () => {
    if (!editingFile || !annotationText.trim()) return
    const payload = {
      content: annotationText.trim(),
      anchor: annotationAnchor || undefined,
      pageNumber: annotationPage ? Number(annotationPage) : undefined
    }
    try {
      const created = await createEvidenceAnnotation(editingFile.id, payload)
      setAnnotationItems(prev => [created, ...prev])
      setAnnotationText('')
      setAnnotationPage('')
      setAnnotationAnchor('')
    } catch (error) {
      console.error('Failed to add annotation:', error)
    }
  }

  const categories = [
    'all', 'medical_records', 'police_report', 'bills', 'wage_loss', 'photos', 'correspondence', 'other'
  ]

  const statuses = [
    'all', 'pending', 'processing', 'completed', 'failed'
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div>
                {assessmentId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/results/${assessmentId}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Back to Result Screen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/attorney-dashboard')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-600 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Back to Attorney Dashboard
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Evidence Dashboard</h1>
                <div className="text-sm text-gray-500">
                  {assessmentId ? `Case ID: ${assessmentId}` : 'All cases'}
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mt-1">
            Manage and analyze your uploaded evidence files
          </p>
        </div>
        <Link
          to={`/evidence-upload/${assessmentId}`}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Evidence
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Files</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-500">Processed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.processing}</div>
          <div className="text-sm text-gray-500">Processing</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{formatFileSize(stats.totalSize)}</div>
          <div className="text-sm text-gray-500">Total Size</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Value</div>
        </div>
      </div>

      {insights && (
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Info className="h-4 w-4 text-brand-500" />
            AI Evidence Intelligence
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Evidence gaps</div>
              <div className="text-gray-900">
                {insights.gaps?.length ? insights.gaps.join(', ') : 'No major gaps detected'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Contradictions</div>
              <div className="text-gray-900">
                {insights.contradictions?.length ? insights.contradictions.join(' • ') : 'None detected'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Severity signals</div>
              <div className="text-gray-900">
                Score {insights.severitySignals?.score ?? 0} • {(insights.severitySignals?.drivers || []).join(' • ')}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Liability signals</div>
              <div className="text-gray-900">
                Score {insights.liabilitySignals?.score ?? 0} • {(insights.liabilitySignals?.drivers || []).join(' • ')}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-gray-500">Medical chronology</div>
              <div className="text-gray-900">
                {insights.medicalChronology?.length ? insights.medicalChronology.join(' • ') : 'No chronology found'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {assessmentId && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={allCases}
                onChange={(e) => setAllCases(e.target.checked)}
              />
              Search across all cases
            </label>
          )}
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">Loading files...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <File className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No files found matching your criteria</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
                    <span className="shrink-0">{getFileIcon(file.mimetype)}</span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {getProcessingStatusIcon(file.processingStatus)}
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="w-8 h-8 flex-none inline-flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label="Delete file"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-xs text-gray-500">
                    <Tag className="h-3 w-3 mr-1" />
                    {file.category.replace(/_/g, ' ')} • {file.dataType || 'unstructured'}
                  </div>

                  {file.aiClassification && (
                    <div className="text-xs text-brand-600">Classified: {file.aiClassification}</div>
                  )}

                  {file.aiSummary && (
                    <div className="text-xs text-gray-600 line-clamp-2">{file.aiSummary}</div>
                  )}

                  {parseTags(file.tags).length > 0 && (
                    <div className="text-xs text-gray-500">
                      Tags: {parseTags(file.tags).slice(0, 4).join(', ')}
                    </div>
                  )}

                  {typeof file.relevanceScore === 'number' && (
                    <div className="text-xs text-gray-500">Relevance: {file.relevanceScore.toFixed(2)}</div>
                  )}

                  {file.processingStatus === 'completed' && file.extractedData && file.extractedData.length > 0 && (
                    <div className="space-y-1">
                      {file.extractedData[0].totalAmount && (
                        <div className="flex items-center text-xs text-green-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${file.extractedData[0].totalAmount.toLocaleString()}
                        </div>
                      )}
                      
                      {file.extractedData[0].dates && JSON.parse(file.extractedData[0].dates || '[]').length > 0 && (
                        <div className="flex items-center text-xs text-blue-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          {JSON.parse(file.extractedData[0].dates || '[]').length} dates
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-400">
                      {allCases && file.assessmentId ? `Case ${file.assessmentId.slice(-6)}` : new Date(file.createdAt).toLocaleDateString()}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEdit(file)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(file.fileUrl, '_blank')}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {file.processingStatus === 'pending' && (
                        <button
                          onClick={() => handleProcessFile(file.id)}
                          disabled={processingFiles.has(file.id)}
                          className="text-green-500 hover:text-green-700 disabled:opacity-50"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Extracted Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(file.mimetype)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {file.originalName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(file.size)}{allCases && file.assessmentId ? ` • Case ${file.assessmentId.slice(-6)}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {file.category.replace(/_/g, ' ')} • {file.dataType || 'unstructured'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getProcessingStatusIcon(file.processingStatus)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {file.processingStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {file.aiClassification && (
                          <div className="text-brand-600">Classified: {file.aiClassification}</div>
                        )}
                        {parseTags(file.tags).length > 0 && (
                          <div className="text-gray-500">Tags: {parseTags(file.tags).slice(0, 3).join(', ')}</div>
                        )}
                        {file.extractedData && file.extractedData.length > 0 ? (
                          <div>
                            {file.extractedData[0].totalAmount && (
                              <div className="text-green-600">
                                ${file.extractedData[0].totalAmount.toLocaleString()}
                              </div>
                            )}
                            {file.extractedData[0].dates && (
                              <div className="text-blue-600">
                                {JSON.parse(file.extractedData[0].dates || '[]').length} dates
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEdit(file)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(file.fileUrl, '_blank')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {file.processingStatus === 'pending' && (
                          <button
                            onClick={() => handleProcessFile(file.id)}
                            disabled={processingFiles.has(file.id)}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="w-8 h-8 flex-none inline-flex items-center justify-center rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                          aria-label="Delete file"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit Evidence Metadata</h2>
              <button
                onClick={() => setEditingFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-500 mb-1">Category</label>
                <input
                  value={editingFile.category}
                  onChange={(e) => setEditingFile({ ...editingFile, category: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Subcategory</label>
                <input
                  value={editingFile.subcategory || ''}
                  onChange={(e) => setEditingFile({ ...editingFile, subcategory: e.target.value })}
                  className="input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-500 mb-1">Description</label>
                <input
                  value={editingFile.description || ''}
                  onChange={(e) => setEditingFile({ ...editingFile, description: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Tags (comma separated)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Relevance score</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={relevanceInput}
                  onChange={(e) => setRelevanceInput(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Provenance source</label>
                <input
                  value={editingFile.provenanceSource || ''}
                  onChange={(e) => setEditingFile({ ...editingFile, provenanceSource: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Provenance actor</label>
                <input
                  value={editingFile.provenanceActor || ''}
                  onChange={(e) => setEditingFile({ ...editingFile, provenanceActor: e.target.value })}
                  className="input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-500 mb-1">Provenance notes</label>
                <input
                  value={editingFile.provenanceNotes || ''}
                  onChange={(e) => setEditingFile({ ...editingFile, provenanceNotes: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-3 space-y-2 text-sm">
              <div className="font-medium text-gray-900">Document Intelligence</div>
              <div className="text-gray-600">Classification: {editingFile.aiClassification || 'Not available'}</div>
              <div className="text-gray-600">Summary: {editingFile.aiSummary || 'Not available'}</div>
              {editingFile.aiHighlights && (
                <div className="text-gray-600">
                  Highlights: {parseTags(editingFile.aiHighlights).join(' • ')}
                </div>
              )}
            </div>

            <div className="rounded-md border border-gray-200 p-3 space-y-2 text-sm">
              <div className="font-medium text-gray-900">Annotations</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  className="input md:col-span-2"
                  placeholder="Add annotation"
                />
                <input
                  value={annotationPage}
                  onChange={(e) => setAnnotationPage(e.target.value)}
                  className="input"
                  placeholder="Page #"
                />
                <input
                  value={annotationAnchor}
                  onChange={(e) => setAnnotationAnchor(e.target.value)}
                  className="input md:col-span-3"
                  placeholder="Anchor or highlight reference"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddAnnotation}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
                >
                  Add Annotation
                </button>
              </div>
              {annotationItems.length === 0 ? (
                <div className="text-gray-500">No annotations yet.</div>
              ) : (
                <div className="space-y-1">
                  {annotationItems.map((item) => (
                    <div key={item.id} className="text-gray-700">
                      {item.content} {item.pageNumber ? `• Page ${item.pageNumber}` : ''} {item.anchor ? `• ${item.anchor}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border border-gray-200 p-3 space-y-2 text-sm">
              <div className="font-medium text-gray-900">Audit Trail</div>
              {accessLogs.length === 0 ? (
                <div className="text-gray-500">No recent access logs.</div>
              ) : (
                <div className="space-y-1 text-gray-600">
                  {accessLogs.slice(0, 5).map((log) => (
                    <div key={log.id}>
                      {log.accessType} • {log.purpose || 'activity'} • {new Date(log.createdAt).toLocaleString()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingFile(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateFile(editingFile.id, {
                  category: editingFile.category,
                  subcategory: editingFile.subcategory,
                  description: editingFile.description,
                  tags: tagsInput,
                  relevanceScore: relevanceInput ? Number(relevanceInput) : undefined,
                  provenanceSource: editingFile.provenanceSource,
                  provenanceActor: editingFile.provenanceActor,
                  provenanceNotes: editingFile.provenanceNotes
                })}
                className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
