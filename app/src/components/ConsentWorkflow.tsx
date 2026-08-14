import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Check, CheckCircle2, X, FileText, Shield, Mail, AlertTriangle, ExternalLink, ChevronDown, Lock, ArrowRight } from 'lucide-react'
import ESignatureCapture from './ESignatureCapture'
import { fetchPublicConsentTemplate, type PublicConsentTemplate } from '../lib/api-consent'
import { ConsentDocumentBody } from './ConsentDocumentBody'
import { useModalInitialFocus } from '../hooks/useModalInitialFocus'
import ConsentStepHeader from './ConsentStepHeader'

interface ConsentWorkflowProps {
  userId: string
  requiredConsents?: string[]
  onComplete: (consents: any[]) => void | Promise<void>
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
  /** Parent save failure — shown on the signature screen so it is not hidden behind the modal. */
  saveError?: string | null
  saving?: boolean
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

/** Card copy shown in the combined review screen (falls back if the template lacks a summary). */
const consentMeta: Record<string, { readLabel: string; fallbackSummary: string }> = {
  terms: {
    readLabel: 'Read full agreement',
    fallbackSummary:
      'The rules for using ClearCaseIQ, including how we connect you with law firms and our responsibilities.',
  },
  privacy: {
    readLabel: 'Read full policy',
    fallbackSummary: 'How we collect, use, and protect your personal information.',
  },
  hipaa: {
    readLabel: 'Read full authorization',
    fallbackSummary:
      'Authorization for ClearCaseIQ and participating law firms to use and disclose your health information for your case.',
  },
}

export default function ConsentWorkflow({
  userId: _userId,
  requiredConsents = ['terms', 'privacy', 'hipaa'],
  onComplete,
  onCancel,
  presentation = 'modal',
  flow = 'combined',
  saveError = null,
  saving = false,
}: ConsentWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [consentTemplates, setConsentTemplates] = useState<Record<string, PublicConsentTemplate>>({})
  const [consentData, setConsentData] = useState<ConsentData[]>([])
  const [showSignature, setShowSignature] = useState(false)
  const [currentConsentType, setCurrentConsentType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consentText, setConsentText] = useState('')
  const [signatureMethod, setSignatureMethod] = useState<'drawn' | 'typed' | 'clicked'>('typed')
  /** Combined flow: user affirms they read all shown documents before signature. */
  const [combinedAttested, setCombinedAttested] = useState(false)
  /** Combined flow read-progress: which document sections the user has scrolled to. */
  const [viewedSections, setViewedSections] = useState<Record<string, boolean>>({})
  /** Combined flow: which agreements have the full text expanded (summary is default). */
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
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

  // Combined flow: mark each agreement "reviewed" once it scrolls into view so the
  // attestation reflects genuine engagement rather than a single unread checkbox.
  useEffect(() => {
    if (loading || error || showSignature || flow !== 'combined') return
    const observer = new IntersectionObserver(
      (entries) => {
        setViewedSections((prev) => {
          let changed = false
          const next = { ...prev }
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.consentType
            if (entry.isIntersecting && id && !next[id]) {
              next[id] = true
              changed = true
            }
          }
          return changed ? next : prev
        })
      },
      { threshold: 0.01 },
    )
    for (const type of requiredConsents) {
      const el = sectionRefs.current[type]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [loading, error, showSignature, flow, requiredConsents])

  const getConsentIcon = (type: string) => {
    switch (type) {
      case 'hipaa':
        return <Lock className="h-5 w-5 text-violet-600" />
      case 'terms':
        return <FileText className="h-5 w-5 text-emerald-600" />
      case 'privacy':
        return <Shield className="h-5 w-5 text-blue-600" />
      case 'marketing':
        return <Mail className="h-5 w-5 text-orange-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
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
      const missingTemplate = requiredConsents.find((type) => !consentTemplates[type]?.version)
      if (missingTemplate) {
        setError(`Could not load the ${missingTemplate} agreement. Please refresh and try again.`)
        setShowSignature(false)
        return
      }
      const consents: ConsentData[] = requiredConsents.map((type) => ({
        consentType: type,
        version: consentTemplates[type].version,
        documentId: consentTemplates[type].documentId || '',
        granted: true,
        signatureData,
        signatureMethod,
        consentText: consentTemplates[type].content || '',
      }))
      void Promise.resolve(onComplete(consents)).catch(() => {
        /* parent surfaces saveError */
      })
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
      void Promise.resolve(onComplete(newConsentData)).catch(() => {
        /* parent surfaces saveError */
      })
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
        onCancel={() => {
          if (saving) return
          setShowSignature(false)
        }}
        signatureMethod={signatureMethod}
        onMethodChange={setSignatureMethod}
        externalError={saveError}
        submitting={saving}
      />
    )
  }

  const wrap = (inner: ReactNode) => {
    if (presentation === 'inline') return <div className="w-full max-w-4xl mx-auto px-4">{inner}</div>
    // Mobile: edge-to-edge sheet so the dialog isn't a tiny inset card (CP-547).
    return (
      <div className="fixed inset-0 bg-black/50 flex items-stretch sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto">
        {inner}
      </div>
    )
  }

  // —— Combined attestation: all documents, one checkbox, one signature; API still gets one record per type ——
  if (flow === 'combined') {
    const titles = requiredConsents.map((t) => getConsentTitle(t))
    const attestationList = titles
      .map((title, i) => (i === titles.length - 1 && titles.length > 1 ? `and ${title}` : title))
      .join(titles.length > 2 ? ', ' : ' ')
    const markViewed = (type: string) =>
      setViewedSections((prev) => (prev[type] ? prev : { ...prev, [type]: true }))

    const combinedInner = (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-workflow-title"
        className="bg-white dark:bg-slate-900 sm:rounded-2xl shadow-xl w-full sm:max-w-2xl border-0 sm:border border-slate-200 dark:border-slate-700 flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]"
      >
        <ConsentStepHeader activeStep={1} />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
          {/* Case-submitted confirmation */}
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Your case has been submitted!
              </p>
              <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">
                We&apos;ve sent your case to the attorneys you selected for review.
              </p>
            </div>
          </div>

          <h3
            id="consent-workflow-title"
            className="mt-6 text-center text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl"
          >
            Review and agree to your agreements
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-center text-sm text-slate-600 dark:text-slate-400">
            Please review the {requiredConsents.length === 3 ? 'three' : requiredConsents.length} agreements below. Then
            confirm and continue to sign.
          </p>

          {/* Summary chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {requiredConsents.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {getConsentTitle(type)}
              </span>
            ))}
          </div>

          {/* Agreement cards */}
          <div className="mt-5 space-y-3">
            {requiredConsents.map((type, index) => {
              const template = consentTemplates[type]
              const fullPath = fullPagePath[type]
              const meta = consentMeta[type]
              const summary = template?.plainLanguageSummary || meta?.fallbackSummary || ''
              const seen = !!viewedSections[type]
              const isExpanded = !!expandedSections[type]
              return (
                <div
                  key={type}
                  id={`consent-section-${type}`}
                  data-consent-type={type}
                  ref={(el) => {
                    sectionRefs.current[type] = el
                  }}
                  className="scroll-mt-24 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-3 p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="mt-0.5 shrink-0">{getConsentIcon(type)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {template?.title || getConsentTitle(type)}
                        </h4>
                        <div className="flex shrink-0 items-center gap-2">
                          {seen && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <Check className="h-3 w-3" aria-hidden />
                              Reviewed
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedSections((prev) => ({ ...prev, [type]: !isExpanded }))
                              markViewed(type)
                            }}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Hide full text' : 'Show full text'}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">{summary}</p>
                      {fullPath && (
                        <a
                          href={fullPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markViewed(type)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          {meta?.readLabel || 'Read full document'}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                      {isExpanded && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
                          {template?.content ? (
                            <ConsentDocumentBody content={template.content} />
                          ) : (
                            <p className="text-sm text-slate-500">Consent document not available.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Attestation */}
          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 sm:h-4 sm:w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={combinedAttested}
              onChange={(e) => setCombinedAttested(e.target.checked)}
            />
            <span className="text-sm leading-snug text-slate-700 dark:text-slate-300">
              I have reviewed and agree to the {attestationList} shown above. I understand that my electronic signature on
              the next screen will apply to each agreement.
            </span>
          </label>

          <button
            type="button"
            disabled={!combinedAttested}
            onClick={() => setShowSignature(true)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 pressable"
          >
            Continue to signature
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Your information is secure and encrypted.
          </p>
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
      className="bg-white dark:bg-slate-900 sm:rounded-lg shadow-xl w-full sm:max-w-4xl h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto border-0 sm:border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="min-w-0">
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
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-600 rounded-lg p-6">
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
