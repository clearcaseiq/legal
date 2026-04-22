import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { CheckCircleIcon, AlertCircleIcon, InfoIcon } from '../components/StartupIcons'

export type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  message?: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (t: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<
  ToastVariant,
  { wrap: string; icon: typeof CheckCircleIcon }
> = {
  success: {
    wrap: 'bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-800/60',
    icon: CheckCircleIcon,
  },
  error: {
    wrap: 'bg-white dark:bg-slate-900 border-red-200/80 dark:border-red-800/60',
    icon: AlertCircleIcon,
  },
  info: {
    wrap: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700',
    icon: InfoIcon,
  },
}

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-brand-600 dark:text-brand-400',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...t, id }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 4200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-4 right-4 z-[220] flex max-w-[calc(100vw-2rem)] flex-col gap-2 pointer-events-none md:max-w-sm"
          aria-live="polite"
        >
          {toasts.map((t) => {
            const cfg = VARIANT_STYLES[t.variant]
            const Icon = cfg.icon
            return (
              <div
                key={t.id}
                className={clsx(
                  'pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-lg motion-safe:animate-toast-in',
                  cfg.wrap
                )}
                role="status"
              >
                <Icon
                  className={clsx('h-5 w-5 shrink-0 mt-0.5', VARIANT_ICON_CLASS[t.variant])}
                  aria-hidden
                />
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t.title}</p>
                  {t.message && (
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t.message}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
