import { CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import type { StateBarPreview } from '../lib/api-auth'

/**
 * What the State Bar said about a bar number, shown during registration.
 *
 * Three outcomes need three different responses, and collapsing them into
 * "verified / not verified" loses the only one the attorney can act on. A
 * number that resolves to nobody is probably mistyped. A number that resolves
 * to an *active licence under another name* is also probably mistyped — but the
 * attorney cannot tell that unless we name the licensee, and it is the case
 * where a silent pass would hand them someone else's credential.
 *
 * Nothing here blocks signup. The preview writes nothing and decides nothing;
 * it exists so a wrong digit gets caught while the field is still on screen
 * rather than becoming a support ticket about a missing badge.
 */
export default function StateBarPreviewResult({
  preview,
  error,
}: {
  preview: StateBarPreview | null
  error: string | null
}) {
  const { t } = useLanguage()

  if (error) {
    return (
      <div
        role="status"
        className="mt-3 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        <p className="text-sm text-gray-700">{error}</p>
      </div>
    )
  }

  if (!preview) return null

  // A found-and-matching licence is the only outcome that earns green, because
  // it is the only one that will actually produce a badge.
  if (preview.found && preview.nameMatch === 'match') {
    const details = [
      preview.recordName ? t('attorneyReg.barPreviewRecordName', { name: preview.recordName }) : null,
      preview.admissionDate ? t('attorneyReg.barPreviewAdmitted', { date: preview.admissionDate }) : null,
      preview.city,
    ].filter(Boolean)

    return (
      <div
        role="status"
        className="mt-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
      >
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <div className="text-sm text-green-800">
          <p className="font-medium">{t('attorneyReg.barPreviewActive')}</p>
          {details.length > 0 ? <p>{details.join(' · ')}</p> : null}
          <p className="mt-1">{t('attorneyReg.barPreviewMatched')}</p>
        </div>
      </div>
    )
  }

  const body = preview.found
    ? preview.nameMatch === 'mismatch'
      ? t('attorneyReg.barPreviewMismatch', { name: preview.recordName || '' })
      : t('attorneyReg.barPreviewUnknownName')
    : // The server's own message distinguishes "no record", "not active" and
      // "state we cannot check", which are not worth re-deriving here.
      preview.message

  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="text-sm text-amber-800">
        {!preview.found ? (
          <p className="font-medium">{t('attorneyReg.barPreviewNotVerified')}</p>
        ) : null}
        <p>{body}</p>
        <p className="mt-1">{t('attorneyReg.barPreviewContinue')}</p>
      </div>
    </div>
  )
}
