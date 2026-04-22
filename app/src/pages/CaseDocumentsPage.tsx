/**
 * Case documents page - view and add documents for a case (similar to Evidence screen).
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { getLead, getLeadEvidenceFiles, uploadEvidenceFile, uploadMultipleEvidenceFiles, deleteEvidenceFile } from '../lib/api'
import { getApiOrigin } from '../lib/runtimeEnv'

const CATEGORIES = [
  { id: 'medical_records', label: 'Medical records' },
  { id: 'police_report', label: 'Police report' },
  { id: 'bills', label: 'Bills' },
  { id: 'photos', label: 'Photos' },
  { id: 'wage_loss', label: 'Wage loss' },
  { id: 'correspondence', label: 'Correspondence' },
  { id: 'other', label: 'Other' }
]

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function CaseDocumentsPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lead, setLead] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('other')
  const [description, setDescription] = useState('')

  const loadData = async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const [leadData, files] = await Promise.all([
        getLead(leadId),
        getLeadEvidenceFiles(leadId)
      ])
      setLead(leadData)
      setDocuments(Array.isArray(files) ? files : [])
    } catch (err) {
      console.error('Failed to load', err)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [leadId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || [])
    if (!fileList.length || !lead?.assessmentId) return

    const maxBatch = 10
    if (fileList.length > maxBatch) {
      alert(`You can upload at most ${maxBatch} files at a time. Please select fewer files.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      if (fileList.length === 1) {
        const formData = new FormData()
        formData.append('file', fileList[0])
        formData.append('assessmentId', lead.assessmentId)
        formData.append('category', selectedCategory)
        formData.append('description', description)
        formData.append('uploadMethod', 'file_picker')
        const uploaded = await uploadEvidenceFile(formData)
        setDocuments((prev) => [uploaded, ...prev])
      } else {
        const formData = new FormData()
        fileList.forEach((file) => formData.append('files', file))
        formData.append('assessmentId', lead.assessmentId)
        formData.append('category', selectedCategory)
        formData.append('description', description)
        formData.append('subcategory', '')
        const result = await uploadMultipleEvidenceFiles(formData)
        const items = Array.isArray(result?.files) ? result.files : []
        const uploaded = items.filter((f: { id?: string; error?: string }) => f?.id && !f.error)
        const failed = items.filter((f: { error?: string }) => f?.error)
        if (failed.length) {
          alert(
            `Some files could not be uploaded:\n${failed.map((f: { error?: string }) => f.error).join('\n')}`
          )
        }
        if (uploaded.length) {
          setDocuments((prev) => [...uploaded, ...prev])
        }
      }
      setDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('Upload failed', err)
      alert(err?.response?.data?.error || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Delete this document?')) return
    try {
      await deleteEvidenceFile(fileId)
      setDocuments((prev) => prev.filter((d) => d.id !== fileId))
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
    if (mimetype === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const caseLabel = lead
    ? `${claimLabel(lead.assessment?.claimType || 'Case')} — ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  if (loading && !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!leadId || (!loading && !lead)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-500">Case not found.</p>
        <button onClick={() => navigate('/attorney-dashboard')} className="mt-4 text-brand-600 hover:underline">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/attorney-dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">{caseLabel}</p>
        </div>

        {/* Add document */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Add document</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {uploading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : 'Choose files'}
              </button>
              <p className="text-xs text-gray-500">
                Select multiple files at once (Ctrl/Cmd+click or Shift+click). Up to 10 per batch.
              </p>
            </div>
          </div>
        </div>

        {/* Document list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-700">
              Current documents ({documents.length})
            </h2>
          </div>
          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No documents yet. Add one above.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <li key={doc.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(doc.mimetype)}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {doc.originalName || doc.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {claimLabel(doc.category || '')} · {formatSize(doc.size)}
                        {doc.createdAt && (
                          <> · {new Date(doc.createdAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.fileUrl && (
                      <a
                        href={`${(getApiOrigin() || window.location.origin)}${doc.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-brand-600 rounded-lg"
                        title="Open"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
