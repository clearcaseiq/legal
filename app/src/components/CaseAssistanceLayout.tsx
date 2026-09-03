import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Headphones, LogOut } from 'lucide-react'
import { BrandMark } from './BrandLogo'
import { clearStoredAuth, getStoredUser } from '../lib/auth'
import { verifySpecialistAccess } from '../lib/api-auth'

/**
 * Shell for the Case Specialist app at `/assistance`.
 *
 * Deliberately not `AdminLayout`. That shell calls `verifyAdminAccess()` on
 * mount and signs out anyone who fails, so a specialist rendering inside it
 * would be kicked to the admin login on every visit. The same screens are also
 * mounted inside the admin sidebar for managers, who do pass that check.
 */
export default function CaseAssistanceLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  const user = getStoredUser<{ email?: string; firstName?: string }>('user')

  useEffect(() => {
    let cancelled = false
    verifySpecialistAccess()
      .then(() => !cancelled && setChecked(true))
      .catch(() => {
        if (cancelled) return
        clearStoredAuth()
        navigate(`/login/specialist?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
      })
    return () => {
      cancelled = true
    }
    // Only on shell mount — not on every navigation within the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = () => {
    clearStoredAuth()
    navigate('/login/specialist', { replace: true })
  }

  // `ThemeProvider` puts the `dark` class on documentElement for workspace
  // paths, so this shell only needs the variants, not the toggle.
  return (
    <div>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <BrandMark size="sm" />
              <Link
                to="/assistance"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Headphones className="h-4 w-4" />
                Case Assistance
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {user?.email && (
                <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">{user.email}</span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
          {/* Held until the session is confirmed, so a claimant who reaches this
              URL with a stale token never sees queue chrome flash first. */}
          {checked ? <Outlet /> : <p className="text-sm text-slate-500 dark:text-slate-400">Checking access…</p>}
        </main>
      </div>
    </div>
  )
}
