import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  uploadEvidenceFile, 
  uploadMultipleEvidenceFiles, 
  getEvidenceFiles, 
  processEvidenceFile, 
  deleteEvidenceFile,
  precheckEvidenceImage
} from '../lib/api'
import { TrashIcon } from './TrashIcon'
import { CameraCaptureModal } from './CameraCaptureModal'
import { openEvidenceFile } from '../lib/evidenceFileUrl'
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

/** The <input accept> value for a given evidence category so the OS file picker
 * pre-filters to the right kind of file (e.g. only images for the Photos row). */
function acceptForCategory(category?: string): string {
  if (category === 'photos') return 'image/*'
  if (category === 'video') return 'video/*'
  return 'image/*,video/*,application/pdf,.doc,.docx,.txt'
}

/** Hard client-side type guard so a category that expects one kind of file can't
 * accept the wrong one (e.g. a PDF/video dropped into Photos) (#21). */
function isAllowedForCategory(file: File, category?: string): boolean {
  const name = file.name || ''
  const isImage =
    file.type.startsWith('image/') ||
    (!file.type && /\.(jpe?g|png|gif|bmp|webp|heic|heif|tiff?)$/i.test(name))
  const isVideo =
    file.type.startsWith('video/') ||
    (!file.type && /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv|mpe?g|ogv)$/i.test(name))
  if (category === 'photos') return isImage
  if (category === 'video') return isVideo
  return true
}

type VisionVerdict = {
  status?: string
  message?: string | null
  expected?: string
  topLabels?: { name: string; confidence: number }[]
}

type VisionWarning = {
  fileName: string
  status: string
  message: string
  /** Optional bold heading shown above the message (falls back to fileName). */
  title?: string
  /** Optional primary action (e.g. "Move to Videos") rendered next to Dismiss. */
  action?: { label: string; onClick: () => void }
}

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

function tightUploadCountLabel(category: string | undefined, count: number): string {
  const n = count
  const p = (singular: string, plural: string) =>
    `${n} ${n === 1 ? singular : plural}`
  switch (category) {
    case 'photos':
      return p('photo', 'photos')
    case 'bills':
      return p('bill', 'bills')
    case 'medical_records':
      return p('record', 'records')
    case 'police_report':
      return p('report', 'reports')
    default:
      return p('file', 'files')
  }
}

interface InlineEvidenceUploadProps {
  assessmentId?: string
  category?: string  // When undefined, loads ALL files for the assessment
  subcategory?: string
  description?: string
  title?: string
  initialFiles?: EvidenceFile[]
  countOverride?: number
  compact?: boolean
  onFilesUploaded?: (files: EvidenceFile[]) => void
  /** Custom label for the primary upload button (e.g. "Upload Photos") */
  uploadButtonLabel?: string
  /** Override the primary upload button color classes (bg/text/hover). */
  uploadButtonColorClass?: string
  /** Impact hint shown to motivate uploads (e.g. "+10%") */
  impactHint?: string
  /** When true, always show upload area instead of toggling */
  alwaysShowUpload?: boolean
  /** When true, hide the header (title + count) - for use inside custom card layouts */
  hideHeader?: boolean
  /** Smaller dashed zone + buttons for dense grids (quick intake evidence). */
  tightChrome?: boolean
  /** Hide the camera capture button when the parent screen only wants upload actions. */
  hideCameraButton?: boolean
  /** Hide the component's own tight summary row + "Manage" trigger (parent renders its own trigger). */
  hideTightSummary?: boolean
  /** Controlled open state for the manage-files modal popup. */
  manageOpen?: boolean
  /** Called when the manage-files modal popup requests to open/close. */
  onManageOpenChange?: (open: boolean) => void
  /**
   * Called when the user opts to move a file flagged as the wrong type
   * (e.g. a video dropped onto a document/photo section) to a better-fit
   * category. The parent owns cross-category file state, so it performs the move.
   */
  onMoveMismatch?: (fileName: string, targetCategory: string) => void
  /** When true, the component does not render its own relevance warnings (a parent renders them instead). */
  hideInlineWarnings?: boolean
  /** Receives the current relevance warnings plus a dismiss handler so a parent can render them elsewhere. */
  onWarningsChange?: (warnings: VisionWarning[], dismiss: (fileName: string) => void) => void
  /**
   * Optional external element to use as the drag-and-drop target instead of the
   * component's own (often tiny) root. When provided, the parent can make a much
   * larger surface — e.g. an entire card/row — accept dropped files. The
   * component's own root drag handlers are disabled to avoid double-handling.
   */
  dropTargetRef?: React.RefObject<HTMLElement | null>
  /** Notifies the parent when files are being dragged over the external drop target (for highlight UI). */
  onDragStateChange?: (active: boolean) => void
}

