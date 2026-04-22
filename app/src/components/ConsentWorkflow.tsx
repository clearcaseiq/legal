import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Check, X, FileText, Shield, Mail, AlertTriangle, ExternalLink } from 'lucide-react'
import ESignatureCapture from './ESignatureCapture'
import { fetchPublicConsentTemplate, type PublicConsentTemplate } from '../lib/api-consent'
import { ConsentDocumentBody } from './ConsentDocumentBody'
import { useModalInitialFocus } from '../hooks/useModalInitialFocus'

interface ConsentWorkflowProps {
  userId: string
  requiredConsents?: string[]
  onComplete: (consents: any[]) => void
  /** Clears session in parent when user exits without finishing (e.g. return to login). */
  onCancel: () => void
  skipOptional?: boolean
  /** When `inline`, omit full-screen overlay (e.g. dedicated `/auth/complete-consent` page). */
  presentation?: 'modal' | 'inline'
  /**
   * `combined`: one screen with all documents, one attestation checkbox, one e-signature;
   * still emits one consent payload per document for the API (legal: separate records per type/version).
   * `stepped`: legacy wizard (one document per step, sign each time).
   */
  flow?: 'combined' | 'stepped'
}

interface ConsentData {
  consentType: string
  version: string
  documentId: string
  granted: boolean
  signatureData?: string
  signatureMethod?: 'drawn' | 'typed' | 'clicked'
  consentText: string
}

const fullPagePath: Record<string, string> = {
  hipaa: '/hipaa-authorization',
  terms: '/terms-of-service',
  privacy: '/privacy-policy',
}

