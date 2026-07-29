import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

let openModalCount = 0
let restoreBodyOverflow = ''

/**
 * Renders an overlay into document.body instead of leaving it where it sits in
 * the page tree.
 *
 * Every dialog in this app is a `position: fixed` element declared inline next
 * to the content that opens it, which caused two real layout defects reported as
 * "blank white space" (CP-450 / CP-451 / CP-452):
 *
 *  1. Overlays are usually the child of a Tailwind `space-y-*` container. That
 *     utility compiles to `> :not([hidden]) ~ :not([hidden]) { margin-top }`, so
 *     mounting an overlay both gave the overlay a stray top margin — which
 *     over-constrains `inset-0` and shortens it — and pushed every following
 *     sibling down, shifting the page behind the dialog.
 *  2. Any ancestor that gains a transform, filter or containment becomes the
 *     containing block for `position: fixed`, silently mis-sizing the overlay.
 *
 * Portalling to body makes both structurally impossible. Background scroll is
 * locked while any overlay is open so the page cannot scroll away underneath it.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    // Counted rather than set/restored, so nested dialogs (a confirm opened from
    // inside a detail modal) don't release the lock when the inner one closes.
    // The value to restore is captured only on the first lock, otherwise a
    // nested dialog would record "hidden" as the page's resting state.
    const { body } = document
    if (openModalCount === 0) restoreBodyOverflow = body.style.overflow
    openModalCount += 1
    body.style.overflow = 'hidden'
    return () => {
      openModalCount -= 1
      if (openModalCount === 0) body.style.overflow = restoreBodyOverflow
    }
  }, [mounted])

  if (!mounted) return null
  return createPortal(children, document.body)
}
