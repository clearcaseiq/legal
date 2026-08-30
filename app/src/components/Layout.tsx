import { ReactNode, Suspense, lazy, useState, useRef, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import RouteProgressBar from './RouteProgressBar'
// Static, unlike the bells below. It renders in the header on every page for
// every visitor, signed in or not, on both the desktop and mobile bars, so
// there is never a load it is deferred past — only a placeholder standing in
// its place while its chunk arrives, and a reflow of the header when it does.
import LanguageSwitcher from './LanguageSwitcher'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
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
import { LANGUAGES } from '../i18n'
import { hreflangFor, localeHome } from '../i18n/routing'
import { localizedPath, pathForLocale } from '../data/localePathPairs'
import { isCalendarRoute, isWideAttorneyRoute, isWideContentRoute } from '../lib/layoutWidth'
import { loadPlaintiffHasCase, resetPlaintiffCaseHintCache } from '../lib/plaintiffCaseHint'
import { getApiOrigin } from '../lib/runtimeEnv'

const NotificationBell = lazy(() => import('./NotificationBell'))
const NotificationsBell = lazy(() => import('./NotificationsBell'))
const PlaintiffNotificationBell = lazy(() => import('./PlaintiffNotificationBell'))
const PlaintiffNotificationsBell = lazy(() => import('./PlaintiffNotificationsBell'))
const SupportChatWidget = lazy(() => import('./SupportChatWidget'))

interface LayoutProps {
  children: ReactNode
}

const NAV_LINKS = {
  home: '/',
  howItWorks: '/how-it-works',
  myCase: '/dashboard',
  forAttorneys: '/attorney-network',
  help: '/help',
  helpResolve: '/help#how-we-resolve',
  about: '/about',
  topics: '/topics',
  contact: '/contact',
  disclosures: '/disclosures',
  disclosuresAi: '/disclosures#ai',
  disclosuresCalifornia: '/disclosures#california',
  startAssessment: START_ASSESSMENT_HREF,
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
  '/about',
  '/press',
  '/insights',
  '/blog',
  '/partners/badge',
  '/tools/california-sol-checker',
  '/tools/medical-records-checklist',
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
  legalName: 'ClearCaseIQ Corp.',
  url: 'https://www.clearcaseiq.com',
  logo: 'https://www.clearcaseiq.com/clearcaseiq-logo.png',
  email: 'support@clearcaseiq.com',
  description:
    'AI-powered legal technology that helps injury victims evaluate personal injury claims and connect with participating attorneys — with consent. Not a law firm.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Los Angeles',
    addressRegion: 'CA',
    addressCountry: 'US',
  },
  areaServed: {
    '@type': 'AdministrativeArea',
    name: 'California',
  },
}

