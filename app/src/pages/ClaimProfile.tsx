import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { PasswordInputWithReveal } from '../components/PasswordInputWithReveal'
import {
  completeClaim,
  sendClaimCode,
  startClaim,
  verifyClaimBarNumber,
  verifyClaimCode,
  type ClaimPreview,
} from '../lib/api-claim'

type Step = 'loading' | 'error' | 'choose' | 'code' | 'bar' | 'account' | 'done'
type Method = 'email' | 'sms' | 'bar_number'

const METHOD_LABEL: Record<Method, string> = {
  email: 'Email a verification code',
  sms: 'Text a verification code',
  bar_number: 'Verify with my State Bar number',
}

function apiError(err: any, fallback: string): string {
  return err?.response?.data?.error || err?.message || fallback
}

export default function ClaimProfile() {
  const { token = '' } = useParams<{ token: string }>()

  const [step, setStep] = useState<Step>('loading')
  const [preview, setPreview] = useState<ClaimPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [method, setMethod] = useState<Method | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [barNumber, setBarNumber] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const needsEmail = useMemo(() => !preview?.profile.maskedEmail, [preview])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await startClaim(token)
        if (!active) return
        setPreview(data)
        setStep(data.verified ? 'account' : 'choose')
      } catch (err: any) {
        if (!active) return
        setError(apiError(err, 'This claim link is invalid or has expired.'))
        setStep('error')
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  const onChooseMethod = async (selected: Method) => {
    setMethod(selected)
    setError(null)
    if (selected === 'bar_number') {
      setStep('bar')
      return
    }
    setBusy(true)
    try {
      const res = await sendClaimCode(token, selected)
      setSentTo(res.sentTo)
      setDevCode(res.devCode ?? null)
      setStep('code')
    } catch (err: any) {
      setError(apiError(err, 'Could not send a code. Please try another method.'))
    } finally {
      setBusy(false)
    }
  }

  const onVerifyCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await verifyClaimCode(token, code.trim())
      if (res.verified) setStep('account')
      else setError('That code was not correct.')
    } catch (err: any) {
      setError(apiError(err, 'Verification failed. Request a new code.'))
    } finally {
      setBusy(false)
    }
  }

  const onVerifyBar = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await verifyClaimBarNumber(token, barNumber.trim())
      if (res.verified) setStep('account')
      else if (res.manualReview) {
        setError(
          'Thanks — we could not auto-verify this bar number, so our team will review your request and follow up by email.'
        )
      } else {
        setError('That bar number did not match our records.')
      }
    } catch (err: any) {
      setError(apiError(err, 'Verification failed.'))
    } finally {
      setBusy(false)
    }
  }

  const onComplete = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await completeClaim({
        token,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: needsEmail ? email.trim().toLowerCase() : undefined,
      })
      localStorage.setItem('auth_token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      localStorage.setItem('attorney', JSON.stringify(res.attorney))
      localStorage.setItem('auth_role', 'attorney')
      setStep('done')
      setTimeout(() => window.location.assign('/attorney-dashboard'), 1200)
    } catch (err: any) {
      const code = err?.response?.data?.code
      if (code === 'ACCOUNT_EXISTS') {
        setError('An account already exists for this email. Please sign in instead.')
      } else {
        setError(apiError(err, 'Could not finish claiming your profile.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-8 flex justify-center">
          <BrandLogo size="lg" />
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-8 py-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Claim your profile</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
              {preview ? preview.profile.name : 'CaseIQ Attorney Profile'}
            </h1>
            {preview && (preview.profile.firmName || preview.profile.city) && (
              <p className="mt-1 text-sm text-slate-600">
                {[preview.profile.firmName, preview.profile.city, preview.profile.state]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </div>

          <div className="px-8 py-7">
            {error && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">{error}</p>
              </div>
            )}

            {step === 'loading' && <p className="text-sm text-slate-600">Loading your profile…</p>}

            {step === 'error' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  This claim link may have expired or already been used.
                </p>
                <Link
                  to="/attorney-login"
                  className="inline-flex rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Go to attorney login
                </Link>
              </div>
            )}

            {step === 'choose' && preview && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  To protect your profile, verify that you own this listing. Choose how you'd like to verify:
                </p>
                <div className="space-y-3">
                  {preview.methods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={busy}
                      onClick={() => onChooseMethod(m)}
                      className="flex w-full items-center justify-between rounded-xl border-[1.5px] border-gray-300 bg-white px-4 py-3.5 text-left text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md active:scale-[0.99] disabled:opacity-50"
                    >
                      <span>{METHOD_LABEL[m]}</span>
                      <span className="text-xs font-normal text-slate-500">
                        {m === 'email' ? preview.profile.maskedEmail : m === 'sms' ? preview.profile.maskedPhone : ''}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="pt-2 text-xs text-slate-500">
                  Not you?{' '}
                  <a
                    href="mailto:support@clearcaseiq.com?subject=Remove%20my%20profile"
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    Request removal
                  </a>
                </p>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  We sent a 6-digit code to <span className="font-semibold">{sentTo}</span>. Enter it below.
                </p>
                {devCode && (
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    Dev mode code: <span className="font-mono font-semibold">{devCode}</span>
                  </p>
                )}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.4em] focus:border-brand-500 focus:outline-none focus:ring-brand-500"
                />
                <button
                  type="button"
                  disabled={busy || code.length < 6}
                  onClick={onVerifyCode}
                  className="w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Verify code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="w-full text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Use a different method
                </button>
              </div>
            )}

            {step === 'bar' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Enter your State Bar number to verify your identity.</p>
                <input
                  value={barNumber}
                  onChange={(e) => setBarNumber(e.target.value)}
                  placeholder="e.g. 123456"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-brand-500"
                />
                <button
                  type="button"
                  disabled={busy || barNumber.trim().length < 2}
                  onClick={onVerifyBar}
                  className="w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="w-full text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Use a different method
                </button>
              </div>
            )}

            {step === 'account' && (
              <form className="space-y-4" onSubmit={onComplete}>
                <p className="text-sm text-slate-600">
                  Identity verified. Set up your login to finish claiming your profile.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First name</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last name</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-brand-500"
                    />
                  </div>
                </div>
                {needsEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@firm.com"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-brand-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <PasswordInputWithReveal
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={busy}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-brand-500"
                    placeholder="At least 8 characters"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || password.length < 8}
                  className="w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Finishing…' : 'Claim my profile'}
                </button>
              </form>
            )}

            {step === 'done' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-emerald-700">Your profile is claimed.</p>
                <p className="text-sm text-slate-600">Taking you to your dashboard…</p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/attorney-login" className="font-medium text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
