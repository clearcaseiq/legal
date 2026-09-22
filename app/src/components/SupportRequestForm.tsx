import { useMemo, useRef, useState } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { submitSupportRequest, type SupportCategory, type SupportPriority } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

const CATEGORIES: { value: SupportCategory; labelKey: string }[] = [
  { value: 'technical_issue', labelKey: 'supportForm.catTechnical' },
  { value: 'case_help', labelKey: 'supportForm.catCase' },
  { value: 'attorney_matching', labelKey: 'supportForm.catMatching' },
  { value: 'account_access', labelKey: 'supportForm.catAccount' },
  { value: 'privacy', labelKey: 'supportForm.catPrivacy' },
  { value: 'other', labelKey: 'supportForm.catOther' },
]

const PRIORITIES: { value: SupportPriority; labelKey: string; hintKey: string }[] = [
  { value: 'low', labelKey: 'supportForm.prioLow', hintKey: 'supportForm.prioLowHint' },
  { value: 'medium', labelKey: 'supportForm.prioMedium', hintKey: 'supportForm.prioMediumHint' },
  { value: 'high', labelKey: 'supportForm.prioHigh', hintKey: 'supportForm.prioHighHint' },
]

/** Reads a name/email from a stored auth session, if present, to prefill the form. */
function usePrefill(): { name: string; email: string } {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return { name: '', email: '' }
      const u = JSON.parse(raw) as {
        firstName?: string
        lastName?: string
        name?: string
        email?: string
      }
      const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ')
      return { name: name || '', email: u.email || '' }
    } catch {
      return { name: '', email: '' }
    }
  }, [])
}

export default function SupportRequestForm({
  defaultCategory = 'technical_issue',
}: {
  defaultCategory?: SupportCategory
}) {
  const { t } = useLanguage()
  const prefill = usePrefill()
  const [name, setName] = useState(prefill.name)
  const [email, setEmail] = useState(prefill.email)
  const [category, setCategory] = useState<SupportCategory>(defaultCategory)
  const [priority, setPriority] = useState<SupportPriority>('medium')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [ticketId, setTicketId] = useState<string | null>(null)

  type FieldName = 'name' | 'email' | 'subject' | 'description'
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({})

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const focusField: Record<FieldName, () => void> = {
    name: () => nameRef.current?.focus(),
    email: () => emailRef.current?.focus(),
    subject: () => subjectRef.current?.focus(),
    description: () => descriptionRef.current?.focus(),
  }

  /**
   * Same reasoning as the Contact form: a submit button disabled on validity
   * gives no way to learn which field is holding it back, and neither the
   * subject nor the description minimum was ever stated on screen.
   */
  function validate(): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {}
    if (!name.trim()) errors.name = t('contactPage.errNameRequired')
    if (!/.+@.+\..+/.test(email.trim())) errors.email = t('contactPage.errEmailInvalid')
    if (subject.trim().length < 3) errors.subject = t('supportForm.errSubjectTooShort')
    if (description.trim().length < 10) errors.description = t('contactPage.errMessageTooShort')
    return errors
  }

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return

    const errors = validate()
    setFieldErrors(errors)
    const firstInvalid = (['name', 'email', 'subject', 'description'] as const).find((field) => errors[field])
    if (firstInvalid) {
      setStatus('idle')
      focusField[firstInvalid]()
      return
    }

    setStatus('sending')
    try {
      const res = await submitSupportRequest({
        name: name.trim(),
        email: email.trim(),
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        company,
      })
      setTicketId(res.ticketId ?? null)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{t('supportForm.receivedTitle')}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          {t('supportForm.receivedBodyPre')}{' '}
          <span className="font-medium text-slate-900">{email}</span>
          {t('supportForm.receivedBodyPost')}
          {ticketId && (
            <>
              {' '}{t('supportForm.referencePre')} <span className="font-mono text-slate-900">{ticketId.slice(-8)}</span>.
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{t('supportForm.title')}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {t('supportForm.intro')}
      </p>

      {/* Honeypot: visually hidden, off the tab order. */}
      <div className="hidden" aria-hidden>
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="support-name" className="mb-1 block text-sm font-medium text-slate-700">{t('contactPage.nameLabel')}</label>
          <input
            id="support-name"
            ref={nameRef}
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearFieldError('name')
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'support-name-error' : undefined}
            className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
              fieldErrors.name
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
            }`}
            placeholder={t('contactPage.namePlaceholder')}
          />
          {fieldErrors.name && (
            <p id="support-name-error" className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
          )}
        </div>
        <div>
          <label htmlFor="support-email" className="mb-1 block text-sm font-medium text-slate-700">{t('auth.emailShortLabel')}</label>
          <input
            id="support-email"
            ref={emailRef}
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError('email')
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'support-email-error' : undefined}
            className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
              fieldErrors.email
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
            }`}
            placeholder="you@example.com"
          />
          {fieldErrors.email && (
            <p id="support-email-error" className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="support-category" className="mb-1 block text-sm font-medium text-slate-700">{t('supportForm.categoryLabel')}</label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="support-priority" className="mb-1 block text-sm font-medium text-slate-700">{t('supportForm.priorityLabel')}</label>
          <select
            id="support-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as SupportPriority)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{t(p.labelKey)}: {t(p.hintKey)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="support-subject" className="mb-1 block text-sm font-medium text-slate-700">{t('supportForm.subjectLabel')}</label>
        <input
          id="support-subject"
          ref={subjectRef}
          type="text"
          required
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value)
            clearFieldError('subject')
          }}
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? 'support-subject-error' : undefined}
          className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
            fieldErrors.subject
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
          }`}
          placeholder={t('supportForm.subjectPlaceholder')}
        />
        {fieldErrors.subject && (
          <p id="support-subject-error" className="mt-1 text-xs text-red-600">{fieldErrors.subject}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="support-description" className="mb-1 block text-sm font-medium text-slate-700">{t('supportForm.detailsLabel')}</label>
        <textarea
          id="support-description"
          ref={descriptionRef}
          required
          rows={6}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            clearFieldError('description')
          }}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'support-description-error' : 'support-description-hint'}
          className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
            fieldErrors.description
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
          }`}
          placeholder={t('supportForm.detailsPlaceholder')}
        />
        <div className="mt-1 flex items-center justify-between gap-3">
          {fieldErrors.description ? (
            <p id="support-description-error" className="text-xs text-red-600">{fieldErrors.description}</p>
          ) : (
            <p id="support-description-hint" className="text-xs text-slate-400">{t('contactPage.messageHint')}</p>
          )}
          <p className="shrink-0 text-xs text-slate-400">{description.trim().length}/4000</p>
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t('supportForm.errSubmit')}{' '}
            <a href="mailto:support@clearcaseiq.com" className="font-medium underline">support@clearcaseiq.com</a>.
          </span>
        </div>
      )}

      {/* Only disabled while a submit is in flight — see validate(). */}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'sending' ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('supportForm.submitting')}</>
        ) : (
          <><Send className="h-4 w-4" aria-hidden /> {t('supportForm.submit')}</>
        )}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        {t('contactPage.disclaimer')}
      </p>
    </form>
  )
}
