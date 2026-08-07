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
  MoonIcon,
  SunIcon,
} from './StartupIcons'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useBrowserStateReady } from '../contexts/ServerRenderContext'
import { clearStoredAuth, getStoredRole, getStoredUser, hasValidAuthToken } from '../lib/auth'
import { isCalendarRoute, isWideContentRoute } from '../lib/layoutWidth'
import { loadPlaintiffHasCase, resetPlaintiffCaseHintCache } from '../lib/plaintiffCaseHint'

const NotificationBell = lazy(() => import('./NotificationBell'))
const NotificationsBell = lazy(() => import('./NotificationsBell'))
const PlaintiffNotificationBell = lazy(() => import('./PlaintiffNotificationBell'))
const PlaintiffNotificationsBell = lazy(() => import('./PlaintiffNotificationsBell'))
const LanguageSwitcher = lazy(() => import('./LanguageSwitcher'))
const SupportChatWidget = lazy(() => import('./SupportChatWidget'))

interface LayoutProps {
  children: ReactNode
}

const navLinks = {
  home: '/',
  howItWorks: '/how-it-works',
  myCase: '/dashboard',
  forAttorneys: '/attorney-network',
  help: '/help',
  startAssessment: '/assessment/start',
  plaintiffLogin: '/login/plaintiff',
  attorneyLogin: '/login/attorney',
  adminLogin: '/login/admin',
}

