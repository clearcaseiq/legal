import { useLanguage } from '../contexts/LanguageContext'
import { LANGUAGES, type LanguageCode } from '../i18n'
import { pathForLocale } from '../data/localePathPairs'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  /**
   * Pages that exist in the chosen language have their own URL, so switching has
   * to navigate rather than re-render in place. Swapping the text under the
   * English URL would leave the reader on a page whose address, canonical, and
   * `lang` all still say English, and would give them nothing to share or link.
   */
  const chooseLanguage = useCallback(
    (next: LanguageCode) => {
      setLanguage(next)
      const target = pathForLocale(location.pathname, next)
      if (target && target !== location.pathname) {
        navigate(target + location.search)
      }
    },
    [location.pathname, location.search, navigate, setLanguage]
  )
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const handleClose = (e: Event) => {
      const target = e.target as Node
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    // Defer attaching the outside-click listeners to the next tick. Without this,
    // the same tap that opens the menu (its touchstart/mousedown) is caught by the
    // listener we attach synchronously and closes the dropdown instantly on mobile.
    const attachTimer = setTimeout(() => {
      document.addEventListener('mousedown', handleClose)
      document.addEventListener('touchstart', handleClose, { passive: true })
    }, 0)
    // Reposition on resize/orientation change. Deliberately NOT closing on scroll:
    // mobile fires spurious scroll events (address-bar collapse, menu layout) that
    // were closing the dropdown the moment it opened.
    const onResize = () => updatePosition()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(attachTimer)
      document.removeEventListener('mousedown', handleClose)
      document.removeEventListener('touchstart', handleClose)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Select language"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLang.label}</span>
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-40 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{ top: pos.top, right: pos.right, zIndex: 9999 }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                chooseLanguage(lang.code)
                setOpen(false)
              }}
              className={`block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                language === lang.code ? 'text-brand-600 font-semibold' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