export default function Layout({ children }: LayoutProps) {
  const { t, language } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  // Read from the location rather than useSearchParams so the server sees it too,
  // which keeps the embedded first paint free of the full-page chrome.
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1'
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
  const [storedUser, setStoredUser] = useState<{ firstName?: string; role?: string; avatar?: string | null } | null>(null)
  // An attorney's header name comes from their own record, not the account's
  // `firstName`. The two are different values — the profile's display name is a
  // single free-text field ("Mike Marteen, Esq.") — so reading `firstName` here
  // left the header showing the signup name long after the profile was renamed.
  const [storedAttorney, setStoredAttorney] = useState<{ name?: string } | null>(null)
  useEffect(() => {
    if (!browserStateReady) return
    const refresh = () => {
      setStoredUser(getStoredUser<{ firstName?: string; role?: string; avatar?: string | null }>('user'))
      setStoredAttorney(getStoredUser<{ name?: string }>('attorney'))
    }
    refresh()
    window.addEventListener('clearcaseiq:user-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('clearcaseiq:user-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [browserStateReady, location.pathname])
  /**
   * Header and footer destinations, pointed at the reader's language.
   *
   * The shared chrome is the only site-wide set of links, so it is also the only
   * thing that can make the translated pages reachable: they were being found by
   * sitemap alone, and the language switcher is a button, which no crawler
   * follows. Paths with no translation resolve to themselves.
   */
  const navLinks = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(NAV_LINKS).map(([key, path]) => [key, localizedPath(path, language)])
      ) as typeof NAV_LINKS,
    [language]
  )

  /**
   * The footer's links to this page in every other language.
   *
   * One link per translated edition, pointing at the twin of the current page
   * where one exists and at that language's home page otherwise, so no page is a
   * dead end for a reader and no edition is reachable by sitemap alone.
   *
   * This was a single English/Spanish pair, which silently orphaned all seven
   * Chinese pages the moment they existed: they were in the sitemap with nothing
   * linking to them. `crawl-inventory.mjs` fails on exactly that, which is how it
   * was caught, and it will fail again for the next language if this is ever
   * narrowed back to a fixed pair.
   */
  const alternateLanguageLinks = useMemo(() => {
    return LANGUAGES.filter((entry) => entry.code !== language).map((entry) => ({
      to: pathForLocale(location.pathname, entry.code) ?? localeHome(entry.code),
      hrefLang: hreflangFor(entry.code),
      label: entry.label,
    }))
  }, [language, location.pathname])

  const accountRole = (storedUser?.role || '').toLowerCase()
  const isAdmin = isAuthenticated && storedRole === 'admin'
  const isAdminArea = location.pathname.startsWith('/admin')
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isFocusRoute = ['/assess', '/intake', '/intake2', '/rose'].includes(location.pathname)
  // Dense, grid/table/dashboard workspace screens render edge-to-edge instead of
  // the centered reading-width column used by the rest of the app. The calendar
  // additionally uses a tighter vertical rhythm (it manages its own height).
  // The plaintiff "My Case" dashboard shares the claimant wide width so it lines
  // up with the Case Snapshot and intake screens (handled locally so the shared
  // isWideContentRoute — reused by attorney-route logic — stays untouched).
  const isPlaintiffDashboard = location.pathname === '/dashboard'
  const isFullWidthWorkspace = isWideContentRoute(location.pathname) || isPlaintiffDashboard
  // The intake wizard (steps 1–5) gets an even wider canvas than the rest of the
  // wide workspace so the multi-column steps have maximum horizontal room. The
  // claimant "Your Case Snapshot" (results) report shares that same wider width.
  const isIntakeRoute = ['/assess', '/intake', '/intake2'].includes(location.pathname)
  const isWideClaimantRoute = isIntakeRoute || location.pathname.startsWith('/results') || isPlaintiffDashboard
  // Registration (the post-submission "create account" step) should share the wide
  // claimant width so the confirmation → create-account flow keeps one page width.
  const isRegisterRoute = location.pathname.startsWith('/register')
  // Plaintiff account screens ("My Cases" / Case Tracker and "My Profile") share the
  // Plaintiff Dashboard's wider column so the three portal screens line up.
  const isWidePlaintiffAccountRoute =
    location.pathname === '/case-tracker' || location.pathname === '/profile'
  const isCalendar = isCalendarRoute(location.pathname)
  // Trust the account / session role. A leftover `localStorage.attorney` blob from
  // a prior attorney login in the same browser must not label a plaintiff
  // "Attorney" or expose Firm Dashboard while they are on the client portal.
  const isAttorney =
    !isAdmin &&
    accountRole !== 'client' &&
    (storedRole === 'attorney' ||
      // Legacy attorney sessions that never wrote auth_role still carry the blob.
      (storedRole == null && !!attorney))
  // The attorney WORKSPACE sidebar renders by route (AttorneyWorkspaceLayout is
  // mounted for /attorney-* and /firm-* paths regardless of role detection), but
  // `isAttorney` above is role-based and can lag or mismatch on a fresh session
  // (missing auth_role, stale blob). That let the language switcher slip into the
  // attorney header (#7). Treat any attorney workspace route as attorney-only —
  // English-only — so the switcher can never show there. Excludes the public
  // /attorney-network marketing page (not in ATTORNEY_ROUTE_PREFIXES).
  const isAttorneyWorkspace = isAttorney || isWideAttorneyRoute(location.pathname)
  // Language switcher is for claimants/guests. Attorneys work the platform in
  // English only, so it is hidden for attorney sessions and on every attorney
  // workspace route (#7).
  const showHeaderLanguageSwitcher = !isAttorneyWorkspace
  const showThemeToggle = showWorkspaceThemeToggle && !isAttorney
  // The footer's language anchors are the only crawlable way into the Spanish
  // and Chinese editions, so they cannot simply be deleted — crawl-inventory.mjs
  // fails when a sitemap URL is unreachable by navigation. Crawlers are never
  // signed in, though, so hiding them for an active session keeps every
  // translated page linked while leaving them out of the app's own chrome.
  // Attorney and admin workspaces are English-only regardless, matching the
  // header switcher, which is already hidden there.
  const showFooterLanguageLinks = !isAuthenticated && !isAttorneyWorkspace && !isAdminArea
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
  const showMobileAssessmentCta =
    isClaimantRoute &&
    (MOBILE_ASSESSMENT_CTA_ROUTES.has(location.pathname) || location.pathname.startsWith('/blog/'))
  // Home has its own scroll-aware sticky CTA; lift the chat launcher on mobile
  // wherever a bottom CTA bar can appear so the two don't overlap.
  const raiseChatLauncher = isClaimantRoute && (showMobileAssessmentCta || location.pathname === navLinks.home)

  // Scrub stale attorney/staff keys when this browser session is a client account
  // (e.g. logged into Sarah Johnson earlier, then into srid without a full logout).
  useEffect(() => {
    if (!browserStateReady || !isAuthenticated) return
    if (accountRole !== 'client' && storedRole !== 'plaintiff') return
    if (localStorage.getItem('attorney')) localStorage.removeItem('attorney')
    if (localStorage.getItem('firm_member')) localStorage.removeItem('firm_member')
    if (localStorage.getItem('auth_role') === 'attorney') {
      localStorage.setItem('auth_role', 'plaintiff')
    }
  }, [browserStateReady, isAuthenticated, accountRole, storedRole])

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
  /**
   * Warm the home page's chunk before the logo is clicked.
   *
   * The logo is the one link that jumps from the signed-in app back out to the
   * marketing home page, and those routes never load its chunk. Clicking it cold
   * therefore downloads the chunk first, showing the empty route fallback — which
   * reads as a full page reload, unlike the same click from a page that already
   * has home in cache. Vite resolves this to the same module the route imports,
   * so a warmed chunk costs one fetch rather than two.
   */
  const prefetchLogoDestination = () => {
    void import('../pages/Home')
  }
  const shouldLoadPlaintiffSummary = !!authToken && !isAttorney
  const userName =
    (isAttorney ? storedAttorney?.name?.trim() : '') || storedUser?.firstName || 'User'
  const headerLabel = isAdmin ? 'Admin' : (userName || 'User')
  const avatarInitial = (headerLabel || 'U').trim().charAt(0).toUpperCase()
  const headerAvatarUrl = (() => {
    if (isAttorney || isAdmin) return null
    const avatar = storedUser?.avatar
    if (!avatar) return null
    if (/^(https?:)?\/\//.test(avatar) || avatar.startsWith('data:')) return avatar
    const origin = getApiOrigin()
    if (!origin) return avatar
    return `${origin}${avatar.startsWith('/') ? '' : '/'}${avatar}`
  })()
  const roleLabel = isAdmin ? 'Administrator' : isAttorney ? 'Attorney' : 'Client'
  const pendingAssessmentId =
    browserStateReady && !isAuthenticated ? localStorage.getItem('pending_assessment_id') : null
  // Once a claimant has started/completed a case, the marketing links ("How it
  // works", "For Attorneys") are noise — hide them so the nav focuses on their
  // case. Covers the active intake/results screens and any state where we know a
  // case exists (a pending assessment id for guests, or a server case once
  // signed in — both reflected in `hasCase`).
  const inCaseFlow =
    hasCase ||
    ['/assess', '/intake', '/intake2'].includes(location.pathname) ||
    location.pathname.startsWith('/results')

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

  const plaintiffCaseHref =
    !isAuthenticated && pendingAssessmentId ? `/results/${pendingAssessmentId}` : navLinks.myCase
  // Signed-in plaintiffs already have Dashboard (and Case Tracker / Profile from
  // the account menu). "Continue My Case" is redundant on every plaintiff
  // workspace screen — including /dashboard, /case-tracker, /profile, and
  // /results/:id. Keep it only for guests who have a pending case.
  const hidePlaintiffContinueMyCase =
    (isAuthenticated && !isAttorney && !isAdmin) ||
    isPlaintiffDashboard ||
    location.pathname.startsWith('/results/') ||
    location.pathname.startsWith('/case-tracker') ||
    location.pathname === '/profile'

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
      : (isAuthenticated || hasCase) && !hidePlaintiffContinueMyCase
        ? {
            // Guests with a pending case: way back into the case from marketing pages.
            name: hasCase ? t('common.continueMyCase') : 'My Case Status',
            href: plaintiffCaseHref,
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
    isAuthenticated || inCaseFlow ? null : { name: t('common.howItWorks'), href: navLinks.howItWorks, icon: null },
    // Attorneys navigate via the workspace sidebar + logo + account menu, so the
    // center pill ("My Cases") is redundant for them — hide it. Plaintiffs and
    // logged-out visitors still get their case link when they are not already
    // on that screen.
    isAttorney ? null : caseNavItem,
    isAuthenticated || inCaseFlow ? null : { name: t('common.forAttorneys'), href: navLinks.forAttorneys, icon: ScaleIcon },
    // Help is intentionally NOT in the top header bar — it stays in the hamburger
    // menu, the account dropdown (attorneys), and the footer. Dropping it from the
    // header frees room so the language switcher is always visible on every device.
  ] as (NavItem | null)[]).filter((item): item is NavItem => item !== null)

  // Matches a bell button exactly: `p-2` around a 20px icon is 36px square.
  const shellIconFallback = <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden />
  const menuItemCls =
    'flex items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'

  // An embedded tool renders bare. The chrome was previously included, so a
  // clinic that iframed the deadline checker published ClearCaseIQ's own header
  // and footer navigation inside their page — dozens of outbound links they never
  // agreed to, and a widget that looked broken.
  if (isEmbed) {
    return (
      <div className="bg-white p-3 dark:bg-slate-950 sm:p-4">
        <main id="main-content">{children}</main>
      </div>
    )
  }

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
        {/* Match the wide claimant / dashboard column so the logo lines up with page content. */}
        <div
          className={`mx-auto ${
            isWideClaimantRoute
              ? 'max-w-[1600px] px-4 sm:px-6'
              : isFullWidthWorkspace
                ? 'max-w-[1440px] px-4 xl:px-6 2xl:px-8'
                : 'max-w-7xl px-4 sm:px-6 lg:px-8'
          }`}
        >
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
                onMouseEnter={prefetchLogoDestination}
                onFocus={prefetchLogoDestination}
                onTouchStart={prefetchLogoDestination}
                className="flex shrink-0 items-center rounded-xl py-1 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:bg-slate-800/70 dark:focus-visible:ring-offset-slate-900"
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
              {showThemeToggle && (
                <button
                  type="button"
                  onClick={toggle}
                  className="hidden lg:inline-flex rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={darkMode ? 'Use light theme' : 'Use dark theme'}
                >
                  {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
              )}
              {showHeaderLanguageSwitcher && (
                <div className="hidden lg:block">
                  <LanguageSwitcher />
                </div>
              )}
              {/* Everything left of this divider is conditional, so the divider is
                  too — on an attorney workspace neither control renders and it was
                  left standing on its own, dividing nothing. */}
              {(showThemeToggle || showHeaderLanguageSwitcher) && (
                <span className="hidden h-6 w-px bg-slate-200 dark:bg-slate-800 lg:block" aria-hidden />
              )}
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
                      {headerAvatarUrl ? (
                        <img
                          src={headerAvatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover shadow-inner"
                        />
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-inner">
                          {avatarInitial}
                        </span>
                      )}
                      <span className="hidden max-w-[9rem] truncate xl:inline">{headerLabel}</span>
                      <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5">
                        {(() => {
                          const identity = (
                            <>
                              {headerAvatarUrl ? (
                                <img
                                  src={headerAvatarUrl}
                                  alt=""
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                                  {avatarInitial}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{headerLabel}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{roleLabel}</p>
                              </div>
                            </>
                          )
                          // Admins have no profile page of their own, so their name
                          // stays plain text rather than linking somewhere arbitrary.
                          if (isAdmin) {
                            return <div className="flex items-center gap-3 px-4 py-3">{identity}</div>
                          }
                          return (
                            <Link
                              to={isAttorney ? '/attorney-profile' : '/profile'}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:hover:bg-slate-800"
                            >
                              {identity}
                            </Link>
                          )
                        })()}
                        <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-800" />
                        <Link
                          to={isAdminArea ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'}
                          onClick={() => setUserMenuOpen(false)}
                          className={menuItemCls}
                        >
                          {isAdminArea ? t('common.adminDashboard') : t('common.dashboard')}
                        </Link>
                        {(isAdminArea || isAttorney) && (
                          <Link
                            to={isAdminArea ? '/admin/cases' : '/attorney-dashboard/leadgen/matches'}
                            onClick={() => setUserMenuOpen(false)}
                            className={menuItemCls}
                          >
                            {isAdminArea ? 'Cases' : t('common.myCases')}
                          </Link>
                        )}
                        {!isAdmin && (
                          <>
                            <Link
                              to={isAttorney ? '/attorney-profile' : '/profile'}
                              onClick={() => setUserMenuOpen(false)}
                              className={menuItemCls}
                            >
                              {t('common.myProfile')}
                            </Link>
                            {/* "Profile Settings" used to sit here as a second
                                entry. It is the same page as "My Profile" now. */}
                            {isAttorney && (
                              <>
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
                {!inCaseFlow && (
                  <>
                    <Link to={navLinks.howItWorks} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                      {t('common.howItWorks')}
                    </Link>
                    <Link to={navLinks.forAttorneys} className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                      {t('common.forAttorneys')}
                    </Link>
                  </>
                )}
              </div>
              {/* Language switcher is pinned OUTSIDE the horizontal scroller so it is
                  always visible, even on the narrowest phones (previously it was the
                  last scroll item and sat off-screen behind Help). */}
              <div className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <LanguageSwitcher />
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
                {/* Language switcher is hidden for attorneys (English-only workspace). */}
                {!isAttorneyWorkspace && <LanguageSwitcher />}
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
                      <Link to={navLinks.home} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Home</Link>
                      <Link to={isAttorney ? '/attorney-dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Dashboard</Link>
                      <Link to={navLinks.help} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.help')}</Link>
                    </>
                  ) : (
                    <>
                      <Link to={isAdminArea ? '/admin' : isAttorney ? '/attorney-dashboard' : '/dashboard'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{isAdminArea ? 'Admin Dashboard' : 'Dashboard'}</Link>
                      {/* Plaintiffs already have Dashboard → /dashboard; skip the duplicate "Continue My Case" entry. */}
                      {(isAdminArea || isAttorney || !hidePlaintiffContinueMyCase) && (
                      <Link to={isAdminArea ? '/admin/cases' : isAttorney ? '/attorney-dashboard/leadgen/matches' : plaintiffCaseHref} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{isAdminArea ? 'Cases' : isAttorney ? 'My Cases' : (hasCase ? t('common.continueMyCase') : t('common.myCase'))}</Link>
                      )}
                      {!isAdmin && (
                        <Link to={isAttorney ? '/attorney-profile' : '/profile'} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{t('common.myProfile')}</Link>
                      )}
                      {isAttorney && (
                        <>
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
            ? isWideClaimantRoute
              ? 'max-w-[1600px] px-4 sm:px-6'
              : 'max-w-[1440px] px-4 xl:px-6 2xl:px-8'
            : isRegisterRoute || isWidePlaintiffAccountRoute
              ? 'max-w-[1600px] px-4 sm:px-6'
              : 'max-w-7xl sm:px-6 lg:px-8'
        } ${
          isIntakeRoute
            ? 'h-[calc(100dvh-4.5rem-1px)] overflow-y-auto overscroll-y-contain pt-0 pb-2 md:h-[calc(100dvh-5rem-1px)]'
            : isCalendar
              ? 'py-4'
              : isPlaintiffDashboard
                ? 'py-0'
                : 'py-8'
        }`}
      >
        <div className={`min-w-0 ${
          isIntakeRoute || isPlaintiffDashboard
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
        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
          <div className="flex w-full flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>{t('footer.copyright')}</span>
            <div className="flex flex-wrap gap-3">
              <Link to={navLinks.help} className="hover:text-slate-900">{t('footer.helpCenter')}</Link>
              <Link to="/terms-of-service" className="hover:text-slate-900">{t('footer.termsOfService')}</Link>
              <Link to="/privacy-policy" className="hover:text-slate-900">{t('footer.privacyPolicy')}</Link>
              <Link to={navLinks.disclosures} className="hover:text-slate-900">{t('footer.disclosures')}</Link>
              <Link to={navLinks.disclosuresCalifornia} className="hover:text-slate-900">{t('footer.doNotSell')}</Link>
            </div>
          </div>
          <p className="mt-2 w-full text-[11px] leading-relaxed text-slate-400 sm:text-justify">
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
                <Link to={navLinks.home} className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                  <BrandLogo mode="footer" size="md" appName={t('common.appName')} />
                </Link>
                <div className="md:mt-2">
                  <p className="text-xs font-medium text-slate-300">
                    {t('footer.trustRowShort')}
                  </p>
                  {/* Business identity and location — transparency about who operates the
                      platform and from where, independent of any attorney disclosure. */}
                  <address className="mt-3 space-y-0.5 text-xs not-italic leading-relaxed text-slate-400">
                    <Link to={navLinks.home} className="block font-semibold text-slate-300 transition-colors hover:text-white">{t('footer.entityName')}</Link>
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
                <li><Link to="/partners/badge" className="text-slate-400 transition-colors hover:text-white">Partner badge</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.resources')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to={navLinks.howItWorks} className="text-slate-400 transition-colors hover:text-white">{t('common.howItWorks')}</Link></li>
                <li><Link to={navLinks.about} className="text-slate-400 transition-colors hover:text-white">{t('footer.about')}</Link></li>
                {/* The only site-wide link into the topic library. Without it the
                    landing pages are reachable by sitemap alone. */}
                <li><Link to={navLinks.topics} className="text-slate-400 transition-colors hover:text-white">{t('footer.topicLibrary')}</Link></li>
              <li><Link to="/editorial-standards" className="text-slate-400 transition-colors hover:text-white">Editorial standards</Link></li>
                <li><Link to="/attorneys" className="text-slate-400 transition-colors hover:text-white">Attorney directory</Link></li>
                <li><Link to="/tools/california-sol-checker" className="text-slate-400 transition-colors hover:text-white">SOL checker</Link></li>
                <li><Link to="/tools/medical-records-checklist" className="text-slate-400 transition-colors hover:text-white">Records checklist</Link></li>
                <li><Link to="/blog" className="text-slate-400 transition-colors hover:text-white">Blog</Link></li>
                <li><Link to="/insights" className="text-slate-400 transition-colors hover:text-white">Insights</Link></li>
                <li><Link to="/press" className="text-slate-400 transition-colors hover:text-white">Press</Link></li>
                <li><Link to={navLinks.helpResolve} className="text-slate-400 transition-colors hover:text-white">{t('footer.support')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/90">{t('footer.legal')}</h3>
              <ul className="space-y-1.5 text-sm">
                <li><Link to="/privacy-policy" className="text-slate-400 transition-colors hover:text-white">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms-of-service" className="text-slate-400 transition-colors hover:text-white">{t('footer.terms')}</Link></li>
                <li><Link to={navLinks.disclosures} className="text-slate-400 transition-colors hover:text-white">{t('footer.disclosures')}</Link></li>
                <li><Link to={navLinks.disclosuresAi} className="text-slate-400 transition-colors hover:text-white">{t('footer.aiDisclosure')}</Link></li>
                <li><Link to={navLinks.disclosuresCalifornia} className="text-slate-400 transition-colors hover:text-white">{t('footer.doNotSell')}</Link></li>
                <li><Link to={navLinks.contact} className="text-slate-400 transition-colors hover:text-white">{t('footer.contact')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-700/50 pt-3">
            <div className="flex flex-col gap-1.5 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
              <span>{t('footer.copyright')}</span>
              {/* Real anchors, not the switcher button, because these are the only
                  crawlable routes into the translated editions. Each points at the
                  twin of the current page where one exists and at that language's
                  home otherwise, so every page links into every translated set. */}
              {showFooterLanguageLinks && (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {alternateLanguageLinks.map((alternate) => (
                    <Link
                      key={alternate.hrefLang}
                      to={alternate.to}
                      hrefLang={alternate.hrefLang}
                      className="text-slate-400 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-white"
                    >
                      {alternate.label}
                    </Link>
                  ))}
                </span>
              )}
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