const EMPTY_INITIAL_FILES: EvidenceFile[] = []

export default function InlineEvidenceUpload({
  assessmentId,
  category,
  subcategory,
  description,
  title,
  initialFiles = EMPTY_INITIAL_FILES,
  countOverride,
  compact = false,
  onFilesUploaded,
  uploadButtonLabel,
  uploadButtonColorClass,
  impactHint,
  alwaysShowUpload = false,
  hideHeader = false,
  tightChrome = false,
  hideCameraButton = false,
  hideTightSummary = false,
  manageOpen,
  onManageOpenChange,
  onMoveMismatch,
  hideInlineWarnings = false,
  onWarningsChange,
  dropTargetRef,
  onDragStateChange,
}: InlineEvidenceUploadProps) {
  const [files, setFiles] = useState<EvidenceFile[]>(() => initialFiles)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [showTightManage, setShowTightManage] = useState(false)
  const [visionWarnings, setVisionWarnings] = useState<VisionWarning[]>([])
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deletingFile, setDeletingFile] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show a transient "uploaded successfully" confirmation. Users previously had
  // no visible signal that an upload finished (only a console.log), so uploads
  // felt like they did nothing (#15).
  const flashUploadSuccess = useCallback((count: number) => {
    const label = count === 1 ? 'File uploaded successfully.' : `${count} files uploaded successfully.`
    setSuccessMessage(label)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const isManageControlled = manageOpen !== undefined
  const manageModalOpen = isManageControlled ? manageOpen : showTightManage
  const setManageModalOpen = (open: boolean) => {
    if (isManageControlled) onManageOpenChange?.(open)
    else setShowTightManage(open)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  // "Take Photo" opens a real getUserMedia capture flow (works on desktop, where the
  // native <input capture> attribute is ignored and only opens the file picker).
  const [showCamera, setShowCamera] = useState(false)

  // Notify the parent whenever the file list changes via a dedicated effect
  // instead of calling onFilesUploaded inside a setFiles updater. React can run
  // state updaters during render, and invoking the parent's setState from there
  // triggered a "Cannot update a component while rendering a different
  // component" warning. Skipping the first run avoids echoing the parent's own
  // initialFiles straight back to it on mount.
  const onFilesUploadedRef = useRef(onFilesUploaded)
  onFilesUploadedRef.current = onFilesUploaded
  const didNotifyMountRef = useRef(false)
  useEffect(() => {
    if (!didNotifyMountRef.current) {
      didNotifyMountRef.current = true
      return
    }
    onFilesUploadedRef.current?.(files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const prependFiles = useCallback((incomingFiles: EvidenceFile[]) => {
    if (incomingFiles.length === 0) return
    setFiles((prev) => [...incomingFiles, ...prev])
  }, [])

  const addVisionWarning = useCallback((fileName: string, vision: VisionVerdict | null | undefined) => {
    if (!vision) return
    const status = vision.status || ''
    if (status === 'relevant') {
      // Positive confirmation so the user can see the check ran and passed.
      setVisionWarnings((prev) => [
        ...prev.filter((w) => w.fileName !== fileName),
        { fileName, status, message: 'Looks good — this matches what we expected for this section.' },
      ])
      return
    }
    if (status !== 'mismatch' && status !== 'review') return
    const message = vision.message || `This file may not match ${vision.expected || 'the selected category'}.`
    setVisionWarnings((prev) => [...prev.filter((w) => w.fileName !== fileName), { fileName, status, message }])
  }, [])

  const dismissVisionWarning = useCallback((fileName: string) => {
    setVisionWarnings((prev) => prev.filter((w) => w.fileName !== fileName))
  }, [])

  useEffect(() => {
    onWarningsChange?.(visionWarnings, dismissVisionWarning)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visionWarnings])

  const runVisionPrecheck = useCallback(async (file: File) => {
    // Some browsers (notably on Windows) report an empty MIME type for picked
    // images, so fall back to the file extension before skipping the check.
    const isImage =
      file.type.startsWith('image/') ||
      (!file.type && /\.(jpe?g|png|gif|bmp|webp|heic|heif|tiff?)$/i.test(file.name))
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    const isVideo =
      file.type.startsWith('video/') ||
      (!file.type && /\.(mp4|mov|avi|wmv|mkv|webm|m4v|3gp|flv|mpe?g|ogv)$/i.test(file.name))

    // A video only belongs in the dedicated "video" section. Anywhere else
    // (police report, medical records, bills, etc.) it's almost certainly the
    // wrong kind of file, so surface a non-blocking mismatch warning and offer
    // a one-tap move to the Videos section when the parent supports it.
    if (isVideo) {
      if (category && category !== 'video') {
        const canMove = typeof onMoveMismatch === 'function'
        setVisionWarnings((prev) => [
          ...prev.filter((w) => w.fileName !== file.name),
          {
            fileName: file.name,
            status: 'mismatch',
            title: `${file.name} looks like a video.`,
            message: canMove
              ? 'Move it to Videos for the right place?'
              : 'Videos belong in the Videos section.',
            action: canMove
              ? {
                  label: 'Move to Videos',
                  onClick: () => {
                    onMoveMismatch?.(file.name, 'video')
                    dismissVisionWarning(file.name)
                  },
                }
              : undefined,
          },
        ])
      }
      return
    }

    if (!isImage && !isPdf) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', category || 'other')
      const res = await precheckEvidenceImage(fd)
      addVisionWarning(file.name, res?.vision)
    } catch {
      // Non-blocking: relevance pre-check failures never interrupt the upload.
    }
  }, [category, addVisionWarning, dismissVisionWarning, onMoveMismatch])

  useEffect(() => {
    if (files.length === 0) {
      setShowTightManage(false)
      if (isManageControlled && manageOpen) onManageOpenChange?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length])

  useEffect(() => {
    if (!assessmentId) {
      setFiles(initialFiles)
    }
  }, [assessmentId, initialFiles])

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
    if (!isAllowedForCategory(file, category)) {
      const expected = category === 'photos' ? 'a photo (image)' : category === 'video' ? 'a video' : 'a supported file'
      setVisionWarnings((prev) => [
        ...prev.filter((w) => w.fileName !== file.name),
        { fileName: file.name, status: 'mismatch', title: `${file.name} can’t be added here.`, message: `This section only accepts ${expected}. Please choose a different file.` },
      ])
      return
    }
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
      
      prependFiles([tempFile])
      void runVisionPrecheck(file)
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
      prependFiles([uploadedFile])
      flashUploadSuccess(1)
      addVisionWarning(uploadedFile.originalName || file.name, uploadedFile.vision)
      
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
    if (e.type === "dragenter") {
      dragDepth.current += 1
      setDragActive(true)
    } else if (e.type === "dragover") {
      // Required so the browser fires a `drop` event on this element
      setDragActive(true)
    } else if (e.type === "dragleave") {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    setDragActive(false)

    const dropped = e.dataTransfer?.files
    if (dropped && dropped.length > 0) {
      handleMultipleUpload(Array.from(dropped))
    }
  }, [])

  // Latest callbacks held in refs so the external drop-target listener effect can
  // stay attached (deps: [dropTargetRef]) without re-binding on every render.
  const latestDropRef = useRef<(files: File[]) => void>(() => {})
  latestDropRef.current = (files: File[]) => { void handleMultipleUpload(files) }
  const onDragStateChangeRef = useRef(onDragStateChange)
  onDragStateChangeRef.current = onDragStateChange

  // Bind drag-and-drop to an external element (e.g. a whole card/row) when the
  // parent supplies one, so users can drop anywhere on that surface — not just
  // the component's small button area.
  useEffect(() => {
    const el = dropTargetRef?.current
    if (!el) return

    const setActive = (active: boolean) => {
      setDragActive(active)
      onDragStateChangeRef.current?.(active)
    }
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current += 1
      setActive(true)
    }
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      setActive(true)
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setActive(false)
    }
    const onDropNative = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = 0
      setActive(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) latestDropRef.current(Array.from(files))
    }

    el.addEventListener('dragenter', onDragEnter)
    el.addEventListener('dragover', onDragOver)
    el.addEventListener('dragleave', onDragLeave)
    el.addEventListener('drop', onDropNative)
    return () => {
      el.removeEventListener('dragenter', onDragEnter)
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('dragleave', onDragLeave)
      el.removeEventListener('drop', onDropNative)
    }
  }, [dropTargetRef])

  // Reject files that don't match the section's expected type (e.g. a PDF/video
  // dropped into Photos), surfacing a clear warning instead of silently
  // uploading the wrong kind of file (#21).
  const filterAllowedFiles = (fileList: File[]): File[] => {
    const allowed: File[] = []
    const rejected: File[] = []
    for (const f of fileList) {
      if (isAllowedForCategory(f, category)) allowed.push(f)
      else rejected.push(f)
    }
    if (rejected.length > 0) {
      const expected = category === 'photos' ? 'a photo (image)' : category === 'video' ? 'a video' : 'a supported file'
      setVisionWarnings((prev) => [
        ...prev.filter((w) => !rejected.some((r) => r.name === w.fileName)),
        ...rejected.map((r) => ({
          fileName: r.name,
          status: 'mismatch',
          title: `${r.name} can’t be added here.`,
          message: `This section only accepts ${expected}. Please choose a different file.`,
        })),
      ])
    }
    return allowed
  }

  // Handle multiple file upload
  const handleMultipleUpload = async (rawFileList: File[]) => {
    const fileList = filterAllowedFiles(rawFileList)
    if (fileList.length === 0) return
    console.log('handleMultipleUpload called:', { fileCount: fileList.length, assessmentId, category })

    if (!assessmentId) {
      console.log('No assessmentId available yet, storing files for later upload')
      const tempFiles: EvidenceFile[] = fileList.map((file) => ({
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
        createdAt: new Date().toISOString(),
      }))
      console.log('Storing temp files locally:', tempFiles.length)
      prependFiles(tempFiles)
      fileList.forEach((file) => void runVisionPrecheck(file))
      return
    }

    const token = localStorage.getItem('auth_token')
    const hasValidToken = !!token && token.split('.').length === 3
    if (!hasValidToken) {
      for (const file of fileList) {
        await handleFileUpload(file)
      }
      return
    }

    console.log('Assessment ID available, proceeding with upload to server')

    try {
      setLoading(true)
      console.log('Uploading files to server...')
      await new Promise((resolve) => setTimeout(resolve, 300))

      const formData = new FormData()

      fileList.forEach((file) => {
        formData.append('files', file)
      })

      formData.append('assessmentId', assessmentId)
      formData.append('category', category || 'plaintiff_upload')
      formData.append('subcategory', subcategory || '')
      formData.append('description', description || '')

      console.log('Sending multiple upload request...', {
        fileCount: fileList.length,
        assessmentId,
        category,
      })

      const result = await uploadMultipleEvidenceFiles(formData)
      console.log('Files uploaded successfully:', result)
      prependFiles(result.files || [])
      flashUploadSuccess((result.files || []).length || fileList.length)

      for (const file of (result.files || [])) {
        addVisionWarning(file.originalName || file.filename, file.vision)
      }

      for (const file of result.files) {
        if (file.id) {
          await processFile(file.id)
        }
      }
    } catch (error: any) {
      const status = error.response?.status
      if (status === 401 || status === 403) {
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
        statusText: error.response?.statusText,
      })

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

  // Delete file — open a styled in-app confirmation instead of a native
  // browser confirm() dialog (#9).
  const handleDeleteFile = (fileId: string) => {
    setPendingDeleteId(fileId)
  }

  const performDelete = async (fileId: string) => {
    const removeFromState = () => {
      setFiles(prev => prev.filter(file => file.id !== fileId))
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

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    setDeletingFile(true)
    try {
      await performDelete(pendingDeleteId)
    } finally {
      setDeletingFile(false)
      setPendingDeleteId(null)
    }
  }

  const pendingDeleteFile = pendingDeleteId ? files.find(file => file.id === pendingDeleteId) : null

  // Shared delete confirmation modal. Rendered in BOTH the compact and
  // non-compact returns — previously it only lived in the non-compact branch,
  // so in compact mode (e.g. the "Supporting Documents" evidence step) clicking
  // the trash icon set pendingDeleteId but no dialog ever mounted, making it
  // impossible to delete uploaded files.
  const deleteConfirmModal = pendingDeleteId ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-file-title"
      onClick={() => { if (!deletingFile) setPendingDeleteId(null) }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 id="delete-file-title" className="text-base font-semibold text-gray-900">Delete this file?</h3>
            <p className="mt-1 text-sm text-gray-600">
              {pendingDeleteFile?.originalName
                ? <>“<span className="font-medium break-words">{pendingDeleteFile.originalName}</span>” will be removed. This can’t be undone.</>
                : 'This file will be removed. This can’t be undone.'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPendingDeleteId(null)}
            disabled={deletingFile}
            className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deletingFile}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deletingFile ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  // Transient success confirmation shown after an upload completes (#15).
  const uploadSuccessToast = successMessage ? (
    <div
      className="fixed bottom-5 left-1/2 z-[95] -translate-x-1/2 transform"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
        <CheckCircle className="h-4 w-4" aria-hidden />
        <span>{successMessage}</span>
      </div>
    </div>
  ) : null

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
    const tight = tightChrome
    return (
      <div
        onDragEnter={dropTargetRef ? undefined : handleDrag}
        onDragLeave={dropTargetRef ? undefined : handleDrag}
        onDragOver={dropTargetRef ? undefined : handleDrag}
        onDrop={dropTargetRef ? undefined : handleDrop}
        className={`relative rounded-lg transition-colors ${tight ? 'space-y-1.5' : 'space-y-3'} ${dragActive && !dropTargetRef ? 'ring-2 ring-brand-400 ring-offset-2' : ''}`}
      >
        {dragActive && !dropTargetRef && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-brand-500 bg-brand-50/90 text-xs font-semibold text-brand-700">
            Drop your files to upload
          </div>
        )}
        {!hideHeader && (
          <div className="flex items-center justify-between">
            <h4 className={`font-medium text-gray-700 ${tight ? 'text-xs' : 'text-sm'}`}>
              {title || 'Upload Evidence'}
              <span className="ml-1 font-normal text-gray-500">
                {countOverride ?? files.length} uploaded
              </span>
              {loading && <span className="ml-2 text-[11px] text-blue-600">Uploading...</span>}
            </h4>
            {!alwaysShowUpload && (
              <button
                type="button"
                onClick={() => setShowUpload(!showUpload)}
                disabled={loading}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {showUpload ? 'Hide' : 'Add Files'}
              </button>
            )}
          </div>
        )}

        {!hideInlineWarnings && visionWarnings.length > 0 && (
          <div className="space-y-1.5">
            {visionWarnings.map((warning) => (
              <div
                key={warning.fileName}
                className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${
                  warning.status === 'mismatch'
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                    : warning.status === 'relevant'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300'
                }`}
              >
                {warning.status === 'relevant' ? (
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{warning.title || warning.fileName}</p>
                  <p>{warning.message}</p>
                </div>
                {warning.action && (
                  <button
                    type="button"
                    onClick={warning.action.onClick}
                    className="shrink-0 rounded px-1 text-[11px] font-bold text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
                  >
                    {warning.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissVisionWarning(warning.fileName)}
                  className="shrink-0 rounded px-1 text-[10px] font-bold uppercase tracking-wide opacity-70 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {impactHint && (
          <p className={`font-medium text-green-600 ${tight ? 'text-[11px]' : 'text-xs'}`}>{impactHint}</p>
        )}

        {showUploadArea && (
          <div
            className={`rounded-lg border-2 border-dashed transition-colors ${
              dragActive
                ? 'border-brand-500 bg-brand-50'
                : hideCameraButton && tight
                  ? 'border-transparent'
                  : 'border-gray-300'
            } ${hideCameraButton && tight ? 'p-0' : tight ? 'p-2' : 'p-4'}`}
          >
            <div className={`flex flex-wrap items-center ${tight ? 'justify-center gap-1.5' : 'justify-center gap-3'} ${hideCameraButton ? 'w-full' : ''}`}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className={`inline-flex items-center justify-center rounded-md font-medium disabled:opacity-50 ${
                  uploadButtonColorClass || 'bg-brand-600 text-white hover:bg-brand-700'
                } ${
                  tight ? 'min-h-0 h-[26px] gap-1 px-3 py-0 text-[11px] font-semibold leading-none shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-px' : 'px-4 py-2 text-sm'
                } ${
                  hideCameraButton ? 'w-full' : ''
                }`}
              >
                <Upload className={`shrink-0 ${tight ? 'h-3 w-3' : 'mr-2 h-4 w-4'}`} />
                {uploadButtonLabel || 'Upload Files'}
              </button>

              {!hideCameraButton && (
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={loading}
                  className={`flex items-center rounded-lg bg-green-600 font-medium text-white hover:bg-green-700 disabled:opacity-50 ${
                    tight ? 'min-h-8 px-2.5 py-1 text-[11px]' : 'px-4 py-2 text-sm'
                  }`}
                >
                  <Camera className={`mr-1 shrink-0 ${tight ? 'h-3 w-3' : 'mr-2 h-4 w-4'}`} />
                  {tight ? 'Photo' : 'Take Photo'}
                </button>
              )}
            </div>
            {!tight && (
              <p className="mt-2 text-center text-xs text-gray-500">
                {dragActive ? 'Drop your files to upload' : 'or drag and drop files here'}
              </p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptForCategory(category)}
          onChange={handleFileInput}
          className="hidden"
        />

        {!hideCameraButton && (
          <input
            ref={cameraInputRef}
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
        )}

        {files.length > 0 && tight && !hideTightSummary && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2 rounded border border-brand-200/80 bg-brand-50 px-2 py-0 leading-none dark:border-brand-800/60 dark:bg-brand-950/40">
              <span className="min-w-0 truncate text-[11px] font-semibold leading-none text-brand-950 dark:text-brand-100">
                {tightUploadCountLabel(category, files.length)}
              </span>
              <button
                type="button"
                onClick={() => setManageModalOpen(true)}
                className="my-1 shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-brand-800 shadow-sm ring-1 ring-brand-200 hover:bg-brand-100 dark:bg-brand-900 dark:text-brand-100 dark:ring-brand-700 dark:hover:bg-brand-800"
              >
                Manage
              </button>
            </div>

            {files.length > 0 && !assessmentId && (
              <p className="text-center text-[10px] font-medium leading-tight text-emerald-700">
                ✓ Saved securely · uploads when you submit
              </p>
            )}
          </div>
        )}

        {tight && (
          <>
            {manageModalOpen && (
              <div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`tight-evidence-manage-${category ?? 'upload'}`}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setManageModalOpen(false)
                }}
              >
                <div className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                    <h3 id={`tight-evidence-manage-${category ?? 'upload'}`} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
                      <span className="truncate">{description || title || 'Manage files'}</span>
                      <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">{files.length}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setManageModalOpen(false)}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Done
                    </button>
                  </div>
                  <div className="space-y-2 overflow-y-auto p-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <span className="mt-0.5 shrink-0">{getFileIcon(file.mimetype)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{file.originalName}</p>
                            <p className="text-[11px] text-gray-500">
                              {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                            {(() => {
                              const summary = getAIExtractedSummary(file)
                              if (!summary) return null
                              const parts = [
                                summary.treatment && `Treatment: ${summary.treatment}`,
                                summary.diagnosis && `Diagnosis: ${summary.diagnosis}`,
                                summary.provider && `Provider: ${summary.provider}`,
                                summary.amounts && `Amounts: ${summary.amounts}`,
                              ].filter(Boolean)
                              if (parts.length === 0) return null
                              return (
                                <p className="mt-1 text-[11px] text-brand-700">
                                  <span className="font-medium">AI:</span> {parts.join(' • ')}
                                </p>
                              )
                            })()}
                          </div>
                          <span className="mt-0.5 shrink-0">{getProcessingStatusIcon(file.processingStatus)}</span>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => openEvidenceFile(file.fileUrl)}
                            className="rounded p-1 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                            aria-label="View file"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete file"
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 p-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4 shrink-0" />
                      {loading ? 'Uploading…' : (uploadButtonLabel || 'Add more files')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {files.length > 0 && !tight && (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex flex-col gap-1 rounded bg-gray-50 p-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center space-x-2 overflow-hidden">
                    <span className="shrink-0">{getFileIcon(file.mimetype)}</span>
                    <span className="min-w-0 truncate text-sm text-gray-900">{file.originalName}</span>
                    <span className="shrink-0">{getProcessingStatusIcon(file.processingStatus)}</span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEvidenceFile(file.fileUrl)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      className="inline-flex h-8 w-8 flex-none items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-700"
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
                    summary.amounts && `Amounts: ${summary.amounts}`,
                  ].filter(Boolean)
                  if (parts.length === 0) return null
                  return (
                    <div className="rounded border border-brand-100 bg-brand-50/70 px-2 py-1.5 text-xs text-brand-700">
                      <span className="font-medium">AI extracted:</span> {parts.join(' • ')}
                    </div>
                  )
                })()}
              </div>
            ))}

            {files.length > 0 && !assessmentId && (
              <p className="rounded border border-emerald-100 bg-emerald-50 p-2 text-center text-xs font-medium text-emerald-700">
                ✓ Documents saved securely · Uploaded automatically when you submit
              </p>
            )}
          </div>
        )}

        {deleteConfirmModal}
        {uploadSuccessToast}
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
            type="button"
            onClick={() => setShowCamera(true)}
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
          accept={acceptForCategory(category)}
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
                  onClick={() => openEvidenceFile(file.fileUrl)}
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

      {deleteConfirmModal}
      {uploadSuccessToast}

      <CameraCaptureModal
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(file) => handleFileUpload(file, 'camera')}
      />
    </div>
  )
}
