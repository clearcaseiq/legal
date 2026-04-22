import { useEffect, useRef, type RefObject } from 'react'

/**
 * Focus first actionable control when a modal opens; basic a11y without full focus trap.
 * `focusGeneration` bumps when dialog content swaps (e.g. success state) so focus runs again.
 */
export function useModalInitialFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  focusGeneration: number | string = 0
) {
  const prevActive = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    prevActive.current = document.activeElement as HTMLElement | null
    const root = containerRef.current
    if (!root) return
    const focusable = root.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const t = window.setTimeout(() => focusable?.focus(), 10)
    return () => {
      window.clearTimeout(t)
      prevActive.current?.focus?.()
    }
  }, [open, containerRef, focusGeneration])
}
