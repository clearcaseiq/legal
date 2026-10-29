import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  acceptAttorneyAgreement,
  fetchAttorneyAgreement,
  fetchAttorneyAgreementStatus,
  type AttorneyAgreement,
} from '../lib/attorneyAgreement'

function useAttorneyAgreement() {
  const [agreement, setAgreement] = useState<AttorneyAgreement | null>(null)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchAttorneyAgreement()
      .then((a) => !cancelled && setAgreement(a))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [])
  return { agreement, loadError }
}

function AgreementBody({ agreement }: { agreement: AttorneyAgreement }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p className="text-xs text-slate-500">
        {t('attorneyReg.agreementVersion').replace('{version}', agreement.version)}
      </p>
      {agreement.sections.map((section) => (
        <section key={section.heading}>
          <h3 className="font-semibold text-slate-900">{section.heading}</h3>
          <p className="mt-1 leading-relaxed">{section.body}</p>
        </section>
      ))}
    </div>
  )
}

function Dialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose?: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {onClose && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="border-t border-slate-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

/**
 * The signup checkbox. Reports the version shown back to the form, so the API
 * records acceptance of the text the attorney could actually read.
 */
export function AttorneyAgreementCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean
  onChange: (version: string | null) => void
  error?: string | null
}) {
  const { t } = useLanguage()
  const { agreement, loadError } = useAttorneyAgreement()
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-lg border p-4 ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
          checked={checked}
          disabled={!agreement}
          onChange={(e) => onChange(e.target.checked && agreement ? agreement.version : null)}
        />
        <span>
          {t('attorneyReg.agreementPrefix')}{' '}
          <button
            type="button"
            className="font-semibold text-brand-700 underline underline-offset-2"
            onClick={() => setOpen(true)}
            disabled={!agreement}
          >
            {agreement?.title ?? t('attorneyReg.agreementTitle')}
          </button>
          .
        </span>
      </label>
      {loadError && <p className="mt-2 text-xs text-red-600">{t('attorneyReg.agreementLoadError')}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {open && agreement && (
        <Dialog
          title={agreement.title}
          onClose={() => setOpen(false)}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onChange(agreement.version)
                  setOpen(false)
                }}
              >
                {t('attorneyReg.agreementAccept')}
              </button>
            </div>
          }
        >
          <AgreementBody agreement={agreement} />
        </Dialog>
      )}
    </div>
  )
}

/**
 * Asks a signed-in attorney who has not accepted the current version, which
 * covers everyone registered before the agreement existed and everyone after a
 * version change. Accepting cases is refused server-side until they do.
 */
export function AttorneyAgreementGate() {
  const { t } = useLanguage()
  const [needed, setNeeded] = useState(false)
  const [agreement, setAgreement] = useState<AttorneyAgreement | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem('auth_role') !== 'attorney') return
    let cancelled = false
    ;(async () => {
      try {
        const status = await fetchAttorneyAgreementStatus()
        if (cancelled || status.accepted) return
        const current = await fetchAttorneyAgreement()
        if (cancelled) return
        setAgreement(current)
        setNeeded(true)
      } catch {
        // Not shown on a failed check; the server still blocks accepting cases.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!needed || !agreement) return null

  const accept = async () => {
    setSaving(true)
    setError(null)
    try {
      await acceptAttorneyAgreement(agreement.version)
      setNeeded(false)
    } catch (err: any) {
      if (err?.response?.data?.code === 'AGREEMENT_VERSION_STALE') {
        try {
          setAgreement(await fetchAttorneyAgreement())
        } catch {
          // Keep showing the version we have.
        }
      }
      setError(err?.response?.data?.error || t('attorneyReg.agreementSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={agreement.title}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">{t('attorneyReg.agreementGateNote')}</p>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button type="button" className="btn-primary disabled:opacity-50" disabled={saving} onClick={() => void accept()}>
              {saving ? t('attorneyReg.agreementSaving') : t('attorneyReg.agreementAccept')}
            </button>
          </div>
        </div>
      }
    >
      <p className="mb-4 text-sm font-medium text-slate-800">{t('attorneyReg.agreementGateIntro')}</p>
      <AgreementBody agreement={agreement} />
    </Dialog>
  )
}
