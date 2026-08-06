import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchPublicConsentTemplate, type PublicConsentTemplate } from '../lib/api-consent'
import { ConsentDocumentBody } from '../components/ConsentDocumentBody'
import { useLanguage } from '../contexts/LanguageContext'

export default function TermsOfService() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnParam = searchParams.get('return')
  const step = searchParams.get('step')
  const returnTo = returnParam || '/'
  const returnPath = step && returnParam ? `${returnTo}?step=${step}` : returnTo
  const isFromFlow = !!returnParam
  const [doc, setDoc] = useState<PublicConsentTemplate | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicConsentTemplate('terms')
      .then(setDoc)
      .catch(() => setLoadError(t('legal.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t('legal.termsTitle')}</h1>
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

      {doc?.plainLanguageSummary && (
        <div className="card dark:bg-slate-900 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{t('legal.summary')}</h2>
          <p>{language === 'en' ? doc.plainLanguageSummary : t('legal.summaryTerms')}</p>
        </div>
      )}

      <div className="card dark:bg-slate-900 dark:border-slate-700 text-sm text-gray-700">
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
              localStorage.setItem('consent_read_tos', 'true')
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
