import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

export type FabAnchor = {
  /** Distance from the left edge of the viewport, in px. */
  left: number
  /** Distance from the top edge of the viewport, in px. */
  top: number
}

type DefaultCorner = {
  right: number
  bottom: number
}

type DraggableFabProps = {
  storageKey: string
  /** Preferred corner offset used when nothing is stored yet. */
  defaultCorner: DefaultCorner
  ariaLabel: string
  className?: string
  children: ReactNode
  /** Fired on a tap/click (not after a drag). */
  onActivate: () => void
  zIndex?: number
}

const DRAG_THRESHOLD_PX = 6
const EDGE_PAD = 8

function readStored(storageKey: string): FabAnchor | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FabAnchor>
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null
    return { left: parsed.left, top: parsed.top }
  } catch {
    return null
  }
}

function writeStored(storageKey: string, pos: FabAnchor) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(pos))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function cornerToAnchor(corner: DefaultCorner, width: number, height: number): FabAnchor {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  return {
    left: Math.max(EDGE_PAD, vw - corner.right - width),
    top: Math.max(EDGE_PAD, vh - corner.bottom - height),
  }
}

function clampAnchor(pos: FabAnchor, width: number, height: number): FabAnchor {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  return {
    left: Math.min(Math.max(EDGE_PAD, pos.left), Math.max(EDGE_PAD, vw - width - EDGE_PAD)),
    top: Math.min(Math.max(EDGE_PAD, pos.top), Math.max(EDGE_PAD, vh - height - EDGE_PAD)),
  }
}

/**
 * Fixed floating action button that can be dragged around the viewport.
 * Position is persisted in localStorage so the user’s preferred spot sticks.
 */
export default function DraggableFab({
  storageKey,
  defaultCorner,
  ariaLabel,
  className = '',
  children,
  onActivate,
  zIndex = 100,
}: DraggableFabProps) {
  const nodeRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<FabAnchor | null>(() => readStored(storageKey))
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
    moved: boolean
  } | null>(null)

  const measure = useCallback(() => {
    const el = nodeRef.current
    if (!el) return { width: 160, height: 48 }
    const rect = el.getBoundingClientRect()
    return { width: rect.width || 160, height: rect.height || 48 }
  }, [])

  // Resolve initial/default position once mounted (needs button size).
  useEffect(() => {
    const { width, height } = measure()
    setPos((prev) => {
      const next = prev ?? cornerToAnchor(defaultCorner, width, height)
      return clampAnchor(next, width, height)
    })
  }, [defaultCorner.bottom, defaultCorner.right, measure, storageKey])

  // Keep the FAB on-screen when the viewport resizes.
  useEffect(() => {
    const onResize = () => {
      const { width, height } = measure()
      setPos((prev) => (prev ? clampAnchor(prev, width, height) : prev))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const { width, height } = measure()
    const current = pos ?? cornerToAnchor(defaultCorner, width, height)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: current.left,
      originTop: current.top,
      moved: false,
    }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true
    }
    const { width, height } = measure()
    const next = clampAnchor(
      { left: drag.originLeft + dx, top: drag.originTop + dy },
      width,
      height,
    )
    setPos(next)
  }

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Already released.
    }
    if (drag.moved) {
      const { width, height } = measure()
      const next = clampAnchor(
        {
          left: drag.originLeft + (e.clientX - drag.startX),
          top: drag.originTop + (e.clientY - drag.startY),
        },
        width,
        height,
      )
      setPos(next)
      writeStored(storageKey, next)
      return
    }
    onActivate()
  }

  const style: CSSProperties = {
    position: 'fixed',
    zIndex,
    left: pos?.left ?? undefined,
    top: pos?.top ?? undefined,
    right: pos ? 'auto' : defaultCorner.right,
    bottom: pos ? 'auto' : defaultCorner.bottom,
    touchAction: 'none',
    cursor: dragging ? 'grabbing' : 'grab',
  }

  return (
    <button
      ref={nodeRef}
      type="button"
      aria-label={ariaLabel}
      title={`${ariaLabel} — drag to move`}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {children}
    </button>
  )
}
