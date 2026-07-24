import { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
  /**
   * Where the bubble appears relative to the trigger. Defaults to 'top'. Use
   * 'bottom' when the trigger sits near the top edge of an overflow-clipped
   * container so the tooltip isn't hidden above it (CP-362).
   */
  placement?: 'top' | 'bottom'
}

export default function Tooltip({ content, children, className, placement = 'top' }: TooltipProps) {
  const bubblePlacement =
    placement === 'bottom'
      ? '-bottom-2 translate-y-full'
      : '-top-2 -translate-y-full'
  return (
    <span className={`relative inline-flex group ${className ?? ''}`}>
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand-600 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 ${bubblePlacement}`}
      >
        {content}
      </span>
    </span>
  )
}
