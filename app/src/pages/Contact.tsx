import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, LifeBuoy, Scale } from 'lucide-react'
import { submitContactInquiry, type ContactTopic } from '../lib/api'

const TOPICS: { value: ContactTopic; label: string }[] = [
  { value: 'general', label: 'General inquiry' },
  { value: 'plaintiff_support', label: 'Help with my case' },
  { value: 'attorney_partnership', label: 'Attorney / firm partnership' },
  { value: 'media_press', label: 'Media & press' },
  { value: 'privacy', label: 'Privacy request' },
  { value: 'other', label: 'Other' },
]

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<ContactTopic>('general')
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && /.+@.+\..+/.test(email) && message.trim().length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || status === 'sending') return
    setStatus('sending')
    setError(null)
    try {
      await submitContactInquiry({ name: name.trim(), email: email.trim(), topic, message: message.trim(), company })
      setStatus('sent')
    } catch {
      setStatus('error')
      setError('We couldn’t send your message. Please try again, or email us directly at support@clearcaseiq.com.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thanks — we’ve got your message</h1>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            A member of our team will get back to you at <span className="font-medium text-slate-900">{email}</span>, usually within one business day.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              Back to home
            </Link>
            <Link to="/help" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Visit the Help Center
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Contact us</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Questions, partnership ideas, or feedback? Send us a note and we’ll get back to you, usually within one business day.
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
              <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="contact-topic" className="mb-1 block text-sm font-medium text-slate-700">What’s this about?</label>
            <select
              id="contact-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as ContactTopic)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
            <textarea
              id="contact-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              placeholder="How can we help?"
            />
            <p className="mt-1 text-xs text-slate-400">{message.trim().length}/4000</p>
          </div>

          {status === 'error' && error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || status === 'sending'}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {status === 'sending' ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…</>
            ) : (
              <><Send className="h-4 w-4" aria-hidden /> Send message</>
            )}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            ClearCaseIQ does not provide legal advice. For questions about your specific case, please contact your matched attorney.
          </p>
        </form>

        {/* Direct channels */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-900">
              <Mail className="h-5 w-5 text-brand-600" aria-hidden />
              <h2 className="font-semibold">Prefer email?</h2>
            </div>
            <p className="text-sm text-slate-600">
              General: <a href="mailto:support@clearcaseiq.com" className="font-medium text-brand-600 hover:text-brand-700">support@clearcaseiq.com</a>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Privacy: <a href="mailto:legal@clearcaseiq.com" className="font-medium text-brand-600 hover:text-brand-700">legal@clearcaseiq.com</a>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-900">
              <LifeBuoy className="h-5 w-5 text-brand-600" aria-hidden />
              <h2 className="font-semibold">Need help now?</h2>
            </div>
            <p className="text-sm text-slate-600">
              Browse common questions and see how we resolve issues in the Help Center.
            </p>
            <Link to="/help" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Go to Help Center →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-slate-900">
              <Scale className="h-5 w-5 text-brand-600" aria-hidden />
              <h2 className="font-semibold">Are you an attorney?</h2>
            </div>
            <p className="text-sm text-slate-600">
              Learn about joining the attorney network and how case routing works.
            </p>
            <Link to="/attorney-network" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              For attorneys →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
