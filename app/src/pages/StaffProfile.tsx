import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { changePassword, getCurrentUser, updateProfile } from '../lib/api'

/**
 * "My Profile" for firm staff (paralegal, intake, case manager, …). They sign
 * in as a plain User with a firm membership, so neither the claimant profile
 * nor the attorney profile applies to them.
 */

const ROLE_LABELS: Record<string, string> = {
  firm_admin: 'Firm Admin',
  attorney: 'Attorney',
  case_manager: 'Case Manager',
  intake_specialist: 'Intake Specialist',
  paralegal: 'Paralegal',
  billing_admin: 'Billing Admin',
  legal_assistant: 'Legal Assistant',
  demand_writer: 'Demand Writer',
  medical_records: 'Medical Records',
}

type StoredFirm = { name?: string | null; role?: string | null; title?: string | null }

function readStoredFirm(): StoredFirm {
  try {
    return JSON.parse(localStorage.getItem('firm_member') || '{}') || {}
  } catch {
    return {}
  }
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'
const cardCls = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900'
const btnCls =
  'inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60'

export default function StaffProfile() {
  const firm = readStoredFirm()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUser()
      .then((u: any) => {
        if (cancelled) return
        setEmail(u?.email || '')
        setForm({ firstName: u?.firstName || '', lastName: u?.lastName || '', phone: u?.phone || '' })
      })
      .catch(() => !cancelled && setMessage({ tone: 'error', text: 'Failed to load your profile. Please try again.' }))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      })
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone }))
      } catch {
        /* the header falls back to the server copy on next load */
      }
      setMessage({ tone: 'ok', text: 'Profile updated.' })
    } catch (err: any) {
      setMessage({ tone: 'error', text: err?.response?.data?.error || 'Could not save your profile.' })
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage(null)
    if (pw.newPassword.length < 8) {
      setPwMessage({ tone: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (pw.newPassword !== pw.confirm) {
      setPwMessage({ tone: 'error', text: 'New passwords do not match.' })
      return
    }
    setPwSaving(true)
    try {
      await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      setPwMessage({ tone: 'ok', text: 'Password changed.' })
    } catch (err: any) {
      setPwMessage({ tone: 'error', text: err?.response?.data?.error || 'Could not change your password.' })
    } finally {
      setPwSaving(false)
    }
  }

  const note = (m: { tone: 'ok' | 'error'; text: string } | null) =>
    m ? (
      <p className={`text-sm ${m.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{m.text}</p>
    ) : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            {[firm.title || ROLE_LABELS[firm.role || ''] || null, firm.name].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link to="/firm-dashboard" className="text-sm font-medium text-brand-700 hover:text-brand-900">
          Back to firm dashboard
        </Link>
      </div>

      <form onSubmit={save} className={cardCls}>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Personal details</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="staff-first-name">First name</label>
                <input id="staff-first-name" className={inputCls} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor="staff-last-name">Last name</label>
                <input id="staff-last-name" className={inputCls} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="staff-email">Email</label>
                <input id="staff-email" className={`${inputCls} bg-slate-50 text-slate-500`} value={email} readOnly />
                <p className="mt-1 text-xs text-slate-400">Your firm admin manages your sign-in email.</p>
              </div>
              <div>
                <label className={labelCls} htmlFor="staff-phone">Phone</label>
                <input id="staff-phone" type="tel" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={btnCls} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              {note(message)}
            </div>
          </div>
        )}
      </form>

      <form onSubmit={savePassword} className={cardCls}>
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="staff-pw-current">Current password</label>
            <input id="staff-pw-current" type="password" autoComplete="current-password" className={inputCls} value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="staff-pw-new">New password</label>
            <input id="staff-pw-new" type="password" autoComplete="new-password" className={inputCls} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="staff-pw-confirm">Confirm new password</label>
            <input id="staff-pw-confirm" type="password" autoComplete="new-password" className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className={btnCls} disabled={pwSaving || !pw.currentPassword || !pw.newPassword}>
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
          {note(pwMessage)}
        </div>
      </form>
    </div>
  )
}
