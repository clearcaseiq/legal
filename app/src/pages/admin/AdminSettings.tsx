import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminSmsStatus, sendAdminTestSms, type AdminSmsStatus } from '../../lib/api'

function SmsTestPanel() {
  const [status, setStatus] = useState<AdminSmsStatus | null>(null)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getAdminSmsStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  const handleSend = async () => {
    setResult(null)
    if (!phone.trim()) {
      setResult({ ok: false, text: 'Enter a phone number.' })
      return
    }
    setSending(true)
    try {
      await sendAdminTestSms(phone.trim(), message.trim() || undefined)
      setResult({ ok: true, text: 'Test message sent. Check the phone.' })
    } catch (err: any) {
      setResult({ ok: false, text: err?.response?.data?.error || 'Failed to send test SMS.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">SMS test</p>
          <p className="text-sm text-slate-500">Send a test text to verify the SMS provider is live.</p>
        </div>
        {status && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              status.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {status.configured ? 'Configured' : 'Not configured'}
          </span>
        )}
      </div>

      {status && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3">
          <div><span className="text-slate-400">Provider:</span> {status.provider}</div>
          <div><span className="text-slate-400">Region:</span> {status.region}</div>
          <div><span className="text-slate-400">From:</span> {status.originationNumber || '—'}</div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message (defaults to a test message)"
          maxLength={320}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send test SMS'}
        </button>
      </div>

      {result && (
        <p className={`mt-2 text-sm ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.text}</p>
      )}
      {status && !status.configured && (
        <p className="mt-2 text-xs text-slate-400">
          Set SMS_PROVIDER (and SNS_ORIGINATION_NUMBER for Amazon SNS) in the API environment and redeploy to enable sending.
        </p>
      )}
    </div>
  )
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/admin/users"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300"
        >
          <p className="font-medium">User roles</p>
          <p className="text-sm text-slate-500">Manage permissions</p>
        </Link>
        <Link
          to="/admin/feature-toggles"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300"
        >
          <p className="font-medium">Feature toggles</p>
          <p className="text-sm text-slate-500">A/B experiments</p>
        </Link>
        <Link
          to="/admin/firm-settings"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300"
        >
          <p className="font-medium">Firm settings</p>
          <p className="text-sm text-slate-500">Law firm configuration</p>
        </Link>
      </div>
      <SmsTestPanel />
    </div>
  )
}
