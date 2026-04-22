import { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

export default function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={`relative inline-flex group ${className ?? ''}`}>
      {children}
      <span className="pointer-events-none absolute -top-2 left-1/2 z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-brand-600 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
        {content}
      </span>
    </span>
  )
}
