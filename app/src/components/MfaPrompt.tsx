import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import ModalPortal from './ModalPortal'
import api from '../lib/http'
import { registerMfaPrompt, type MfaPromptRequest } from '../lib/mfa-prompt'

type Stage = 'loading' | 'enroll' | 'recovery' | 'challenge' | 'error'

function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: string } } })?.response?.data
  return data?.error || fallback
}

function storeToken(token: unknown) {
  if (typeof token === 'string' && token.split('.').length === 3) {
    localStorage.setItem('auth_token', token)
  }
}

/**
 * Two-step verification dialog, mounted once at the app root and opened by
 * `requestMfa` when an admin or attorney session still needs a code.
 */
export default function MfaPrompt() {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage>('loading')
  const [secret, setSecret] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [useRecovery, setUseRecovery] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const finish = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setOpen(false)
    setCode('')
    setSecret('')
    setQrDataUrl('')
    setRecoveryCodes([])
    setUseRecovery(false)
    setError('')
  }, [])

  const startEnrollment = useCallback(async () => {
    setStage('loading')
    try {
      const { data } = await api.post('/v1/auth/mfa/setup', {})
      setSecret(data.secret)
      setQrDataUrl(await QRCode.toDataURL(data.otpauthUrl, { margin: 1, width: 200 }))
      setStage('enroll')
    } catch (err) {
      const errCode = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      if (errCode === 'MFA_ALREADY_ENROLLED') {
        setStage('challenge')
        return
      }
      setError(apiErrorMessage(err, 'Could not start two-step verification setup.'))
      setStage('error')
    }
  }, [])

  useEffect(() => {
    registerMfaPrompt(
      (request: MfaPromptRequest) =>
        new Promise<boolean>((resolve) => {
          resolverRef.current = resolve
          setError('')
          setCode('')
          setOpen(true)
          if (request.enrolled) setStage('challenge')
          else void startEnrollment()
        })
    )
    return () => registerMfaPrompt(null)
  }, [startEnrollment])

  useEffect(() => {
    if (open && (stage === 'enroll' || stage === 'challenge')) inputRef.current?.focus()
  }, [open, stage, useRecovery])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      if (stage === 'enroll') {
        const { data } = await api.post('/v1/auth/mfa/enable', { code: code.trim() })
        storeToken(data.token)
        setRecoveryCodes(data.recoveryCodes || [])
        setStage('recovery')
      } else {
        const { data } = await api.post('/v1/auth/mfa/verify', { code: code.trim() })
        storeToken(data.token)
        finish(true)
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'That code did not work. Try again.'))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mfa-title"
          className="relative surface-panel shadow-xl max-w-md w-full p-6"
        >
          <h2 id="mfa-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {stage === 'recovery' ? 'Save your recovery codes' : 'Two-step verification'}
          </h2>

          {stage === 'loading' && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading…</p>}

          {stage === 'error' && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => finish(false)}>Sign out</button>
                <button type="button" className="btn-primary" onClick={() => void startEnrollment()}>Try again</button>
              </div>
            </div>
          )}

          {stage === 'enroll' && (
            <form onSubmit={submit} className="mt-3 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Admin and attorney accounts need a second step at sign-in. Scan this code with an authenticator app
                (Google Authenticator, Microsoft Authenticator, 1Password or Authy), then enter the 6-digit code it shows.
              </p>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR code for your authenticator app" className="mx-auto h-48 w-48 rounded bg-white p-2" />
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Can't scan? Enter this key instead:{' '}
                <code className="break-all font-mono text-slate-800 dark:text-slate-200">{secret}</code>
              </p>
              <CodeInput inputRef={inputRef} value={code} onChange={setCode} recovery={false} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => finish(false)} disabled={busy}>Sign out</button>
                <button type="submit" className="btn-primary" disabled={busy || code.trim().length < 6}>
                  {busy ? 'Checking…' : 'Turn on'}
                </button>
              </div>
            </form>
          )}

          {stage === 'recovery' && (
            <div className="mt-3 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                If you lose your phone, each of these codes signs you in once. Store them somewhere safe, such as a
                password manager. They will not be shown again.
              </p>
              <ul className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-3 font-mono text-sm dark:border-slate-700">
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode} className="text-slate-800 dark:text-slate-200">{recoveryCode}</li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void navigator.clipboard?.writeText(recoveryCodes.join('\n'))}
                >
                  Copy
                </button>
                <button type="button" className="btn-primary" onClick={() => finish(true)}>
                  I've saved them
                </button>
              </div>
            </div>
          )}

          {stage === 'challenge' && (
            <form onSubmit={submit} className="mt-3 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {useRecovery
                  ? 'Enter one of the recovery codes you saved when you set up two-step verification.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>
              <CodeInput inputRef={inputRef} value={code} onChange={setCode} recovery={useRecovery} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                className="text-sm font-medium text-brand-600 underline underline-offset-2"
                onClick={() => {
                  setUseRecovery((value) => !value)
                  setCode('')
                  setError('')
                }}
              >
                {useRecovery ? 'Use my authenticator app' : 'Use a recovery code'}
              </button>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => finish(false)} disabled={busy}>Sign out</button>
                <button type="submit" className="btn-primary" disabled={busy || code.trim().length < 6}>
                  {busy ? 'Checking…' : 'Verify'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

function CodeInput({
  inputRef,
  value,
  onChange,
  recovery,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
  recovery: boolean
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={recovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      maxLength={recovery ? 32 : 6}
      value={value}
      onChange={(event) => onChange(recovery ? event.target.value : event.target.value.replace(/\D/g, ''))}
      placeholder={recovery ? 'xxxxx-xxxxx' : '123456'}
      aria-label={recovery ? 'Recovery code' : 'Verification code'}
      className="w-full rounded border border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-widest dark:border-slate-600 dark:bg-slate-800"
    />
  )
}