// Informational/marketing pages where a mobile visitor should always have a
// one-tap way to start the free assessment (the header CTA is tucked into the
// hamburger on small screens). Home is excluded — it renders its own scroll-aware
// sticky CTA. Attorney-facing pages (e.g. /attorney-network) are excluded too.
const MOBILE_ASSESSMENT_CTA_ROUTES = new Set<string>([
  '/how-it-works',
  '/help',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/disclosures',
])

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
  const [footerInView, setFooterInView] = useState(false)
  const signInRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)

  const { showWorkspaceThemeToggle, darkMode, toggle } = useTheme()
  // Sign-in state lives in localStorage, which the server cannot see. On
  // server-rendered routes these stay empty through hydration so both renders
  // produce the signed-out chrome, then the real values arrive on the next
  // commit. Client-only routes read them immediately, as before.
  const browserStateReady = useBrowserStateReady()
  const authToken = browserStateReady ? localStorage.getItem('auth_token') : null
  const attorney = browserStateReady ? localStorage.getItem('attorney') : null
  const isAuthenticated = browserStateReady && hasValidAuthToken()
  const storedRole = browserStateReady ? getStoredRole() : null
  const isAdmin = isAuthenticated && storedRole === 'admin'
  const isAdminArea = location.pathname.startsWith('/admin')
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isFocusRoute = ['/assess', '/intake', '/intake2', '/rose'].includes(location.pathname)
  // Dense, grid/table/dashboard workspace screens render edge-to-edge instead of
  // the centered reading-width column used by the rest of the app. The calendar
  // additionally uses a tighter vertical rhythm (it manages its own height).
  const isFullWidthWorkspace = isWideContentRoute(location.pathname)
  const isCalendar = isCalendarRoute(location.pathname)
  const isAttorney = !isAdmin && (!!attorney || location.pathname.startsWith('/attorney-dashboard') || location.pathname.startsWith('/firm-dashboard'))
  // Claimant/marketing routes (everything that isn't the attorney workspace or
  // admin) opt into a scoped visual polish so the attorney UI stays untouched.
  const isClaimantRoute = !isAttorney && !isAdmin && !isAdminArea
  // In-app claimant "screens" (forms and flows, not marketing pages) get a fixed
  // type scale: 18px main headings, 16px sub-headings, 16px fields/labels. The
  // marketing pages (home, how-it-works, attorney-network) are intentionally
  // excluded so their large hero titles are preserved.
  const isClaimantScreen =
    isClaimantRoute &&
    (['/assess', '/intake', '/intake2', '/register', '/forgot-password', '/reset-password', '/attorney-register', '/contact'].includes(location.pathname) ||
      location.pathname.startsWith('/results') ||
      location.pathname.startsWith('/login'))
  // Show the mobile Start Assessment bar on informational claimant pages so the
  // primary CTA is always one tap away (it lives in the hamburger otherwise).
  const showMobileAssessmentCta = isClaimantRoute && MOBILE_ASSESSMENT_CTA_ROUTES.has(location.pathname)
  // Home has its own scroll-aware sticky CTA; lift the chat launcher on mobile
  // wherever a bottom CTA bar can appear so the two don't overlap.
  const raiseChatLauncher = isClaimantRoute && (showMobileAssessmentCta || location.pathname === navLinks.home)

  // When the footer scrolls into view, retract the fixed mobile CTA so it no
  // longer overlaps the footer's links/copyright — letting the user reach the
  // very bottom of the page cleanly.
  useEffect(() => {
    if (!showMobileAssessmentCta) {
      setFooterInView(false)
      return
    }
    const el = footerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setFooterInView(entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [showMobileAssessmentCta, location.pathname])

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
  // The logo always returns to the public home page. Previously it routed signed-in
  // users to their own workspace, which meant that a plaintiff already sitting on
  // their Dashboard tapped the logo and nothing happened (same-route navigation) —
  // reported as "home page not opening on logo click" (CP-549).
  const logoDestination = navLinks.home
  const shouldLoadPlaintiffSummary = !!authToken && !isAttorney
  const storedUser = browserStateReady ? getStoredUser<{ firstName?: string }>('user') : null
  const userName = storedUser?.firstName || 'User'
  const headerLabel = isAdmin ? 'Admin' : (userName || 'User')
  const avatarInitial = (headerLabel || 'U').trim().charAt(0).toUpperCase()
  const roleLabel = isAdmin ? 'Administrator' : isAttorney ? 'Attorney' : 'Client'
  const pendingAssessmentId =
    browserStateReady && !isAuthenticated ? localStorage.getItem('pending_assessment_id') : null

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
      ? {
          name: t('common.myCases'),
          // Fixed New Matches route in the two-domain workspace shell — a stable
          // landing page independent of the last sub-tab browsed (#A3-35).
          href: '/attorney-dashboard/leadgen/matches',
          icon: FileTextIcon,
        }
      : (isAuthenticated || hasCase)
        ? {
            name: hasCase ? t('common.continueMyCase') : 'My Case Status',
            href: !isAuthenticated && pendingAssessmentId ? `/results/${pendingAssessmentId}` : navLinks.myCase,
            icon: FileTextIcon,
          }
        : null

  type NavItem = {
    name: string
    href: string
    icon: typeof FileTextIcon | null
    state?: unknown
  }
  const navItems = ([
    // Marketing links are only relevant pre-login; hide them once a user is
    // signed in so the nav focuses on their workspace (#138).
    isAuthenticated ? null : { name: t('common.howItWorks'), href: navLinks.howItWorks, icon: null },
    // Attorneys navigate via the workspace sidebar + logo + account menu, so the
    // center pill ("My Cases") is redundant for them — hide it. Plaintiffs and
    // logged-out visitors still get their case link.
    isAttorney ? null : caseNavItem,
    isAuthenticated ? null : { name: t('common.forAttorneys'), href: navLinks.forAttorneys, icon: ScaleIcon },
    // Help is intentionally NOT in the top header bar — it stays in the hamburger
    // menu, the account dropdown (attorneys), and the footer. Dropping it from the
    // header frees room so the language switcher is always visible on every device.
  ] as (NavItem | null)[]).filter((item): item is NavItem => item !== null)

  const shellIconFallback = <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden />
  const languageFallback = <div className="h-5 w-16 rounded bg-slate-100 dark:bg-slate-800" aria-hidden />
  const menuItemCls =
    'flex items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'

  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(135deg,_#f8fafc_0%,_#ffffff_45%,_rgba(224,242,254,0.6)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_26%),linear-gradient(135deg,_#020617_0%,_#020617_48%,_#0f172a_100%)] transition-colors duration-300${isClaimantRoute ? ' claimant-theme' : ''}${isClaimantScreen ? ' claimant-screen' : ''}`}>
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
              {!isFocusRoute && navItems.length > 0 && (
            <nav className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/72 px-2 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  state={item.state}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isNavItemActive(item.href)
                      ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/40 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            )}

            {/* Right: Language + Primary CTA + User menu */}
            <div className="flex min-w-0 items-center gap-2 lg:gap-3">
              {showWorkspaceThemeToggle && !isAttorney && (
                <button
                  type="button"
                  onClick={toggle}
                  className="hidden lg:inline-flex rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={darkMode ? 'Use light theme' : 'Use dark theme'}
                >
                  {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
              )}
              {/* Language switcher is shown for every role, including attorneys, who
                  otherwise had no way to change language (CP-557). */}
              <div className="hidden lg:block">
                <Suspense fallback={languageFallback}>
                  <LanguageSwitcher />
                </Suspense>
              </div>
              <span className="hidden h-6 w-px bg-slate-200 dark:bg-slate-800 lg:block" aria-hidden />
              {isAuthenticated ? (
                <>
                  {/* Notification bell for attorneys */}
                  {isAttorney && (
                    <div className="hidden items-center gap-1 lg:flex">
                      <Suspense fallback={shellIconFallback}>
                        <NotificationsBell />
                      </Suspense>
                      <Suspense fallback={shellIconFallback}>
                        <NotificationBell />
                      </Suspense>
                    </div>
                  )}
                  {/* Messages + notifications for plaintiffs — the header exposes both
                      a Message icon and a separate Notification bell (#179). */}
                  {!isAttorney && !isAdmin && !isAdminArea && (
                    <div className="hidden lg:flex items-center gap-1">
                      <Suspense fallback={shellIconFallback}>
                        <PlaintiffNotificationBell />
                      </Suspense>
                      <Suspense fallback={shellIconFallback}>
                        <PlaintiffNotificationsBell />
                      </Suspense>
                    </div>
                  )}
                  {/* User profile dropdown - hidden on mobile, menu in hamburger */}
                  <div className="relative hidden lg:block" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 py-1 pl-1 pr-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-inner">
                        {avatarInitial}
                      </span>
                      <span className="hidden max-w-[9rem] truncate xl:inline">{headerLabel}</span>
                      <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                            {avatarInitial}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{headerLabel}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{roleLabel}</p>
                          </div>
                        </div>
                        <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-800" />
                        <Link
                          to={isAdminArea ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'}
                          onClick={() => setUserMenuOpen(false)}
                          className={menuItemCls}
                        >
                          {isAdminArea ? t('common.adminDashboard') : t('common.dashboard')}
                        </Link>
                        <Link
                          to={isAdminArea ? '/admin/cases' : isAttorney ? '/attorney-dashboard/leadgen/matches' : '/assessments'}
                          onClick={() => setUserMenuOpen(false)}
                          className={menuItemCls}
                        >
                          {isAdminArea ? 'Cases' : t('common.myCases')}
                        </Link>
                        {!isAdmin && (
                          <>
                            <Link
                              to={isAttorney ? '/attorney-profile' : '/profile'}
                              onClick={() => setUserMenuOpen(false)}
                              className={menuItemCls}
                            >
                              My Profile
                            </Link>
                            {isAttorney && (
                              <>
                                <Link to="/attorney-dashboard?tab=profile" onClick={() => setUserMenuOpen(false)} className={menuItemCls}>
                                  Profile Settings
                                </Link>
                                <Link to="/firm-dashboard" onClick={() => setUserMenuOpen(false)} className={menuItemCls}>
                                  Firm Dashboard
                                </Link>
                                <Link to="/firm-settings" onClick={() => setUserMenuOpen(false)} className={menuItemCls}>
                                  Firm Settings
                                </Link>
                                <Link to="/attorney-billing" onClick={() => setUserMenuOpen(false)} className={menuItemCls}>
                                  Billing
                                </Link>
                                <Link to={navLinks.help} onClick={() => setUserMenuOpen(false)} className={menuItemCls}>
                                  {t('common.help')}
                                </Link>
                              </>
                            )}
                          </>
                        )}
                        <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-800" />
                        <button
                          onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
                      aria-haspopup="menu"
                      aria-expanded={signInOpen}
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900"
                    >
                      {t('common.signIn')}
                      <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${signInOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {signInOpen && (
                      <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5">
                        <Link to={navLinks.plaintiffLogin} onClick={() => setSignInOpen(false)} className={menuItemCls}>
                          {t('common.plaintiffLogin')}
                        </Link>
                        <Link to={navLinks.attorneyLogin} onClick={() => setSignInOpen(false)} className={menuItemCls}>
                          {t('common.attorneyLogin')}
                        </Link>
                        <Link to={navLinks.adminLogin} onClick={() => setSignInOpen(false)} className={menuItemCls}>
                          {t('common.adminLogin')}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Primary CTA - hidden during assessment/results/attorney registration */}
                  {!['/assess', '/intake', '/intake2', '/rose', '/assessment/start'].includes(location.pathname) &&
                    !location.pathname.startsWith('/results') &&
                    !location.pathname.startsWith('/attorney-register') &&
                    !location.pathname.startsWith('/attorney-license-upload') && (
                    <Link
                      to={navLinks.startAssessment}
                      className="hidden items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/25 ring-1 ring-inset ring-white/20 transition-all hover:brightness-[1.05] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:inline-flex"
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
            {/* Sign in is pinned outside the scroll area so it is always visible; the
                informational chips scroll in the remaining space. Previously Sign in was
                the last item inside the horizontal scroller, so it sat off-screen on
                narrow phones until the user scrolled the row (CP-348). */}
            <div className="flex items-center gap-2 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <Link to={navLinks.howItWorks} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                  {t('common.howItWorks')}
                </Link>
                <Link to={navLinks.forAttorneys} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                  {t('common.forAttorneys')}
                </Link>
              </div>
              {/* Language switcher is pinned OUTSIDE the horizontal scroller so it is
                  always visible, even on the narrowest phones (previously it was the
                  last scroll item and sat off-screen behind Help). */}
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
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t('common.menu')}</span>
                {/* Attorneys get the language switcher in the mobile menu too. */}
                <Suspense fallback={languageFallback}>
                  <LanguageSwitcher />
                </Suspense>
              </div>
              {isAuthenticated ? (
                <>
                  {showWorkspaceThemeToggle && !isAttorney && (
                    <button
                      type="button"
                      onClick={toggle}
                      className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      {darkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                      {darkMode ? 'Light mode' : 'Dark mode'}
                    </button>
                  )}
                  {isFocusRoute ? (
                    <>
                      <Link to="/" onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Home</Link>
                      <Link to={isAttorney ? '/attorney-dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Dashboard</Link>
                      <Link to={navLinks.help} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.help')}</Link>
                    </>
                  ) : (
                    <>
                      <Link to={isAdminArea ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{isAdminArea ? 'Admin Dashboard' : 'Dashboard'}</Link>
                      <Link to={isAdminArea ? '/admin/cases' : isAttorney ? '/attorney-dashboard/leadgen/matches' : navLinks.myCase} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{isAdminArea ? 'Cases' : isAttorney ? 'My Cases' : (hasCase ? 'Continue My Case' : 'My Case')}</Link>
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
                  {!['/assess', '/intake', '/intake2', '/rose', '/assessment/start'].includes(location.pathname) &&
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
        className={`mx-auto w-full overflow-x-clip ${
          isFullWidthWorkspace
            ? 'max-w-[1440px] px-4 xl:px-6 2xl:px-8'
            : 'max-w-7xl sm:px-6 lg:px-8'
        } ${
          ['/assess', '/intake', '/intake2'].includes(location.pathname)
            ? 'h-[calc(100dvh-4.5rem-1px)] overflow-y-auto overscroll-y-contain py-2 md:h-[calc(100dvh-5rem-1px)]'
            : isCalendar
              ? 'py-4'
              : 'py-8'
        }`}
      >
        <div className={`min-w-0 ${
          ['/assess', '/intake', '/intake2'].includes(location.pathname)
            ? 'min-h-full px-0'
            // The Case Snapshot (results) page goes edge-to-edge on mobile like
            // the intake steps; its cards carry their own inner padding.
            : location.pathname.startsWith('/results')
              ? 'px-0'
              : 'px-3 sm:px-0'
        } ${showMobileAssessmentCta ? 'pb-24 md:pb-0' : ''}`}>
          {children}
        </div>
      </main>

      {/* Footer - hidden during assessment flow to reduce distractions */}
      {!['/assess', '/intake', '/intake2', '/rose'].includes(location.pathname) && (
      isDashboard ? (
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>{t('footer.copyright')}</span>
            <div className="flex flex-wrap gap-3">
              <Link to="/help" className="hover:text-slate-900">{t('footer.helpCenter')}</Link>
              <Link to="/terms-of-service" className="hover:text-slate-900">{t('footer.termsOfService')}</Link>
              <Link to="/privacy-policy" className="hover:text-slate-900">{t('footer.privacyPolicy')}</Link>
              <Link to="/disclosures" className="hover:text-slate-900">{t('footer.disclosures')}</Link>
              <Link to="/disclosures#california" className="hover:text-slate-900">{t('footer.doNotSell')}</Link>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            {t('footer.entityName')} · {t('footer.platformLabel')} · {t('footer.locationCity')} — {t('footer.disclaimer')}
          </p>
        </div>
      </footer>
      ) : (
      <footer ref={footerRef} className="mt-auto border-t border-slate-700/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900">
        {/* When the fixed mobile "Start Assessment" CTA is present it overlaps the
            bottom of the footer (the footer lives outside <main>, so main's
            pb-24 doesn't clear it here). Pad the footer's bottom on mobile so its
            legal links and copyright stay above the button. */}
        <div className={`mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 ${showMobileAssessmentCta ? 'pb-10 md:pb-4' : ''}`}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-[1.5fr_repeat(4,auto)] md:items-start md:justify-between">
            {/* On mobile the brand block laid out as a narrow vertical stack in a
                full-width row, leaving a large empty gap on the right. Lay the logo
                and the identity text side-by-side on small screens to fill the row,
                then revert to the stacked layout on md where it sits in its own
                narrow column. */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex flex-wrap items-start gap-x-8 gap-y-3 md:block">
                <Link to="/" className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                  <BrandLogo mode="footer" size="md" appName={t('common.appName')} />
                </Link>
                <div className="md:mt-2">
                  <p className="text-xs font-medium text-slate-300">
                    {t('footer.trustRowShort')}
                  </p>
                  {/* Business identity and location — transparency about who operates the
                      platform and from where, independent of any attorney disclosure. */}
                  <address className="mt-3 space-y-0.5 text-xs not-italic leading-relaxed text-slate-400">
                    <Link to="/" className="block font-semibold text-slate-300 transition-colors hover:text-white">{t('footer.entityName')}</Link>
                    <span className="block">{t('footer.platformLabel')}</span>
                    <span className="block">{t('footer.locationCity')}</span>
                  </address>
                  {/* Not-a-law-firm disclaimer, shown here alongside the platform
                      identity rather than as a separate block at the very bottom. */}
                  <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
                    {t('footer.disclaimer')}
                  </p>
                </div>
              </div>
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
                <li><Link to="/attorney-register" className="text-slate-400 transition-colors hover:text-white">{t('footer.joinAttorneyNetwork')}</Link></li>
                <li><Link to="/attorney-login" className="text-slate-400 transition-colors hover:text-white">{t('footer.attorneyLogin')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.resources')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to={navLinks.howItWorks} className="text-slate-400 transition-colors hover:text-white">{t('common.howItWorks')}</Link></li>
                <li><Link to="/help#how-we-resolve" className="text-slate-400 transition-colors hover:text-white">{t('footer.support')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.legal')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to="/privacy-policy" className="text-slate-400 transition-colors hover:text-white">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms-of-service" className="text-slate-400 transition-colors hover:text-white">{t('footer.terms')}</Link></li>
                <li><Link to="/disclosures" className="text-slate-400 transition-colors hover:text-white">{t('footer.disclosures')}</Link></li>
                <li><Link to="/disclosures#ai" className="text-slate-400 transition-colors hover:text-white">{t('footer.aiDisclosure')}</Link></li>
                <li><Link to="/disclosures#california" className="text-slate-400 transition-colors hover:text-white">{t('footer.doNotSell')}</Link></li>
                <li><Link to="/contact" className="text-slate-400 transition-colors hover:text-white">{t('footer.contact')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-700/50 pt-3">
            <div className="flex flex-col gap-1.5 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>{t('footer.copyright')}</span>
            </div>
          </div>
        </div>
      </footer>
      )
      )}

      {/* Mobile Start Assessment CTA — informational pages only. Mirrors the
          Home sticky CTA so the primary action is always reachable on small
          screens without opening the hamburger menu. */}
      {showMobileAssessmentCta && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-out md:hidden dark:border-slate-800 dark:bg-slate-900/95 ${
            footerInView ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
          }`}
          aria-hidden={footerInView}
        >
          <Link
            to={navLinks.startAssessment}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-600 via-orange-500 to-amber-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-accent-500/25"
          >
            <FileTextIcon className="h-5 w-5" aria-hidden />
            {t('common.startAssessment')}
          </Link>
        </div>
      )}

      {/* AI help assistant — available across the site, but hidden during the
          intake/assessment funnel to avoid distracting from completion. */}
      {!['/assess', '/intake', '/intake2', '/rose'].includes(location.pathname) && (
        <Suspense fallback={null}>
          <SupportChatWidget raiseOnMobile={raiseChatLauncher} />
        </Suspense>
      )}
    </div>
  )
}
