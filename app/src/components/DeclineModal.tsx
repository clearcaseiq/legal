/**
 * Decline Modal - Collects structured decline reason before submitting.
 * Feeds routing engine, analytics, and matching algorithm improvements.
 */

import { useState, useEffect, useRef } from 'react'
import { useModalInitialFocus } from '../hooks/useModalInitialFocus'

export const DECLINE_REASONS = [
  { value: 'low_value', label: 'Case value too low' },
  { value: 'outside_practice_area', label: 'Outside my practice area' },
  { value: 'wrong_jurisdiction', label: 'Wrong jurisdiction' },
  { value: 'liability_unclear', label: 'Liability unclear' },
  { value: 'insufficient_evidence', label: 'Insufficient evidence' },
  { value: 'conflict_of_interest', label: 'Conflict of interest' },
  { value: 'too_busy', label: 'Too busy / capacity' },
  { value: 'other', label: 'Other' }
] as const

export type DeclineReasonCode = (typeof DECLINE_REASONS)[number]['value']

interface DeclineModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: DeclineReasonCode, otherText?: string) => void | Promise<void>
  loading?: boolean
  success?: boolean
}

export default function DeclineModal({ open, onClose, onSubmit, loading, success }: DeclineModalProps) {
  const [selected, setSelected] = useState<DeclineReasonCode | ''>('')
  const [otherText, setOtherText] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  useModalInitialFocus(open, panelRef, success ? 'done' : 'form')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, loading])

  useEffect(() => {
    if (success && open) {
      const t = setTimeout(onClose, 2200)
      return () => clearTimeout(t)
    }
  }, [success, open, onClose])

  const handleSubmit = async () => {
    const reason = selected || 'other'
    await onSubmit(reason as DeclineReasonCode, reason === 'other' ? otherText : undefined)
    setSelected('')
    setOtherText('')
  }

  const canSubmit = selected !== '' && (selected !== 'other' || otherText.trim().length > 0)

  if (!open) return null

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-success-title"
          tabIndex={-1}
          className="relative surface-panel shadow-xl max-w-md w-full p-6 text-center"
        >
          <p id="decline-success-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Case declined.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Thank you — this helps us improve future case matching.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => !loading && onClose()} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-modal-title"
        className="relative surface-panel shadow-xl max-w-md w-full p-6"
      >
        <h3 id="decline-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Decline Case
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Why are you declining this case? This helps us improve future case matching.
        </p>

        <div className="space-y-2 mb-4">
          {DECLINE_REASONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
            >
              <input
                type="radio"
                name="declineReason"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className="h-4 w-4 text-red-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>

        {selected === 'other' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Please specify</label>
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Brief reason..."
              className="input text-sm"
              rows={2}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-outline text-sm py-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="pressable px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting…' : 'Submit Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}
