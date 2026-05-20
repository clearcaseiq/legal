import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchPublicConsentTemplate, type PublicConsentTemplate } from '../lib/api-consent'
import { ConsentDocumentBody } from '../components/ConsentDocumentBody'

export default function HipaaAuthorization() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnParam = searchParams.get('return')
  const step = searchParams.get('step')
  const returnTo = returnParam || '/'
  const returnPath = step && returnParam ? `${returnTo}?step=${step}` : returnTo
  const isFromFlow = !!returnParam
  const [doc, setDoc] = useState<PublicConsentTemplate | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attested, setAttested] = useState(false)

  useEffect(() => {
    fetchPublicConsentTemplate('hipaa')
      .then(setDoc)
      .catch(() => setLoadError('Could not load document.'))
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-8 print:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{doc?.title ?? 'HIPAA authorization'}</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            {doc && (
              <>
                Version {doc.version} · Effective {doc.effectiveDate}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-outline text-sm print:hidden"
        >
          Print or save as PDF
        </button>
      </div>

      {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

      {doc?.plainLanguageSummary && (
        <div className="card dark:bg-slate-900 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Summary</h2>
          <p>{doc.plainLanguageSummary}</p>
        </div>
      )}

      <div className="card dark:bg-slate-900 dark:border-slate-700 text-sm text-gray-700 space-y-4">
        {doc?.content ? (
          <ConsentDocumentBody content={doc.content} />
        ) : (
          !loadError && <p className="text-gray-500">Loading…</p>
        )}
      </div>

      {isFromFlow && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950 print:hidden">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
            />
            <span>
              I have read this HIPAA authorization and authorize medical records and extracted treatment details to be shared for case review.
            </span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-3 print:hidden">
        {isFromFlow && (
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('consent_read_hipaa', 'true')
              navigate(returnPath)
            }}
            disabled={!attested}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            I have read and authorize
          </button>
        )}
        <button
          type="button"
          onClick={() => (isFromFlow ? navigate(returnPath) : navigate('/'))}
          className="btn-outline"
        >
          {isFromFlow ? 'Back' : 'Back to Home'}
        </button>
      </div>
    </div>
  )
}
