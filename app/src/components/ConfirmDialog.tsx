import { AlertTriangle, X } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Lightweight in-app confirmation modal used in place of the browser's native
 * window.confirm() so destructive actions get a branded, accessible dialog
 * (CP-329 and related "browser alert" reports).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-brand-600 hover:bg-brand-700'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="absolute inset-0 bg-slate-900/50" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">{title}</h2>
            {message && <div className="mt-1 text-sm text-slate-600">{message}</div>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${confirmClasses}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
