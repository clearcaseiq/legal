import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Thin top bar on route changes — perceived performance polish.
 */
export default function RouteProgressBar() {
  const location = useLocation()
  const skipFirst = useRef(true)
  const [visible, setVisible] = useState(false)
  const [widthPct, setWidthPct] = useState(0)

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    setVisible(true)
    setWidthPct(12)
    const raf = requestAnimationFrame(() => setWidthPct(78))
    const t1 = window.setTimeout(() => setWidthPct(100), 240)
    const t2 = window.setTimeout(() => {
      setVisible(false)
      setWidthPct(0)
    }, 480)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [location.pathname, location.search, location.hash])

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600 shadow-sm motion-reduce:transition-none transition-[width] duration-300 ease-out"
        style={{ width: `${widthPct}%` }}
      />
    </div>
  )
}
