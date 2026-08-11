import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'

type Props = {
  caption: string
  detail: string
  moreLabel: string
  /** Tighter layout for dense metric / gauge cards */
  compact?: boolean
  className?: string
}

/**
 * Tap-to-expand plain-language tip. Prefer this over hover-only tooltips on
 * plaintiff screens so the help text works on mobile.
 */
export default function InfoDisclosure({ caption, detail, moreLabel, compact = false, className }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`mt-1 block ${className ?? ''}`}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        className={`flex w-full items-start gap-1.5 text-left font-medium text-slate-600 transition-colors hover:text-slate-800 ${
          compact ? 'text-[10px] leading-4' : 'text-xs'
        }`}
      >
        <Info
          className={`${compact ? 'mt-0.5 h-3 w-3' : 'mt-0.5 h-3.5 w-3.5'} shrink-0 text-slate-400`}
          aria-hidden
        />
        <span className="flex-1">
          {caption}{' '}
          <span className="font-semibold text-brand-700 underline decoration-dotted underline-offset-2">
            {moreLabel}
          </span>
        </span>
        <ChevronDown
          className={`${compact ? 'mt-0.5 h-3 w-3' : 'mt-0.5 h-3.5 w-3.5'} shrink-0 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {open && (
        <span
          className={`mt-1.5 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 leading-5 text-slate-600 ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {detail}
        </span>
      )}
    </span>
  )
}
