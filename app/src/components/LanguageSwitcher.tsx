import { useLanguage } from '../contexts/LanguageContext'
import { LANGUAGES } from '../i18n'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLang.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 py-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code)
                setOpen(false)
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${
                language === lang.code ? 'text-brand-600 font-medium' : 'text-slate-700'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
