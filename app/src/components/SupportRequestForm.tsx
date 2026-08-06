import { useMemo, useState } from 'react'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { submitSupportRequest, type SupportCategory, type SupportPriority } from '../lib/api'

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'technical_issue', label: 'Technical issue / something is broken' },
  { value: 'case_help', label: 'Help with my case' },
  { value: 'attorney_matching', label: 'Attorney matching' },
  { value: 'account_access', label: 'Account / login access' },
  { value: 'privacy', label: 'Privacy request' },
  { value: 'other', label: 'Something else' },
]

const PRIORITIES: { value: SupportPriority; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: 'A question, no rush' },
  { value: 'medium', label: 'Normal', hint: 'Standard request' },
  { value: 'high', label: 'Urgent', hint: 'Blocking me right now' },
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

  const canSubmit =
    name.trim().length > 0 &&
    /.+@.+\..+/.test(email) &&
    subject.trim().length >= 3 &&
    description.trim().length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || status === 'sending') return
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
        <h3 className="text-lg font-bold text-slate-900">Request received</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Our team will triage your request and follow up at{' '}
          <span className="font-medium text-slate-900">{email}</span>, usually within one business day.
          {ticketId && (
            <>
              {' '}Your reference is <span className="font-mono text-slate-900">{ticketId.slice(-8)}</span>.
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Submit a support request</h3>
      <p className="mt-1 text-sm text-slate-600">
        Tell us what’s going on and our team will triage it. The more detail you share, the faster we can help.
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
          <label htmlFor="support-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            id="support-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label htmlFor="support-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            id="support-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="support-category" className="mb-1 block text-sm font-medium text-slate-700">What do you need help with?</label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="support-priority" className="mb-1 block text-sm font-medium text-slate-700">How urgent is it?</label>
          <select
            id="support-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as SupportPriority)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label} — {p.hint}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="support-subject" className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
        <input
          id="support-subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          placeholder="A short summary of the issue"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="support-description" className="mb-1 block text-sm font-medium text-slate-700">Details</label>
        <textarea
          id="support-description"
          required
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          placeholder="What happened, what you expected, and any steps to reproduce it. Screenshots help — mention if you have them."
        />
        <p className="mt-1 text-xs text-slate-400">{description.trim().length}/4000</p>
      </div>

      {status === 'error' && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            We couldn’t submit your request. Please try again, or email us directly at{' '}
            <a href="mailto:support@clearcaseiq.com" className="font-medium underline">support@clearcaseiq.com</a>.
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || status === 'sending'}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'sending' ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting…</>
        ) : (
          <><Send className="h-4 w-4" aria-hidden /> Submit request</>
        )}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        ClearCaseIQ does not provide legal advice. For questions about your specific case, please contact your matched attorney.
      </p>
    </form>
  )
}
