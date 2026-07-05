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
import { clearStoredAuth, getStoredRole, getStoredUser, hasValidAuthToken } from '../lib/auth'
import { loadPlaintiffHasCase, resetPlaintiffCaseHintCache } from '../lib/plaintiffCaseHint'

const NotificationBell = lazy(() => import('./NotificationBell'))
const PlaintiffNotificationBell = lazy(() => import('./PlaintiffNotificationBell'))
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

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ClearCaseIQ',
  url: 'https://www.clearcaseiq.com',
  logo: 'https://www.clearcaseiq.com/clearcaseiq-logo.png',
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
  const storedRole = getStoredRole()
  const isAdmin = isAuthenticated && storedRole === 'admin'
  const isAdminArea = location.pathname.startsWith('/admin')
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isFocusRoute = ['/assess', '/intake', '/rose'].includes(location.pathname)
  const isAttorney = !isAdmin && (!!attorney || location.pathname.startsWith('/attorney-dashboard') || location.pathname.startsWith('/firm-dashboard'))

  // Highlight a nav item when the current route matches its href. Some hrefs carry
  // query params (e.g. My Cases -> /attorney-dashboard?tab=leads); comparing against
  // location.pathname alone never matched those, so the tab never highlighted. Match
  // the path and require every query param in the href to be present in the URL.
  const isNavItemActive = (href: string): boolean => {
    const [path, query] = href.split('?')
    if (location.pathname !== path) return false
    if (!query) return true
    const target = new URLSearchParams(query)
    const current = new URLSearchParams(location.search)
    for (const [key, value] of target.entries()) {
      if (current.get(key) !== value) return false
    }
    return true
  }
  // Clicking the logo takes signed-in users to their home surface (plaintiffs to
  // their Dashboard) rather than the marketing landing page.
  const logoDestination = !isAuthenticated
    ? navLinks.home
    : isAdmin || isAdminArea
      ? '/admin'
      : isAttorney
        ? '/attorney-dashboard'
        : '/dashboard'
  const shouldLoadPlaintiffSummary = !!authToken && !isAttorney
  const storedUser = getStoredUser<{ firstName?: string }>('user')
  const userName = storedUser?.firstName || 'User'
  const headerLabel = isAdmin ? 'Admin' : (userName || 'User')
  const pendingAssessmentId =
    typeof window !== 'undefined' && !isAuthenticated
      ? localStorage.getItem('pending_assessment_id')
      : null

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

  const caseNavItem = isAdmin
    ? { name: 'Cases', href: '/admin/cases', icon: FileTextIcon }
    : isAttorney
      ? { name: t('common.myCases'), href: '/attorney-dashboard?tab=leads', icon: FileTextIcon }
      : (isAuthenticated || hasCase)
        ? {
            name: hasCase ? t('common.continueMyCase') : 'My Case Status',
            href: !isAuthenticated && pendingAssessmentId ? `/results/${pendingAssessmentId}` : navLinks.myCase,
            icon: FileTextIcon,
          }
        : null

  const navItems = [
    { name: t('common.howItWorks'), href: navLinks.howItWorks, icon: null },
    caseNavItem,
    { name: t('common.forAttorneys'), href: navLinks.forAttorneys, icon: ScaleIcon },
    { name: t('common.help'), href: navLinks.help, icon: HelpCircleIcon },
  ].filter((item): item is { name: string; href: string; icon: typeof FileTextIcon | null } => Boolean(item))

  const shellIconFallback = <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden />
  const languageFallback = <div className="h-5 w-16 rounded bg-slate-100 dark:bg-slate-800" aria-hidden />

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#ffffff_45%,_rgba(224,242,254,0.6)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_26%),linear-gradient(135deg,_#020617_0%,_#020617_48%,_#0f172a_100%)] transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <RouteProgressBar />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Header - single row, compact */}
      <header className="relative z-50 border-b border-slate-200/70 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800/80 dark:bg-slate-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.03)] md:sticky md:top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 h-[72px] md:h-20 py-1">
            {/* Left: Hamburger (mobile) + Logo */}
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden -ml-2 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
              <Link
                to={logoDestination}
                aria-label={t('common.appName')}
                className="flex shrink-0 items-center rounded-xl px-1.5 py-1 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:bg-slate-800/70 dark:focus-visible:ring-offset-slate-900"
              >
                <BrandLogo appName={t('common.appName')} size="xl" />
              </Link>
            </div>

            {/* Center nav - hidden during intake for focus mode */}
              {!isFocusRoute && (
            <nav className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/72 px-2 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      isNavItemActive(item.href)
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
            <div className="flex min-w-0 items-center gap-2 lg:gap-6">
              {showWorkspaceThemeToggle && (
                <button
                  type="button"
                  onClick={toggle}
                  className="hidden lg:inline-flex rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={darkMode ? 'Use light theme' : 'Use dark theme'}
                >
                  {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
              )}
              <div className="hidden lg:block">
                <Suspense fallback={languageFallback}>
                  <LanguageSwitcher />
                </Suspense>
              </div>
              {isAuthenticated ? (
                <>
                  {/* Notification bell for attorneys */}
                  {isAttorney && (
                    <div className="hidden lg:block">
                      <Suspense fallback={shellIconFallback}>
                        <NotificationBell />
                      </Suspense>
                    </div>
                  )}
                  {/* Notification bell for plaintiffs */}
                  {!isAttorney && !isAdmin && !isAdminArea && (
                    <div className="hidden lg:block">
                      <Suspense fallback={shellIconFallback}>
                        <PlaintiffNotificationBell />
                      </Suspense>
                    </div>
                  )}
                  {/* User profile dropdown - hidden on mobile, menu in hamburger */}
                  <div className="relative hidden lg:block" ref={userMenuRef}>
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
                          to={isAdminArea ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'}
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {isAdminArea ? t('common.adminDashboard') : t('common.dashboard')}
                        </Link>
                        <Link
                          to={isAdminArea ? '/admin/cases' : isAttorney ? '/attorney-dashboard?tab=leads' : '/assessments'}
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {isAdminArea ? 'Cases' : t('common.myCases')}
                        </Link>
                        {!isAdmin && (
                          <>
                            <Link
                              to={isAttorney ? '/attorney-profile' : '/profile'}
                              onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              My Profile
                            </Link>
                            {isAttorney && (
                              <>
                                <Link
                                  to="/attorney-dashboard?tab=profile"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  Profile Settings
                                </Link>
                                <Link
                                  to="/firm-dashboard"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  Firm Dashboard
                                </Link>
                                <Link
                                  to="/firm-settings"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  Firm Settings
                                </Link>
                                <Link
                                  to="/attorney-billing"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  Billing
                                </Link>
                              </>
                            )}
                          </>
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
                  <div className="relative hidden lg:block" ref={signInRef}>
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
                  {!['/assess', '/intake', '/rose', '/assessment/start'].includes(location.pathname) &&
                    !location.pathname.startsWith('/results') &&
                    !location.pathname.startsWith('/attorney-register') &&
                    !location.pathname.startsWith('/attorney-license-upload') && (
                    <Link
                      to={navLinks.startAssessment}
                      className="hidden items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-500/25 ring-1 ring-white/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent-500/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:inline-flex"
                    >
                      <FileTextIcon className="h-4 w-4" aria-hidden />
                      {t('common.startAssessment')}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {!isFocusRoute && !isAuthenticated && (
          <div className="border-t border-slate-200/60 px-3 pb-2 lg:hidden dark:border-slate-800/70">
            <div className="flex items-center gap-2 overflow-x-auto py-2 [-webkit-overflow-scrolling:touch]">
              <Link to={navLinks.howItWorks} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                {t('common.howItWorks')}
              </Link>
              <Link to={navLinks.forAttorneys} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                {t('common.forAttorneys')}
              </Link>
              <Link to={navLinks.help} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                {t('common.help')}
              </Link>
              <div className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <Suspense fallback={languageFallback}>
                  <LanguageSwitcher />
                </Suspense>
              </div>
              <Link to={navLinks.plaintiffLogin} className="shrink-0 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                {t('common.signIn')}
              </Link>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/80 bg-white px-4 py-4 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex max-w-lg flex-col gap-2">
              <div className="mb-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Menu</span>
                <Suspense fallback={languageFallback}>
                  <LanguageSwitcher />
                </Suspense>
              </div>
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
                  {!isFocusRoute && (
                    <>
                      <Link to={isAdminArea ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{isAdminArea ? 'Admin Dashboard' : 'Dashboard'}</Link>
                      <Link to={isAdminArea ? '/admin/cases' : isAttorney ? '/attorney-dashboard?tab=leads' : navLinks.myCase} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{isAdminArea ? 'Cases' : isAttorney ? 'My Cases' : (hasCase ? 'Continue My Case' : 'My Case')}</Link>
                      {!isAdmin && (
                        <Link to={isAttorney ? '/attorney-profile' : '/profile'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">My Profile</Link>
                      )}
                      {isAttorney && (
                        <>
                          <Link to="/attorney-dashboard?tab=profile" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Profile Settings</Link>
                          <Link to="/firm-dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Firm Dashboard</Link>
                          <Link to="/firm-settings" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Firm Settings</Link>
                        </>
                      )}
                  <Link to={navLinks.howItWorks} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.howItWorks')}</Link>
                  <Link to={navLinks.help} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.help')}</Link>
                    </>
                  )}
                  <div className="border-t border-slate-200 my-2 pt-2">
                    <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.logout')}</button>
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
                  {!isFocusRoute && navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {item.name}
                    </Link>
                  ))}
                  <div className="border-t border-slate-200 my-2 pt-2">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">{t('common.signIn')}</p>
                    <Link to={navLinks.plaintiffLogin} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.plaintiffLogin')}</Link>
                    <Link to={navLinks.attorneyLogin} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.attorneyLogin')}</Link>
                    <Link to={navLinks.adminLogin} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.adminLogin')}</Link>
                  </div>
                  {!['/assess', '/intake', '/rose', '/assessment/start'].includes(location.pathname) &&
                    !location.pathname.startsWith('/results') &&
                    !location.pathname.startsWith('/attorney-register') &&
                    !location.pathname.startsWith('/attorney-license-upload') && (
                    <Link
                      to={navLinks.startAssessment}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-4 py-3 text-center font-bold text-white shadow-lg shadow-accent-500/25"
                    >
                      <FileTextIcon className="h-5 w-5" aria-hidden />
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
      <main
        id="main-content"
        className={`mx-auto w-full max-w-7xl overflow-x-clip sm:px-6 lg:px-8 ${
          ['/assess', '/intake'].includes(location.pathname)
            ? 'h-[calc(100dvh-4.5rem-1px)] overflow-y-auto overscroll-y-contain py-2 md:h-[calc(100dvh-5rem-1px)]'
            : 'py-8'
        }`}
      >
        <div className={`min-w-0 px-3 sm:px-0 ${['/assess', '/intake'].includes(location.pathname) ? 'min-h-full' : ''}`}>
          {children}
        </div>
      </main>

      {/* Footer - hidden during assessment flow to reduce distractions */}
      {!['/assess', '/intake', '/rose'].includes(location.pathname) && (
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-[1.5fr_repeat(4,auto)] md:items-start md:justify-between">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                <BrandLogo mode="footer" size="md" appName={t('common.appName')} />
              </Link>
              <p className="mt-2 text-xs font-medium text-slate-300">
                {t('footer.trustRowShort')}
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.forPlaintiffs')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to={navLinks.startAssessment} className="text-slate-400 transition-colors hover:text-white">{t('footer.caseAssessment')}</Link></li>
                <li><Link to="/case-tracker" className="text-slate-400 transition-colors hover:text-white">{t('footer.caseTracker')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.forAttorneys')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to="/attorney-network" className="text-slate-400 transition-colors hover:text-white">{t('footer.joinAttorneyNetwork')}</Link></li>
                <li><Link to="/attorney-login" className="text-slate-400 transition-colors hover:text-white">{t('footer.attorneyLogin')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.resources')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to={navLinks.howItWorks} className="text-slate-400 transition-colors hover:text-white">{t('common.howItWorks')}</Link></li>
                <li><a href="mailto:support@clearcaseiq.com?subject=Support%20Request" className="text-slate-400 transition-colors hover:text-white">{t('footer.support')}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.legal')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to="/privacy-policy" className="text-slate-400 transition-colors hover:text-white">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms-of-service" className="text-slate-400 transition-colors hover:text-white">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-700/50 pt-3">
            <div className="flex flex-col gap-1.5 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>{t('footer.copyright')}</span>
              <a href="mailto:support@clearcaseiq.com?subject=Support%20Request" className="transition-colors hover:text-white">
                {t('footer.supportEmail')}
              </a>
            </div>
            <div className="mt-2 max-w-4xl text-[11px] leading-relaxed text-slate-500">
              <p>
                <span className="font-semibold uppercase tracking-wide text-slate-400">{t('footer.attorneyAdvertising')}</span>
                {' · '}
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
