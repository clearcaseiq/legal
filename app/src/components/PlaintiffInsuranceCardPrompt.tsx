import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react'
import { getPlaintiffInsuranceCardStatus, uploadEvidenceFile } from '../lib/api'
import { extractEvidenceData } from '../lib/api-plaintiff'
import { namesConflict } from '../lib/documentNameCheck'
import { useLanguage } from '../contexts/LanguageContext'

const DISMISS_KEY = (id: string) => `insuranceCardPrompt.dismissed.${id}`

async function readNameOnCard(file: File): Promise<string | null> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('category', 'insurance_letters')
    const res = await extractEvidenceData(fd)
    return res?.extraction?.patientName || null
  } catch {
    return null
  }
}

/**
 * Asks a claimant on a vehicle case for a photo of their own auto insurance
 * card, so the case team can find UM/UIM and MedPay coverage early. Hidden once
 * the firm records the client's policy, or when the claimant dismisses it.
 */
export default function PlaintiffInsuranceCardPrompt({
  assessmentId,
  claimantName,
}: {
  assessmentId?: string
  /** Who the case belongs to; the card's name is compared against it. */
  claimantName?: string
}) {
  const { t } = useLanguage()
  const k = (key: string) => t(`plaintiffDashboard.insuranceCard.${key}`)
  const [show, setShow] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justUploaded, setJustUploaded] = useState(false)
  const [nameOnCard, setNameOnCard] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!assessmentId) return
    if (localStorage.getItem(DISMISS_KEY(assessmentId))) return
    let cancelled = false
    getPlaintiffInsuranceCardStatus(assessmentId)
      .then((s) => {
        if (cancelled) return
        setShow(s.show)
        setUploadedCount(s.uploaded.length)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [assessmentId])

  if (!assessmentId || !show) return null

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 2)
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError(null)
    setNameOnCard(null)
    try {
      const namesRead: Array<Promise<string | null>> = []
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('assessmentId', assessmentId)
        fd.append('category', 'insurance_letters')
        fd.append('subcategory', 'insurance_card')
        fd.append('description', 'Auto insurance card')
        if (claimantName) namesRead.push(readNameOnCard(file))
        await uploadEvidenceFile(fd)
      }
      setUploadedCount((n) => n + files.length)
      setJustUploaded(true)
      // The back of a card usually carries no name, so one readable mismatch is
      // enough to warn; a card OCR could not read stays silent.
      const names = await Promise.all(namesRead)
      setNameOnCard(names.find((name) => namesConflict(name, claimantName)) ?? null)
    } catch (err: any) {
      setError(err?.response?.data?.error || k('failed'))
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY(assessmentId), '1')
    setShow(false)
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sky-600 shadow-sm dark:bg-slate-900">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{k('title')}</h3>
            <button type="button" onClick={dismiss} className="rounded p-0.5 text-slate-400 hover:text-slate-600" aria-label={k('dismiss')}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{k('body')}</p>
          {uploadedCount > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {justUploaded ? k('thanks') : k('received')}
            </p>
          ) : null}
          {nameOnCard && claimantName ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{t('plaintiffDashboard.insuranceCard.nameMismatch', { name: nameOnCard, claimant: claimantName })}</span>
            </p>
          ) : null}
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden" onChange={onFiles} />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {uploadedCount > 0 ? k('uploadAnother') : k('upload')}
          </button>
        </div>
      </div>
    </div>
  )
}
