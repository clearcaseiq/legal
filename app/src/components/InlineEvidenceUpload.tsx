import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  uploadEvidenceFile, 
  uploadMultipleEvidenceFiles, 
  getEvidenceFiles, 
  processEvidenceFile, 
  deleteEvidenceFile
} from '../lib/api'
import { TrashIcon } from './TrashIcon'
import { 
  Upload, 
  Camera, 
  FileText, 
  Image, 
  File, 
  Eye, 
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Settings
} from 'lucide-react'

interface EvidenceFile {
  id: string
  originalName: string
  filename: string
  mimetype: string
  size: number
  fileUrl: string
  rawFile?: File
  category: string
  subcategory?: string
  description?: string
  uploadMethod: string
  captureDate?: string
  location?: string
  exifData?: string
  processingStatus: string
  ocrText?: string
  aiSummary?: string
  aiClassification?: string
  aiHighlights?: string | string[]
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

interface InlineEvidenceUploadProps {
  assessmentId?: string
  category?: string  // When undefined, loads ALL files for the assessment
  subcategory?: string
  description?: string
  title?: string
  countOverride?: number
  compact?: boolean
  onFilesUploaded?: (files: EvidenceFile[]) => void
  /** Custom label for the primary upload button (e.g. "Upload Photos") */
  uploadButtonLabel?: string
  /** Impact hint shown to motivate uploads (e.g. "+10%") */
  impactHint?: string
  /** When true, always show upload area instead of toggling */
  alwaysShowUpload?: boolean
  /** When true, hide the header (title + count) - for use inside custom card layouts */
  hideHeader?: boolean
}

export default function InlineEvidenceUpload({
  assessmentId,
  category,
  subcategory,
  description,
  title,
  countOverride,
  compact = false,
  onFilesUploaded,
  uploadButtonLabel,
  impactHint,
  alwaysShowUpload = false,
  hideHeader = false
}: InlineEvidenceUploadProps) {
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Load existing files - simplified to prevent infinite loops
  const loadFiles = useCallback(async () => {
    if (!assessmentId || isLoadingFiles) return
    
    try {
      setIsLoadingFiles(true)
      console.log('Loading files for assessment:', assessmentId, 'category:', category)
      
      // Add a small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const evidenceFiles = await getEvidenceFiles(assessmentId, category || undefined)
      console.log('Loaded evidence files:', evidenceFiles)
      setFiles(evidenceFiles)
      // Call onFilesUploaded only once, not in dependency array
      if (onFilesUploaded) {
        onFilesUploaded(evidenceFiles)
      }
    } catch (error: any) {
      console.error('Failed to load evidence files:', error)
      // If it's a 429 error, wait longer before retrying
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting 2 seconds before retry...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        // Don't retry automatically to prevent infinite loops
      }
    } finally {
      setIsLoadingFiles(false)
    }
  }, [assessmentId, category ?? '']) // Removed isLoadingFiles and onFilesUploaded from dependencies

