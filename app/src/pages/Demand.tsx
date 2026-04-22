import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAssessment, generateDemandLetter } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { FileText, Download, Send, AlertCircle } from 'lucide-react'

export default function Demand() {
  const { assessmentId } = useParams<{ assessmentId: string }>()
  const [assessment, setAssessment] = useState<any>(null)
  const [demandLetter, setDemandLetter] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    targetAmount: 0,
    recipient: {
      name: '',
      address: '',
      email: ''
    },
    message: ''
  })

  useEffect(() => {
    if (!assessmentId) return

    const loadAssessment = async () => {
      try {
        const data = await getAssessment(assessmentId)
        setAssessment(data)
        
        // Set default target amount based on damages
        const damages = data.facts?.damages
        if (damages?.med_charges) {
          setFormData(prev => ({
            ...prev,
            targetAmount: Math.round(damages.med_charges * 2) // 2x medical bills as starting point
          }))
        }
      } catch (err) {
        console.error('Failed to load assessment:', err)
        setError('Failed to load assessment')
      } finally {
        setLoading(false)
      }
    }

    loadAssessment()
  }, [assessmentId])

  const handleGenerate = async () => {
    if (!assessmentId) return

    setGenerating(true)
    try {
      const result = await generateDemandLetter(
        assessmentId,
        formData.targetAmount,
        formData.recipient,
        formData.message
      )
      setDemandLetter(result)
    } catch (err) {
      console.error('Failed to generate demand letter:', err)
      setError('Failed to generate demand letter')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!demandLetter) return

    const element = document.createElement('a')
    const file = new Blob([demandLetter.content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `demand-letter-${assessmentId}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Assessment not found'}</p>
          <Link to="/assess" className="btn-primary mt-4">
            Start New Assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Generate Demand Letter</h1>
        <p className="mt-2 text-gray-600">
          Create a professional demand letter for your {assessment.claimType} case
        </p>
      </div>

      {/* Case Summary */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Case Details</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Type:</span> {assessment.claimType}</div>
              <div><span className="font-medium">State:</span> {assessment.venue.state}</div>
              {assessment.venue.county && (
                <div><span className="font-medium">County:</span> {assessment.venue.county}</div>
              )}
              <div><span className="font-medium">Date:</span> {assessment.facts?.incident?.date}</div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Damages</h3>
            <div className="space-y-2 text-sm">
              {assessment.facts?.damages?.med_charges && (
                <div><span className="font-medium">Medical Bills:</span> {formatCurrency(assessment.facts.damages.med_charges)}</div>
              )}
              {assessment.facts?.damages?.med_paid && (
                <div><span className="font-medium">Medical Paid:</span> {formatCurrency(assessment.facts.damages.med_paid)}</div>
              )}
              {assessment.facts?.damages?.wage_loss && (
                <div><span className="font-medium">Lost Wages:</span> {formatCurrency(assessment.facts.damages.wage_loss)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demand Letter Form */}
      {!demandLetter && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Demand Letter Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.targetAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                  className="input pl-8"
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Enter the amount you're seeking to resolve this matter
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={formData.recipient.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    recipient: { ...prev.recipient, name: e.target.value }
                  }))}
                  className="input"
                  placeholder="Insurance company or defendant name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.recipient.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    recipient: { ...prev.recipient, email: e.target.value }
                  }))}
                  className="input"
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                value={formData.recipient.address}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  recipient: { ...prev.recipient, address: e.target.value }
                }))}
                className="textarea"
                rows={3}
                placeholder="Enter the recipient's mailing address..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Message (optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="textarea"
                rows={4}
                placeholder="Any additional points you'd like to include in the demand letter..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating || !formData.targetAmount || !formData.recipient.name || !formData.recipient.address}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Letter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Demand Letter */}
      {demandLetter && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Generated Demand Letter</h2>
            <div className="flex space-x-3">
              <button
                onClick={handleDownload}
                className="btn-outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
              <button className="btn-primary">
                <Send className="h-4 w-4 mr-2" />
                Send Letter
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
              {demandLetter.content}
            </pre>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Review this letter carefully before sending</li>
                  <li>Consider having an attorney review it</li>
                  <li>Keep copies of all correspondence</li>
                  <li>This is a template - customize as needed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setDemandLetter(null)}
              className="btn-outline"
            >
              Edit Details
            </button>
            <Link
              to="/attorneys"
              state={{ from: `/demand/${assessmentId}` }}
              className="btn-primary"
            >
              Find Attorney
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
