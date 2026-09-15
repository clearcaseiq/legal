import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { LicenseDocumentCheck } from '../useAttorneyLicense'

/**
 * What happened to an uploaded licence document.
 *
 * This replaces "It will be reviewed by our team", which was false: no queue
 * listed the document, no process read it, and the file route only ever serves
 * an attorney their own upload, so no reviewer could open it even knowing it
 * existed. Attorneys waited on a review that could not happen.
 *
 * The four outcomes need different actions from the attorney, so they are not
 * collapsed into one message. In particular an unreadable document and a
 * licence that failed its check are opposites: the first needs the number typed
 * in, the second needs it corrected.
 */
export default function LicenseUploadResult({
  documentCheck,
}: {
  documentCheck: LicenseDocumentCheck | null
}) {
  // Nothing readable on the document. Say so plainly and point at the field
  // that does work, rather than implying something is now in progress.
  if (!documentCheck) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden="true" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Document saved</p>
            <p className="mt-1">
              We could not read a bar number from it, so your license is not verified yet. Enter your
              bar number and licensing state above and we will check it against the State Bar straight
              away.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (documentCheck.verified) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
          <div className="text-sm text-green-900">
            <p className="font-medium">License verified</p>
            <p className="mt-1">
              We read bar number {documentCheck.licenseNumber} from your document and the{' '}
              {documentCheck.state} State Bar shows an active license
              {documentCheck.recordName ? ` for ${documentCheck.recordName}` : ''}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // The number resolved to a real licence under a different name. Worth being
  // specific: the attorney can see at a glance whether they mistyped a digit or
  // photographed the wrong card.
  if (documentCheck.nameMatch === 'mismatch') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">This license is under a different name</p>
            <p className="mt-1">
              Bar number {documentCheck.licenseNumber} is listed to {documentCheck.recordName}, which
              does not match the name on your account. Your document is saved, but we cannot verify
              your license from it. Correct the bar number above if it is wrong.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
        <div className="text-sm text-amber-900">
          <p className="font-medium">We could not verify that license</p>
          <p className="mt-1">
            {documentCheck.status
              ? `The ${documentCheck.state} State Bar lists bar number ${documentCheck.licenseNumber} as ${documentCheck.status}, so it does not qualify for a verified badge.`
              : `The ${documentCheck.state} State Bar has no active record for bar number ${documentCheck.licenseNumber}, which we read from your document.`}{' '}
            Your document is saved. Check the number above and try again if it is wrong.
          </p>
        </div>
      </div>
    </div>
  )
}
