import { ReactNode, Suspense, lazy, useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import RouteProgressBar from './RouteProgressBar'
import {
  ChevronDownIcon,
  MenuIcon,
  CloseIcon,
  FileTextIcon,
  ScaleIcon,
  HelpCircleIcon,
  MoonIcon,
  SunIcon,
} from './StartupIcons'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { clearStoredAuth, getStoredUser, hasValidAuthToken } from '../lib/auth'
import { loadPlaintiffHasCase, resetPlaintiffCaseHintCache } from '../lib/plaintiffCaseHint'

const NotificationBell = lazy(() => import('./NotificationBell'))
const LanguageSwitcher = lazy(() => import('./LanguageSwitcher'))

interface LayoutProps {
  children: ReactNode
}

const navLinks = {
  home: '/',
  howItWorks: '/how-it-works',
  myCase: '/dashboard',
  forAttorneys: '/for-attorneys',
  help: '/help',
  startAssessment: '/assessment/start',
  plaintiffLogin: '/login/plaintiff',
  attorneyLogin: '/login/attorney',
  adminLogin: '/login/admin',
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [signInOpen, setSignInOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hasCase, setHasCase] = useState(false)
  const signInRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const { showWorkspaceThemeToggle, darkMode, toggle } = useTheme()
  const authToken = localStorage.getItem('auth_token')
  const attorney = localStorage.getItem('attorney')
  const isAuthenticated = hasValidAuthToken()
  const isAdmin = location.pathname.startsWith('/admin')
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isAttorney = !isAdmin && (!!attorney || location.pathname.startsWith('/attorney-dashboard') || location.pathname.startsWith('/firm-dashboard'))
  const shouldLoadPlaintiffSummary = !!authToken && !isAttorney
  const storedUser = getStoredUser<{ firstName?: string }>('user')
  const userName = storedUser?.firstName || 'User'
  const headerLabel = isAdmin ? 'Admin' : (userName || 'User')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (signInRef.current && !signInRef.current.contains(e.target as Node)) setSignInOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!shouldLoadPlaintiffSummary) {
      if (!authToken && localStorage.getItem('pending_assessment_id')) {
        setHasCase(true)
      } else {
        setHasCase(false)
      }
      return
    }

    let cancelled = false
    void loadPlaintiffHasCase()
      .then((nextHasCase) => {
        if (!cancelled) {
          setHasCase(nextHasCase)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasCase(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authToken, shouldLoadPlaintiffSummary])

  const handleLogout = () => {
    resetPlaintiffCaseHintCache()
    clearStoredAuth()
    navigate('/')
  }

  const navItems = [
    { name: t('common.howItWorks'), href: navLinks.howItWorks, icon: null },
    { name: isAdmin ? 'Cases' : isAttorney ? t('common.myCases') : (hasCase ? t('common.continueMyCase') : t('common.myCase')), href: isAdmin ? '/admin/cases' : isAttorney ? '/attorney-dashboard?tab=leads' : navLinks.myCase, icon: FileTextIcon },
    { name: t('common.forAttorneys'), href: navLinks.forAttorneys, icon: ScaleIcon },
    { name: t('common.help'), href: navLinks.help, icon: HelpCircleIcon },
  ]

  const shellIconFallback = <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden />
  const languageFallback = <div className="h-5 w-16 rounded bg-slate-100 dark:bg-slate-800" aria-hidden />

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#ffffff_45%,_rgba(224,242,254,0.6)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_26%),linear-gradient(135deg,_#020617_0%,_#020617_48%,_#0f172a_100%)] transition-colors duration-300">
      <RouteProgressBar />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Header - single row, compact */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/78 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-900/82 dark:shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 md:h-16 py-2">
            {/* Left: Hamburger (mobile) + Logo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden -ml-2 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
              <Link
                to={navLinks.home}
                aria-label={t('common.appName')}
                className="flex shrink-0 items-center rounded-xl px-1.5 py-1 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:bg-slate-800/70 dark:focus-visible:ring-offset-slate-900"
              >
                <BrandLogo appName={t('common.appName')} size="sm" />
              </Link>
            </div>

            {/* Center nav - hidden during intake for focus mode */}
            {!['/assess', '/intake'].includes(location.pathname) && (
            <nav className="hidden md:flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/72 px-2 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/40 dark:text-brand-300'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            )}

            {/* Right: Language + Primary CTA + User menu */}
            <div className="flex items-center gap-3 md:gap-6">
              {showWorkspaceThemeToggle && (
                <button
                  type="button"
                  onClick={toggle}
                  className="hidden sm:inline-flex rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={darkMode ? 'Use light theme' : 'Use dark theme'}
                >
                  {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
              )}
              <Suspense fallback={languageFallback}>
                <LanguageSwitcher />
              </Suspense>
              {isAuthenticated ? (
                <>
                  {/* Notification bell for attorneys */}
                  {isAttorney && (
                    <div className="hidden md:block">
                      <Suspense fallback={shellIconFallback}>
                        <NotificationBell />
                      </Suspense>
                    </div>
                  )}
                  {/* User profile dropdown - hidden on mobile, menu in hamburger */}
                  <div className="relative hidden md:block" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/78 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/78 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      {headerLabel}
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 py-1 bg-white rounded-lg shadow-lg border border-slate-200">
                        <Link
                          to={isAdmin ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'}
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {isAdmin ? t('common.adminDashboard') : t('common.dashboard')}
                        </Link>
                        <Link
                          to={isAdmin ? '/admin/cases' : isAttorney ? '/attorney-dashboard?tab=leads' : '/assessments'}
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {isAdmin ? 'Cases' : t('common.myCases')}
                        </Link>
                        {!isAdmin && (
                        <Link
                          to={isAttorney ? '/attorney-profile' : '/profile'}
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Profile
                        </Link>
                        )}
                        <button
                          onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('common.logout')}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Sign In dropdown - hidden on mobile, in hamburger */}
                  <div className="relative hidden md:block" ref={signInRef}>
                    <button
                      onClick={() => setSignInOpen(!signInOpen)}
                      className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      {t('common.signIn')}
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${signInOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {signInOpen && (
                      <div className="absolute right-0 mt-1 w-48 py-1 bg-white rounded-lg shadow-lg border border-slate-200">
                        <Link
                          to={navLinks.plaintiffLogin}
                          onClick={() => setSignInOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('common.plaintiffLogin')}
                        </Link>
                        <Link
                          to={navLinks.attorneyLogin}
                          onClick={() => setSignInOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('common.attorneyLogin')}
                        </Link>
                        <Link
                          to={navLinks.adminLogin}
                          onClick={() => setSignInOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('common.adminLogin')}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Primary CTA - hidden during assessment/results/attorney registration */}
                  {!['/assess', '/intake', '/assessment/start'].includes(location.pathname) &&
                    !location.pathname.startsWith('/results') &&
                    !location.pathname.startsWith('/attorney-register') &&
                    !location.pathname.startsWith('/attorney-license-upload') && (
                    <Link
                      to={navLinks.startAssessment}
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-700 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-brand-800 hover:to-brand-700 hover:shadow-md"
                    >
                      {t('common.startAssessment')}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-4">
            <div className="flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  {showWorkspaceThemeToggle && (
                    <button
                      type="button"
                      onClick={toggle}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      {darkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                      {darkMode ? 'Light mode' : 'Dark mode'}
                    </button>
                  )}
                  {!['/assess', '/intake'].includes(location.pathname) && (
                    <>
                      <Link to={isAdmin ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-700 dark:text-slate-200">{isAdmin ? 'Admin Dashboard' : 'Dashboard'}</Link>
                      <Link to={isAdmin ? '/admin/cases' : isAttorney ? '/attorney-dashboard?tab=leads' : navLinks.myCase} onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-700">{isAdmin ? 'Cases' : isAttorney ? 'My Cases' : (hasCase ? 'Continue My Case' : 'My Case')}</Link>
                  <Link to={navLinks.howItWorks} onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-700">{t('common.howItWorks')}</Link>
                  <Link to={navLinks.help} onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-slate-700">{t('common.help')}</Link>
                    </>
                  )}
                  <div className="border-t border-slate-200 my-2 pt-2">
                    <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="py-2 text-sm font-medium text-slate-700">{t('common.logout')}</button>
                  </div>
                  {isAttorney && (
                    <Link
                      to="/attorney-dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-3 mt-2 text-center font-semibold text-white bg-brand-700 rounded-lg"
                    >
                      Go to Dashboard
                    </Link>
                  )}
                </>
              ) : (
                <>
                  {!['/assess', '/intake'].includes(location.pathname) && navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 text-sm font-medium text-slate-700"
                    >
                      {item.name}
                    </Link>
                  ))}
                  <div className="border-t border-slate-200 my-2 pt-2">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">{t('common.signIn')}</p>
                    <Link to={navLinks.plaintiffLogin} onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm text-slate-700">{t('common.plaintiffLogin')}</Link>
                    <Link to={navLinks.attorneyLogin} onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm text-slate-700">{t('common.attorneyLogin')}</Link>
                    <Link to={navLinks.adminLogin} onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm text-slate-700">{t('common.adminLogin')}</Link>
                  </div>
                  {!['/assess', '/intake', '/assessment/start'].includes(location.pathname) &&
                    !location.pathname.startsWith('/results') &&
                    !location.pathname.startsWith('/attorney-register') &&
                    !location.pathname.startsWith('/attorney-license-upload') && (
                    <Link
                      to={navLinks.startAssessment}
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-3 mt-2 text-center font-semibold text-white bg-brand-700 rounded-lg block"
                    >
                      {t('common.startAssessment')}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main content - reduced padding during assessment for focused flow */}
      <main id="main-content" className={`mx-auto max-w-7xl sm:px-6 lg:px-8 ${['/assess', '/intake'].includes(location.pathname) ? 'py-4' : 'py-8'}`}>
        <div className="px-4 sm:px-0">
          {children}
        </div>
      </main>

      {/* Footer - hidden during assessment flow to reduce distractions */}
      {!['/assess', '/intake'].includes(location.pathname) && (
      isDashboard ? (
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{t('footer.copyright')}</span>
          <div className="flex flex-wrap gap-3">
            <Link to="/help" className="hover:text-slate-900">{t('footer.helpCenter')}</Link>
            <Link to="/terms-of-service" className="hover:text-slate-900">{t('footer.termsOfService')}</Link>
            <Link to="/privacy-policy" className="hover:text-slate-900">{t('footer.privacyPolicy')}</Link>
          </div>
        </div>
      </footer>
      ) : (
      <footer className="mt-auto border-t border-slate-700/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <Link to="/" className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                <BrandLogo mode="footer" size="lg" appName={t('common.appName')} />
              </Link>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
                {t('footer.tagline')}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <a
                  href="mailto:support@clearcaseiq.com?subject=Support%20Request"
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-white transition-colors hover:border-slate-600 hover:bg-slate-800"
                >
                  {t('footer.contactSupport')}
                </a>
                <Link to={navLinks.howItWorks} className="text-xs text-slate-400 transition-colors hover:text-white">
                  {t('common.howItWorks')}
                </Link>
                <Link to="/help" className="text-xs text-slate-400 transition-colors hover:text-white">
                  {t('footer.helpCenter')}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-3">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.forPlaintiffs')}</h3>
              <ul className="space-y-1 text-sm">
                <li><Link to={navLinks.startAssessment} className="text-slate-400 transition-colors hover:text-white">{t('footer.caseAssessment')}</Link></li>
                <li><Link to="/case-tracker" className="text-slate-400 transition-colors hover:text-white">{t('footer.caseTracker')}</Link></li>
                <li><Link to={navLinks.howItWorks} className="text-slate-400 transition-colors hover:text-white">{t('common.howItWorks')}</Link></li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.forAttorneys')}</h3>
              <ul className="space-y-1 text-sm">
                <li><Link to="/for-attorneys" className="text-slate-400 transition-colors hover:text-white">{t('footer.receiveCases')}</Link></li>
                <li><Link to="/attorney-login" className="text-slate-400 transition-colors hover:text-white">{t('footer.attorneyLogin')}</Link></li>
                <li><Link to="/attorney-register" className="text-slate-400 transition-colors hover:text-white">{t('footer.attorneyRegister')}</Link></li>
              </ul>
            </div>
            <div className="lg:col-span-3">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.resources')}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                <Link to="/help" className="text-slate-400 transition-colors hover:text-white">{t('footer.helpCenter')}</Link>
                <Link to="/help#getting-started" className="text-slate-400 transition-colors hover:text-white">{t('footer.gettingStarted')}</Link>
                <Link to="/terms-of-service" className="text-slate-400 transition-colors hover:text-white">{t('footer.termsOfService')}</Link>
                <Link to="/privacy-policy" className="text-slate-400 transition-colors hover:text-white">{t('footer.privacyPolicy')}</Link>
                <Link to="/hipaa-authorization" className="text-slate-400 transition-colors hover:text-white">{t('footer.hipaaAuthorization')}</Link>
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-700/50 pt-2.5">
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-6 text-xs text-slate-400">
                <span>{t('footer.copyright')}</span>
              </div>
            </div>
            <div className="mt-1.5 text-center text-[10px] leading-relaxed text-slate-500 md:text-left">
              <p>
                {t('footer.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </footer>
      )
      )}
    </div>
  )
}