  // Handle file upload
  const handleFileUpload = async (file: File, uploadMethod: string = 'drag_drop') => {
    console.log('handleFileUpload called:', { file: file.name, assessmentId, category })
    
    if (!assessmentId) {
      console.log('No assessmentId available yet, storing file for later upload')
      // Store file locally for later upload when assessment is created
      const tempFile: EvidenceFile = {
        id: `temp_${Date.now()}_${Math.random()}`,
        originalName: file.name,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        fileUrl: URL.createObjectURL(file),
        rawFile: file,
        category: category || 'plaintiff_upload',
        subcategory,
        description,
        uploadMethod,
        processingStatus: 'pending',
        isHIPAA: (category || '') === 'medical_records',
        accessLevel: 'private',
        isVerified: false,
        createdAt: new Date().toISOString()
      }
      
      const newFiles = [tempFile, ...files]
      setFiles(newFiles)
      onFilesUploaded?.(newFiles)
      return
    }
    
    try {
      setLoading(true)
      console.log('Uploading file to server...')
      
      // Add a small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assessmentId', assessmentId)
      formData.append('category', category || 'plaintiff_upload')
      formData.append('subcategory', subcategory || '')
      formData.append('description', description || '')
      formData.append('uploadMethod', uploadMethod)

      if (uploadMethod === 'camera') {
        formData.append('captureDate', new Date().toISOString())
      }

      console.log('Sending upload request...', { 
        fileSize: file.size, 
        fileName: file.name, 
        assessmentId, 
        category 
      })
      
      // Skip simple test to reduce server load
      console.log('Proceeding with full upload...')
      const uploadedFile = await uploadEvidenceFile(formData)
      console.log('File uploaded successfully:', uploadedFile)
      const newFiles = [uploadedFile, ...files]
      setFiles(newFiles)
      onFilesUploaded?.(newFiles)
      
      // Auto-process the file
      await processFile(uploadedFile.id)
    } catch (error: any) {
      console.error('Failed to upload file:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        alert('Server is busy. Please wait a moment and try again.')
      } else {
        alert(`Failed to upload file: ${error.response?.data?.details || error.response?.data?.error || error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Process evidence file
  const processFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token || token.split('.').length !== 3) {
        // Skip processing when not authenticated
        return
      }
      setProcessingFiles(prev => new Set(prev).add(fileId))
      await processEvidenceFile(fileId)
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
    console.log('handleMultipleUpload called:', { fileCount: fileList.length, assessmentId, category })
    const token = localStorage.getItem('auth_token')
    const hasValidToken = !!token && token.split('.').length === 3
    if (!hasValidToken) {
      // Fall back to single uploads when not authenticated
      for (const file of fileList) {
        await handleFileUpload(file)
      }
      return
    }
    
    if (!assessmentId) {
      console.log('No assessmentId available yet, storing files for later upload')
      // Store files locally for later upload when assessment is created
      const tempFiles: EvidenceFile[] = fileList.map(file => ({
        id: `temp_${Date.now()}_${Math.random()}`,
        originalName: file.name,
        filename: file.name,
        mimetype: file.type,
        size: file.size,
        fileUrl: URL.createObjectURL(file),
        rawFile: file,
        category: category || 'plaintiff_upload',
        subcategory,
        description,
        uploadMethod: 'drag_drop',
        processingStatus: 'pending',
        isHIPAA: (category || '') === 'medical_records',
        accessLevel: 'private',
        isVerified: false,
        createdAt: new Date().toISOString()
      }))
      
      console.log('Storing temp files locally:', tempFiles.length)
      const newFiles = [...tempFiles, ...files]
      setFiles(newFiles)
      onFilesUploaded?.(newFiles)
      return
    }
    
      console.log('Assessment ID available, proceeding with upload to server')
      
      try {
        setLoading(true)
        console.log('Uploading files to server...')
        
        // Add a delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const formData = new FormData()
      
      fileList.forEach(file => {
        formData.append('files', file)
      })
      
      formData.append('assessmentId', assessmentId)
      formData.append('category', category || 'plaintiff_upload')
      formData.append('subcategory', subcategory || '')
      formData.append('description', description || '')

      console.log('Sending multiple upload request...', { 
        fileCount: fileList.length, 
        assessmentId, 
        category 
      })
      
      const result = await uploadMultipleEvidenceFiles(formData)
      console.log('Files uploaded successfully:', result)
      const newFiles = [...result.files, ...files]
      setFiles(newFiles)
      onFilesUploaded?.(newFiles)
      
      // Auto-process all files
      for (const file of result.files) {
        if (file.id) {
          await processFile(file.id)
        }
      }
    } catch (error: any) {
      const status = error.response?.status
      if (status === 401 || status === 403) {
        // Fall back to single uploads when auth fails
        for (const file of fileList) {
          await handleFileUpload(file)
        }
        return
      }
      console.error('Failed to upload files:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      
      // Handle rate limiting
      if (status === 429) {
        alert('Server is busy. Please wait a moment and try again.')
      } else {
        alert(`Failed to upload files: ${error.response?.data?.details || error.response?.data?.error || error.message}`)
      }
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
    console.log('handleFileInput called:', e.target.files)
    const fileList = Array.from(e.target.files || [])
    console.log('File list:', fileList.map(f => f.name))
    console.log('Assessment ID:', assessmentId)
    console.log('Category:', category)
    
    if (fileList.length > 0) {
      console.log('Calling handleMultipleUpload with files:', fileList.length)
      handleMultipleUpload(fileList)
    } else {
      console.log('No files selected')
    }
    
    // Reset the input value to allow selecting the same file again
    e.target.value = ''
  }

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return

    const removeFromState = () => {
      setFiles(prev => {
        const next = prev.filter(file => file.id !== fileId)
        onFilesUploaded?.(next)
        return next
      })
    }

    // Temp files (not yet uploaded) - remove from state only, no API call
    if (String(fileId).startsWith('temp_')) {
      removeFromState()
      return
    }

    // Server files - call API then update state
    try {
      await deleteEvidenceFile(fileId)
      removeFromState()
    } catch (error) {
      console.error('Failed to delete file:', error)
      removeFromState()
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
    if (mimetype.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />
    if (mimetype === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  // Build AI extracted summary for display (Treatment, Diagnosis, Provider)
  const getAIExtractedSummary = (file: EvidenceFile): { treatment?: string; diagnosis?: string; provider?: string; amounts?: string } | null => {
    const ext = file.extractedData?.[0]
    const hasData = ext || file.aiSummary || file.aiClassification
    if (!hasData || file.processingStatus !== 'completed') return null
    const result: Record<string, string> = {}
    if (ext?.icdCodes) {
      try {
        const codes = typeof ext.icdCodes === 'string' ? JSON.parse(ext.icdCodes) : ext.icdCodes
        if (Array.isArray(codes) && codes[0]) result.diagnosis = codes[0]
      } catch (_) {}
    }
    if (file.aiSummary) result.treatment = file.aiSummary
    if (ext?.dollarAmounts) {
      try {
        const amts = typeof ext.dollarAmounts === 'string' ? JSON.parse(ext.dollarAmounts) : ext.dollarAmounts
        if (Array.isArray(amts) && amts.length) result.amounts = amts.slice(0, 3).join(', ')
      } catch (_) {}
    }
    const cat = file.aiClassification || file.category
    result.provider = cat === 'medical_records' ? 'Medical provider' : cat === 'bills' ? 'Billing' : cat === 'police_report' ? 'Police' : (cat || 'Document').replace(/_/g, ' ')
    return Object.keys(result).length ? result : null
  }

  // Get processing status icon
  const getProcessingStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'processing':
        return <Clock className="h-3 w-3 text-yellow-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  // Load files when component mounts or assessmentId changes - completely rewritten
  useEffect(() => {
    let isMounted = true
    
    const loadFilesOnce = async () => {
      if (!assessmentId || isLoadingFiles || !isMounted) return
      
      try {
        setIsLoadingFiles(true)
        console.log('useEffect triggered - loading files for assessment:', assessmentId, 'category:', category)
        const evidenceFiles = await getEvidenceFiles(assessmentId, category || undefined)
        
        if (isMounted) {
          console.log('Loaded evidence files:', evidenceFiles)
          setFiles(evidenceFiles)
          if (onFilesUploaded) {
            onFilesUploaded(evidenceFiles)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load evidence files:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoadingFiles(false)
        }
      }
    }
    
    loadFilesOnce()
    
    return () => {
      isMounted = false
    }
  }, [assessmentId, category]) // Only depend on assessmentId and category

  if (compact) {
    const showUploadArea = alwaysShowUpload || showUpload
    return (
      <div className="space-y-3">
        {!hideHeader && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">
            {title || 'Upload Evidence'}
            <span className="text-gray-500 font-normal ml-1">
              {countOverride ?? files.length} uploaded
            </span>
            {loading && <span className="ml-2 text-xs text-blue-600">Uploading...</span>}
          </h4>
          {!alwaysShowUpload && (
            <button
              onClick={() => setShowUpload(!showUpload)}
              disabled={loading}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium disabled:opacity-50"
            >
              {showUpload ? 'Hide' : 'Add Files'}
            </button>
          )}
        </div>
        )}

        {impactHint && (
          <p className="text-xs text-green-600 font-medium">{impactHint}</p>
        )}

        {showUploadArea && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadButtonLabel || 'Upload Files'}
              </button>
              
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
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
        )}

        {files.length > 0 && (
          <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex flex-col gap-1 bg-gray-50 p-2 rounded">
                <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
                  <span className="shrink-0">{getFileIcon(file.mimetype)}</span>
                  <span className="text-sm text-gray-900 truncate min-w-0">
                    {file.originalName}
                  </span>
                  <span className="shrink-0">{getProcessingStatusIcon(file.processingStatus)}</span>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => window.open(file.fileUrl, '_blank')}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="w-8 h-8 flex-none inline-flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete file"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
                </div>
                {(() => {
                  const summary = getAIExtractedSummary(file)
                  if (!summary) return null
                  const parts = [
                    summary.treatment && `Treatment: ${summary.treatment}`,
                    summary.diagnosis && `Diagnosis: ${summary.diagnosis}`,
                    summary.provider && `Provider: ${summary.provider}`,
                    summary.amounts && `Amounts: ${summary.amounts}`
                  ].filter(Boolean)
                  if (parts.length === 0) return null
                  return (
                    <div className="text-xs text-brand-700 bg-brand-50/70 px-2 py-1.5 rounded border border-brand-100">
                      <span className="font-medium">AI extracted:</span> {parts.join(' • ')}
                    </div>
                  )
                })()}
              </div>
            ))}
            
            {files.length > 0 && !assessmentId && (
              <p className="text-xs text-yellow-600 text-center bg-yellow-50 p-2 rounded">
                Files will be uploaded when you complete the assessment
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          {title || (category ? `Upload Evidence - ${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : 'Upload Evidence')}
        </h4>
        <span className="text-sm text-gray-500">{files.length} files</span>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
        <h5 className="text-sm font-medium text-gray-900 mb-2">
          Drag and drop files here
        </h5>
        <p className="text-xs text-gray-600 mb-4">
          or click to browse files
        </p>
        
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Browse Files
          </button>
          
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <Camera className="h-4 w-4 mr-1" />
            Take Photo
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt"
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

      {files.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">Uploaded Files</h5>
          {files.map((file) => (
            <div key={file.id} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
                {getFileIcon(file.mimetype)}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0">{getProcessingStatusIcon(file.processingStatus)}</span>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {file.processingStatus === 'completed' && file.extractedData && file.extractedData.length > 0 && file.extractedData[0].totalAmount && (
                  <span className="text-green-600 flex items-center text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    ${file.extractedData[0].totalAmount.toLocaleString()}
                  </span>
                )}
                
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
                
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="w-8 h-8 flex-none inline-flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                  aria-label="Delete file"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
              </div>
              {(() => {
                const summary = getAIExtractedSummary(file)
                if (!summary) return null
                const parts = [
                  summary.treatment && `Treatment: ${summary.treatment}`,
                  summary.diagnosis && `Diagnosis: ${summary.diagnosis}`,
                  summary.provider && `Provider: ${summary.provider}`,
                  summary.amounts && `Amounts: ${summary.amounts}`
                ].filter(Boolean)
                if (parts.length === 0) return null
                return (
                  <div className="text-xs text-brand-700 bg-brand-50/70 px-2 py-1.5 rounded border border-brand-100">
                    <span className="font-medium">AI extracted:</span> {parts.join(' • ')}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>Supported: Images, PDFs, Documents • Max 50MB per file</p>
        <p>Files are automatically processed for medical codes, amounts, and dates</p>
      </div>
    </div>
  )
}
