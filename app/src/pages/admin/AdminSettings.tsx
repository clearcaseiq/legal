import { useEffect, useState } from 'react'
import { getAdminSmsStatus, sendAdminTestSms, type AdminSmsStatus } from '../../lib/api'
import { Badge, PageHeader, SectionCard } from '../../features/shared/ui'

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
    <SectionCard
      title="SMS delivery"
      trailing={
        status && (
          <Badge tone={status.configured ? 'success' : 'warning'}>
            {status.configured ? 'Configured' : 'Not configured'}
          </Badge>
        )
      }
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Send a test text to confirm the SMS provider is live before relying on routing alerts.
      </p>

      {status && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3 dark:text-slate-400">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Provider:</span> {status.provider}
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Region:</span> {status.region}
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">From:</span>{' '}
            {status.originationNumber || '—'}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          aria-label="Destination phone number"
          className="input"
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message (defaults to a test message)"
          aria-label="Test message"
          maxLength={320}
          className="input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="btn-primary text-ui-sm disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send test SMS'}
        </button>
      </div>

      {result && (
        <p
          className={`mt-2 text-sm ${
            result.ok
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {result.text}
        </p>
      )}
      {status && !status.configured && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Set SMS_PROVIDER (and SNS_ORIGINATION_NUMBER for Amazon SNS) in the API environment and
          redeploy to enable sending.
        </p>
      )}
    </SectionCard>
  )
}

export default function AdminSettings() {
  // The link cards that used to live here were the only way to reach User Roles,
  // Feature Toggles, and Firm Settings. Those are now first-class sidebar items,
  // so this page holds real platform diagnostics instead of duplicating the nav.
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Platform-level diagnostics. Roles, feature flags, and firm configuration live under Configuration in the sidebar."
      />
      <SmsTestPanel />
    </div>
  )
}
