import { useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  uploadEvidenceFile, 
  uploadMultipleEvidenceFiles, 
  getEvidenceFiles, 
  processEvidenceFile,
  deleteEvidenceFile 
} from '../lib/api'
import { hasValidAuthToken } from '../lib/auth'
import { TrashIcon } from '../components/TrashIcon'
import { 
  Upload, 
  Camera, 
  FileText, 
  Image, 
  File, 
  Video,
  Eye, 
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  Tag,
  Settings,
  BarChart3,
  ArrowLeft
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

export default function EvidenceUpload() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('other')
  const [selectedSubcategory, setSelectedSubcategory] = useState('')
  const [description, setDescription] = useState('')
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Load existing files
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true)
      const evidenceFiles = await getEvidenceFiles(assessmentId)
      setFiles(evidenceFiles)
    } catch (error) {
      console.error('Failed to load evidence files:', error)
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  // Handle file upload
  const handleFileUpload = async (file: File, uploadMethod: string = 'drag_drop') => {
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assessmentId', assessmentId || '')
      formData.append('category', selectedCategory)
      formData.append('subcategory', selectedSubcategory)
      formData.append('description', description)
      formData.append('uploadMethod', uploadMethod)

      if (uploadMethod === 'camera') {
        formData.append('captureDate', new Date().toISOString())
      }

      const uploadedFile = await uploadEvidenceFile(formData)
      setFiles(prev => [uploadedFile, ...prev])
      
      // Auto-process the file
      await processFile(uploadedFile.id)
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setLoading(false)
    }
  }

  // Process evidence file (requires auth — upload already queues server-side processing for guests)
  const processFile = async (fileId: string) => {
    if (!hasValidAuthToken()) {
      await loadFiles()
      return
    }
    try {
      setProcessingFiles(prev => new Set(prev).add(fileId))
      await processEvidenceFile(fileId)
      // Reload files to get updated processing status
      await loadFiles()
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

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileList = Array.from(e.dataTransfer.files)
      handleMultipleUpload(fileList)
    }
  }, [])

  // Handle multiple file upload
  const handleMultipleUpload = async (fileList: File[]) => {
    try {
      setLoading(true)
      const formData = new FormData()
      
      fileList.forEach(file => {
        formData.append('files', file)
      })
      
      formData.append('assessmentId', assessmentId || '')
      formData.append('category', selectedCategory)
      formData.append('subcategory', selectedSubcategory)
      formData.append('description', description)

      const result = await uploadMultipleEvidenceFiles(formData)
      setFiles(prev => [...result.files, ...prev])
      
      // Auto-process all files
      for (const file of result.files) {
        if (file.id) {
          await processFile(file.id)
        }
      }
    } catch (error) {
      console.error('Failed to upload files:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || [])
    if (fileList.length > 1) {
      handleMultipleUpload(fileList)
      return
    }
    const file = fileList[0]
    if (file) {
      handleFileUpload(file, 'camera')
    }
  }

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || [])
    if (fileList.length > 0) {
      handleMultipleUpload(fileList)
    }
  }

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteEvidenceFile(fileId)
        setFiles(prev => prev.filter(file => file.id !== fileId))
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
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
    if (mimetype.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />
    if (mimetype.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />
    if (mimetype === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />
    return <File className="h-8 w-8 text-gray-500" />
  }

  // Get processing status icon
  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  // Load files on mount
  useState(() => {
    loadFiles()
  })

  const categories = [
    { value: 'medical_records', label: 'Medical Records', subcategories: ['medical_bill', 'lab_result', 'imaging', 'prescription'] },
    { value: 'police_report', label: 'Police Report', subcategories: ['incident_report', 'witness_statement'] },
    { value: 'bills', label: 'Bills & Invoices', subcategories: ['medical_bill', 'repair_bill', 'insurance_bill'] },
    { value: 'wage_loss', label: 'Lost Wages', subcategories: ['pay_stub', 'employer_letter', 'timesheet', 'tax_return'] },
    { value: 'photos', label: 'Photos', subcategories: ['accident_photo', 'damage_photo', 'injury_photo', 'scene_photo'] },
    { value: 'videos', label: 'Videos', subcategories: ['dashcam', 'surveillance', 'scene_video', 'injury_video'] },
    { value: 'correspondence', label: 'Correspondence', subcategories: ['email', 'letter', 'insurance_claim'] },
    { value: 'other', label: 'Other', subcategories: ['miscellaneous'] }
  ]

  const selectedCategoryData = categories.find(cat => cat.value === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {assessmentId && (
        <Link
          to={`/results/${assessmentId}`}
          className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-800 font-medium mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Case Report
        </Link>
      )}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Evidence Upload</h1>
        <p className="text-gray-600">
          Upload photos, documents, and other evidence for your case. 
          All files are automatically processed for key information extraction.
        </p>
      </div>

      {/* Upload Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedSubcategory('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcategory
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select subcategory</option>
              {selectedCategoryData?.subcategories.map(sub => (
                <option key={sub} value={sub}>
                  {sub.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drag and drop files here
          </h3>
          <p className="text-gray-600 mb-4">
            or click to browse files
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Browse Files
            </button>
            
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Supported formats: Images, Videos, PDFs, Word documents</p>
          <p>Maximum file size: 50MB per file</p>
        </div>
      </div>

      {/* Uploaded Files */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Uploaded Files</h2>
          {assessmentId && (
            <Link
              to={`/evidence-dashboard/${assessmentId}`}
              className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Dashboard
            </Link>
          )}
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">Loading files...</span>
          </div>
        )}

        {files.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <File className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No files uploaded yet</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
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
                
                <div className="flex items-center gap-2 shrink-0">
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
                  {file.category.replace(/_/g, ' ')}
                  {file.subcategory && (
                    <span className="ml-1">• {file.subcategory.replace(/_/g, ' ')}</span>
                  )}
                </div>

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
                        {JSON.parse(file.extractedData[0].dates || '[]').length} dates found
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(file.fileUrl, '_blank')}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {file.processingStatus === 'pending' && (
                      <button
                        onClick={() => processFile(file.id)}
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
      </div>
    </div>
  )
}