export default function ConsentWorkflow({
  userId: _userId,
  requiredConsents = ['terms', 'privacy', 'hipaa'],
  onComplete,
  onCancel,
  presentation = 'modal',
  flow = 'combined',
}: ConsentWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [consentTemplates, setConsentTemplates] = useState<Record<string, PublicConsentTemplate>>({})
  const [consentData, setConsentData] = useState<ConsentData[]>([])
  const [showSignature, setShowSignature] = useState(false)
  const [currentConsentType, setCurrentConsentType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consentText, setConsentText] = useState('')
  const [signatureMethod, setSignatureMethod] = useState<'drawn' | 'typed' | 'clicked'>('drawn')
  /** Combined flow: user affirms they read all shown documents before signature. */
  const [combinedAttested, setCombinedAttested] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusKey =
    flow === 'combined'
      ? `combined-${showSignature}-${requiredConsents.join(',')}`
      : `${currentStep}-${showSignature}`
  useModalInitialFocus(!loading && !error && !showSignature, panelRef, focusKey)

  useEffect(() => {
    let cancelled = false
    const loadTemplates = async () => {
      try {
        const templates: Record<string, PublicConsentTemplate> = {}
        for (const consentType of requiredConsents) {
          const doc = await fetchPublicConsentTemplate(consentType)
          if (!cancelled) templates[consentType] = doc
        }
        if (!cancelled) {
          setConsentTemplates(templates)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load consent documents')
          setLoading(false)
        }
      }
    }
    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [requiredConsents])

  useEffect(() => {
    if (loading || error || showSignature) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, error, showSignature, onCancel])

  const getConsentIcon = (type: string) => {
    switch (type) {
      case 'hipaa':
        return <Shield className="h-6 w-6 text-blue-600" />
      case 'terms':
        return <FileText className="h-6 w-6 text-emerald-600" />
      case 'privacy':
        return <Shield className="h-6 w-6 text-violet-600" />
      case 'marketing':
        return <Mail className="h-6 w-6 text-orange-600" />
      default:
        return <FileText className="h-6 w-6 text-gray-600" />
    }
  }

  const getConsentTitle = (type: string) => {
    const template = consentTemplates[type]
    return template?.title || type.charAt(0).toUpperCase() + type.slice(1)
  }

  const handleConsentGrantStepped = () => {
    setCurrentConsentType(requiredConsents[currentStep])
    setConsentText(consentTemplates[requiredConsents[currentStep]]?.content || '')
    setShowSignature(true)
  }

  const handleSignatureCapture = (signatureData: string) => {
    if (flow === 'combined') {
      const consents: ConsentData[] = requiredConsents.map((type) => ({
        consentType: type,
        version: consentTemplates[type]?.version || '1.0',
        documentId: consentTemplates[type]?.documentId || '',
        granted: true,
        signatureData,
        signatureMethod,
        consentText: consentTemplates[type]?.content || '',
      }))
      onComplete(consents)
      return
    }

    const consent: ConsentData = {
      consentType: currentConsentType,
      version: consentTemplates[currentConsentType]?.version || '1.0',
      documentId: consentTemplates[currentConsentType]?.documentId || '',
      granted: true,
      signatureData,
      signatureMethod,
      consentText,
    }

    const newConsentData = [...consentData, consent]
    setConsentData(newConsentData)
    setShowSignature(false)

    if (currentStep < requiredConsents.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete(newConsentData)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setConsentData((prev) => prev.slice(0, -1))
    }
  }

  if (loading) {
    const loader = (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          <span className="ml-3 text-slate-600 dark:text-slate-300">Loading consent documents…</span>
        </div>
      </div>
    )
    if (presentation === 'inline') return <div className="w-full max-w-4xl mx-auto">{loader}</div>
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">{loader}</div>
    )
  }

  if (error) {
    const errPane = (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 max-w-md">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Error</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    )
    if (presentation === 'inline') return <div className="w-full max-w-md mx-auto">{errPane}</div>
    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">{errPane}</div>
  }

  if (showSignature) {
    return (
      <ESignatureCapture
        onSignatureCapture={handleSignatureCapture}
        onCancel={() => setShowSignature(false)}
        signatureMethod={signatureMethod}
        onMethodChange={setSignatureMethod}
      />
    )
  }

  const wrap = (inner: ReactNode) => {
    if (presentation === 'inline') return <div className="w-full max-w-4xl mx-auto px-4">{inner}</div>
    return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">{inner}</div>
  }

  // —— Combined attestation: all documents, one checkbox, one signature; API still gets one record per type ——
  if (flow === 'combined') {
    const combinedInner = (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-workflow-title"
        className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-4xl w-full my-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 id="consent-workflow-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Review and e-sign agreements
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {requiredConsents.length} document{requiredConsents.length !== 1 ? 's' : ''} · one electronic signature
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg p-1 pressable"
            aria-label="Exit and sign out"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-3 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 text-xs text-amber-950 dark:text-amber-200">
          <strong className="font-medium">Legal notice:</strong> Each agreement is stored separately with its version ID for
          your records. Your single electronic signature below applies to each document version shown. Have counsel review this
          flow if you change wording or process.
        </div>

        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400 w-full sm:w-auto">Jump to:</span>
          {requiredConsents.map((type) => (
            <a
              key={type}
              href={`#consent-section-${type}`}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              {getConsentTitle(type)}
            </a>
          ))}
        </div>

        <div className="p-6 space-y-10 max-h-[min(70vh,720px)] overflow-y-auto">
          {requiredConsents.map((type) => {
            const template = consentTemplates[type]
            const fullPath = fullPagePath[type]
            return (
              <section key={type} id={`consent-section-${type}`} className="scroll-mt-24">
                <div className="flex items-center mb-3">
                  {getConsentIcon(type)}
                  <div className="ml-3">
                    <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {template?.title || getConsentTitle(type)}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Version {template?.version || '1.0'}
                      {template?.effectiveDate && (
                        <span className="ml-2">· Effective {template.effectiveDate}</span>
                      )}
                    </p>
                  </div>
                </div>

                {template?.plainLanguageSummary && (
                  <div className="mb-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Summary</p>
                    <p>{template.plainLanguageSummary}</p>
                  </div>
                )}

                {fullPath && (
                  <p className="mb-4">
                    <a
                      href={fullPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Open full page in new tab
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </p>
                )}

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg p-4 sm:p-6 max-h-72 overflow-y-auto">
                  {template?.content ? (
                    <ConsentDocumentBody content={template.content} />
                  ) : (
                    <p className="text-slate-500">Consent document not available.</p>
                  )}
                </div>

                {type === 'hipaa' && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">Health information</h3>
                        <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                          This authorization covers PHI you share through the platform for your injury case. You can exit above
                          to sign out if you prefer not to proceed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={combinedAttested}
              onChange={(e) => setCombinedAttested(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              I have read the summaries and full text of {requiredConsents.map((t) => getConsentTitle(t)).join(', ')} (as shown
              above). I agree to each document at the version and effective date indicated, and I understand my electronic
              signature will apply to each of them.
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!combinedAttested}
              onClick={() => setShowSignature(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed pressable"
            >
              Continue to e-signature
            </button>
          </div>
        </div>
      </div>
    )
    return wrap(combinedInner)
  }

  // —— Stepped (legacy) ——
  const activeConsentType = requiredConsents[currentStep]
  const template = consentTemplates[activeConsentType]
  const fullPath = fullPagePath[activeConsentType]

  const inner = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-workflow-title"
      className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 id="consent-workflow-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Legal consent required
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step {currentStep + 1} of {requiredConsents.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg p-1 pressable"
          aria-label="Exit and sign out"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {requiredConsents.map((type, index) => (
            <div
              key={type}
              className={`flex items-center ${index <= currentStep ? 'text-brand-600' : 'text-slate-400'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep
                    ? 'bg-emerald-500 text-white'
                    : index === currentStep
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:block">{getConsentTitle(type)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center mb-4">
          {getConsentIcon(activeConsentType)}
          <div className="ml-3">
            <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {template?.title || getConsentTitle(activeConsentType)}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Version {template?.version || '1.0'}
              {template?.effectiveDate && (
                <span className="ml-2">· Effective {template.effectiveDate}</span>
              )}
            </p>
          </div>
        </div>

        {template?.plainLanguageSummary && (
          <div className="mb-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Summary</p>
            <p>{template.plainLanguageSummary}</p>
          </div>
        )}

        {fullPath && (
          <p className="mb-4">
            <a
              href={fullPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Open full page in new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        )}

        <div className="max-w-none mb-6">
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg p-6 max-h-96 overflow-y-auto">
            {template?.content ? (
              <ConsentDocumentBody content={template.content} />
            ) : (
              <p className="text-slate-500">Consent document not available.</p>
            )}
          </div>
        </div>

        {activeConsentType === 'hipaa' && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">Required for case features</h3>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                  HIPAA authorization is required to use messaging, update your intake with health-related details, and upload
                  case evidence while signed in. You can exit above to sign out instead.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          Back
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConsentGrantStepped}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 pressable"
          >
            {activeConsentType === 'marketing' ? 'Accept' : 'Accept & sign'}
          </button>
        </div>
      </div>
    </div>
  )

  return wrap(inner)
}
