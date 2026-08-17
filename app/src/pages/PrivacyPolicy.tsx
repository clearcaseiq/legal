import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchPublicConsentTemplate, type PublicConsentTemplate } from '../lib/api-consent'
import { ConsentDocumentBody } from '../components/ConsentDocumentBody'
import { useBrowserStateReady } from '../contexts/ServerRenderContext'
import { useLanguage } from '../contexts/LanguageContext'

export default function PrivacyPolicy() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnParam = searchParams.get('return')
  const step = searchParams.get('step')
  const returnTo = returnParam || '/'
  const returnPath = step && returnParam ? `${returnTo}?step=${step}` : returnTo
  // The server renders this route without a query string, so reading `?return=`
  // during the hydration render would disagree with the markup it is hydrating.
  // Client-side arrivals from the consent flow are unaffected: this is true
  // immediately on routes that were not server-rendered.
  const isFromFlow = useBrowserStateReady() && !!returnParam
  const [doc, setDoc] = useState<PublicConsentTemplate | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicConsentTemplate('privacy')
      .then(setDoc)
      .catch(() => setLoadError(t('legal.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t('legal.privacyTitle')}</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            {doc && (
              <>
                {t('legal.version')} {doc.version} · {t('legal.effective')} {doc.effectiveDate}
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-outline text-sm print:hidden">
          {t('legal.printSave')}
        </button>
      </div>

      {/* Legal documents are maintained in English; make that explicit for
          visitors browsing in another language. */}
      {language !== 'en' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {t('legal.englishGoverns')}
        </div>
      )}

      {loadError && <p className="text-red-600 text-sm">{loadError}</p>}

      {/* Rendered before the document arrives, not after.
          This page now server-renders, and the full policy still comes from the
          API, so gating the summary on `doc` meant the served HTML was a heading
          above the word "Loading". The summary is a written constant, so it is
          real content on the first byte and is replaced by the authoritative
          version once that loads. */}
      <div className="card dark:bg-slate-900 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{t('legal.summary')}</h2>
        <p>{language === 'en' && doc?.plainLanguageSummary ? doc.plainLanguageSummary : t('legal.summaryPrivacy')}</p>
      </div>

      <div className="card dark:bg-slate-900 dark:border-slate-700 text-sm text-gray-700 space-y-4">
        {doc?.content ? (
          <ConsentDocumentBody content={doc.content} />
        ) : (
          !loadError && <p className="text-gray-500">{t('legal.loading')}</p>
        )}
      </div>

      <div className="flex items-center gap-3 print:hidden">
        {isFromFlow && (
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('consent_read_privacy', 'true')
              navigate(returnPath)
            }}
            className="btn-primary"
          >
            {t('legal.readIt')}
          </button>
        )}
        <button
          type="button"
          onClick={() => (isFromFlow ? navigate(returnPath) : navigate('/'))}
          className="btn-outline"
        >
          {isFromFlow ? t('legal.back') : t('legal.backHome')}
        </button>
      </div>
    </div>
  )
}
