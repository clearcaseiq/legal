import { useRef, useState } from 'react'
import LocaleLink from '../components/LocaleLink'
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, LifeBuoy, Scale } from 'lucide-react'
import { submitContactInquiry, type ContactTopic } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'

const TOPICS: { value: ContactTopic; labelKey: string }[] = [
  { value: 'general', labelKey: 'contactPage.topicGeneral' },
  { value: 'plaintiff_support', labelKey: 'contactPage.topicPlaintiff' },
  { value: 'attorney_partnership', labelKey: 'contactPage.topicAttorney' },
  { value: 'media_press', labelKey: 'contactPage.topicMedia' },
  { value: 'privacy', labelKey: 'contactPage.topicPrivacy' },
  { value: 'other', labelKey: 'contactPage.topicOther' },
]

export default function Contact() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<ContactTopic>('general')
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  type FieldName = 'name' | 'email' | 'message'
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({})

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const focusField: Record<FieldName, () => void> = {
    name: () => nameRef.current?.focus(),
    email: () => emailRef.current?.focus(),
    message: () => messageRef.current?.focus(),
  }

  const MIN_MESSAGE = 10

  /**
   * The submit button used to be disabled until all three fields passed, which
   * left no way to find out what was wrong: the message minimum was never
   * stated, so anyone who wrote a short note got a greyed-out button and no
   * reason for it. Validation now runs on submit and says which field to fix.
   */
  function validate(): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {}
    if (!name.trim()) errors.name = t('contactPage.errNameRequired')
    if (!/.+@.+\..+/.test(email.trim())) errors.email = t('contactPage.errEmailInvalid')
    if (message.trim().length < MIN_MESSAGE) errors.message = t('contactPage.errMessageTooShort')
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return

    const errors = validate()
    setFieldErrors(errors)
    const firstInvalid = (['name', 'email', 'message'] as const).find((field) => errors[field])
    if (firstInvalid) {
      setError(null)
      setStatus('idle')
      focusField[firstInvalid]()
      return
    }

    setStatus('sending')
    setError(null)
    try {
      await submitContactInquiry({ name: name.trim(), email: email.trim(), topic, message: message.trim(), company })
      setStatus('sent')
    } catch {
      setStatus('error')
      setError(t('contactPage.errSend'))
    }
  }

  /** Clear a field's error as soon as the person starts correcting it. */
  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t('contactPage.sentTitle')}</h1>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            {t('contactPage.sentBodyPre')} <span className="font-medium text-slate-900">{email}</span>
            {t('contactPage.sentBodyPost')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LocaleLink to="/" className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              {t('contactPage.backHome')}
            </LocaleLink>
            <LocaleLink to="/help" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {t('contactPage.visitHelp')}
            </LocaleLink>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">{t('contactPage.title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          {t('contactPage.intro')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        {/* Inquiry form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Honeypot: visually hidden, off the tab order. Bots fill it; humans don't. */}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-slate-700">{t('contactPage.nameLabel')}</label>
              <input
                id="contact-name"
                ref={nameRef}
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearFieldError('name')
                }}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
                  fieldErrors.name
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                }`}
                placeholder={t('contactPage.namePlaceholder')}
              />
              {fieldErrors.name && (
                <p id="contact-name-error" className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-slate-700">{t('auth.emailShortLabel')}</label>
              <input
                id="contact-email"
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearFieldError('email')
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                }`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p id="contact-email-error" className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="contact-topic" className="mb-1 block text-sm font-medium text-slate-700">{t('contactPage.topicLabel')}</label>
            <select
              id="contact-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as ContactTopic)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            >
              {TOPICS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-slate-700">{t('contactPage.messageLabel')}</label>
            <textarea
              id="contact-message"
              ref={messageRef}
              required
              rows={6}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                clearFieldError('message')
              }}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'contact-message-error' : 'contact-message-hint'}
              className={`w-full rounded-xl border px-3 py-2.5 focus:ring-2 ${
                fieldErrors.message
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
              }`}
              placeholder={t('contactPage.messagePlaceholder')}
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              {fieldErrors.message ? (
                <p id="contact-message-error" className="text-xs text-red-600">{fieldErrors.message}</p>
              ) : (
                <p id="contact-message-hint" className="text-xs text-slate-400">{t('contactPage.messageHint')}</p>
              )}
              <p className="shrink-0 text-xs text-slate-400">{message.trim().length}/4000</p>
            </div>
          </div>

          {status === 'error' && error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {/* Only disabled while a send is in flight. Gating it on validity gave
              no way to discover which field was holding it back. */}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {status === 'sending' ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('contactPage.sending')}</>
            ) : (
              <><Send className="h-4 w-4" aria-hidden /> {t('contactPage.sendMessage')}</>
            )}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            {t('contactPage.disclaimer')}
          </p>
        </form>

        {/* Direct channels */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-900">
              <Mail className="h-5 w-5 text-brand-600" aria-hidden />
              <h2 className="font-semibold">{t('contactPage.preferEmail')}</h2>
            </div>
            <p className="text-sm text-slate-600">
              {t('contactPage.generalLabel')} <a href="mailto:support@clearcaseiq.com" className="font-medium text-brand-600 hover:text-brand-700">support@clearcaseiq.com</a>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {t('contactPage.privacyLabel')} <a href="mailto:legal@clearcaseiq.com" className="font-medium text-brand-600 hover:text-brand-700">legal@clearcaseiq.com</a>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-900">
              <LifeBuoy className="h-5 w-5 text-brand-600" aria-hidden />
              <h2 className="font-semibold">{t('contactPage.needHelpNow')}</h2>
            </div>
            <p className="text-sm text-slate-600">
              {t('contactPage.helpCenterDesc')}
            </p>
            <LocaleLink to="/help" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t('contactPage.goHelpCenter')}
            </LocaleLink>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-900">
              <Scale className="h-5 w-5 text-brand-600" aria-hidden />
              <h2 className="font-semibold">{t('contactPage.areYouAttorney')}</h2>
            </div>
            <p className="text-sm text-slate-600">
              {t('contactPage.attorneyDesc')}
            </p>
            <LocaleLink to="/attorney-network" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              {t('contactPage.forAttorneys')}
            </LocaleLink>
          </div>
        </div>
      </div>
    </div>
  )
}
