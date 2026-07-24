import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { downloadDemandLetterDocx, generateDemandLetter, getAssessment } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { AlertCircle, CheckCircle, Download, FileText, ShieldCheck } from 'lucide-react'
import { BackButton } from '../features/shared/ui'

function getDiySuitability(assessment: any) {
  const facts = assessment?.facts || {}
  const damages = facts?.damages || {}
  const medicalCharges = Number(damages?.med_charges || 0)
  const wageLoss = Number(damages?.wage_loss || 0)
  const treatment = Array.isArray(facts?.treatment) ? facts.treatment : []
  const flags = [
    medicalCharges >= 25000 && 'Medical bills are high enough that attorney review may materially change strategy.',
    wageLoss >= 10000 && 'Wage loss appears significant and may need stronger proof or expert support.',
    treatment.length >= 4 && 'There may be ongoing treatment or a more complex medical timeline.',
    /minor|child|death|fatal|surgery|fracture|permanent|disability|government|public entity/i.test(JSON.stringify(facts)) &&
      'Your facts mention a risk factor such as a minor, serious injury, government entity, or permanent harm.',
  ].filter(Boolean) as string[]

  if (flags.length >= 2) return { level: 'Attorney review strongly recommended', tone: 'red', flags }
  if (flags.length === 1) return { level: 'Use caution', tone: 'amber', flags }
  return {
    level: 'Potential DIY fit',
    tone: 'emerald',
    flags: ['This appears more suitable for a self-help demand package, but review any release before signing.'],
  }
}

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
        formData.message,
        'pro_se'
      )
      setDemandLetter(result)
    } catch (err) {
      console.error('Failed to generate demand letter:', err)
      setError('Failed to generate demand letter')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadText = () => {
    if (!demandLetter) return

    const element = document.createElement('a')
    const file = new Blob([demandLetter.content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `demand-letter-${assessmentId}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleDownloadDocx = async () => {
    if (!demandLetter?.demand_id) return

    const blob = await downloadDemandLetterDocx(demandLetter.demand_id)
    const url = window.URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = `self-help-demand-${assessmentId}.docx`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    window.URL.revokeObjectURL(url)
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

  const suitability = getDiySuitability(assessment)
  const facts = assessment.facts || {}
  const preparationItems = [
    { label: 'Confirm who should receive the demand', helper: 'Usually the insurance adjuster, insurer, or defendant contact.', done: !!formData.recipient.name && !!formData.recipient.address },
    { label: 'Attach medical bills and records', helper: 'Bills support the amount; records explain the injury and treatment.', done: !!facts?.damages?.med_charges },
    { label: 'Add wage loss proof', helper: 'Use pay stubs, employer letters, or tax records if claiming missed income.', done: !!facts?.damages?.wage_loss },
    { label: 'Include photos or incident reports', helper: 'Scene photos, property damage, police reports, or witness details strengthen liability.', done: !!facts?.incident?.narrative },
    { label: 'Review before signing anything', helper: 'A settlement release can permanently end your claim.', done: false },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <BackButton to={`/results/${assessmentId}`} label="Back to results" />
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Self-Help Settlement Demand Package</h1>
        <p className="mt-2 text-gray-600">
          Prepare a demand letter and review checklist for your {assessment.claimType} case without presenting it as attorney work.
        </p>
      </div>

      <div className={`rounded-xl border px-5 py-5 ${
        suitability.tone === 'red'
          ? 'border-red-200 bg-red-50 text-red-900'
          : suitability.tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900'
      }`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{suitability.level}</p>
            <p className="mt-1 text-sm leading-relaxed">
              This tool helps you organize and draft a settlement demand. It is not legal advice, and you should consider attorney review before signing a release or accepting a final settlement.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {suitability.flags.map((flag) => (
                <li key={flag} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
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

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Demand Package Checklist</h2>
        <div className="space-y-3">
          {preparationItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
              <CheckCircle className={`mt-0.5 h-5 w-5 shrink-0 ${item.done ? 'text-emerald-600' : 'text-slate-300'}`} />
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-sm text-slate-600">{item.helper}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={`/evidence-upload/${assessmentId}`} className="btn-outline">
            Upload supporting records
          </Link>
          <Link to={`/results/${assessmentId}`} className="btn-ghost">
            Back to results
          </Link>
        </div>
      </div>

      {/* Demand Letter Form */}
      {!demandLetter && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Self-Help Demand Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demand Amount *
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.targetAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                  className="input !pl-9"
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Choose the amount you want to request. This is your decision, not a guaranteed case value.
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
                Additional Context (optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="textarea"
                rows={4}
                placeholder="Add facts you want the recipient to consider, such as liability details, treatment impact, or records you plan to attach..."
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
                    Generate Self-Help Package
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
            <h2 className="text-xl font-semibold text-gray-900">Generated Self-Help Demand</h2>
            <div className="flex space-x-3">
              <button
                onClick={handleDownloadDocx}
                className="btn-outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download DOCX
              </button>
              <button
                onClick={handleDownloadText}
                className="btn-outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download TXT
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
                <p className="font-medium">Before you send or sign anything:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Review this letter carefully before sending</li>
                  <li>Consider attorney review if liability is disputed, injuries are serious, or deadlines are close</li>
                  <li>Do not sign a release until you understand exactly what claims it gives up</li>
                  <li>Keep copies of all correspondence</li>
                  <li>Customize placeholders, attachments, and contact details before sending</li>
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
              Get Attorney Review
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
