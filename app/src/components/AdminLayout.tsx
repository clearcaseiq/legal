import { ReactNode, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Workflow,
  Users,
  Sliders,
  SlidersHorizontal,
  ArrowLeftRight,
  ClipboardCheck,
  BadgeCheck,
  MessageSquare,
  FileSearch,
  BarChart3,
  BrainCircuit,
  ScrollText,
  Activity,
  Shield,
  MessageSquareText,
  Menu,
  Power,
  X,
  Building2,
  ToggleLeft,
  UserCog,
  Moon,
  Sun,
  LogOut,
  Inbox,
  Newspaper,
  MailCheck,
  Receipt,
  Headphones,
} from 'lucide-react'
import { BrandMark } from './BrandLogo'
import { useAdminRoutingStatus } from '../hooks/useAdminRoutingStatus'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import AdminNotificationBell from './AdminNotificationBell'
import { clearStoredAuth, getAdminLoginPath, getStoredUser } from '../lib/auth'
import { verifyAdminAccess } from '../lib/api-auth'
import {
  capabilityForAdminPath,
  getStoredAdminCapabilities,
  storeAdminCapabilities,
  type AdminCapability,
} from '../lib/adminCapabilities'

/**
 * Sidebar grouped by intent rather than one flat list: what you work through
 * today (Operations), who you route to (Network), what already happened
 * (Oversight), and what changes system behavior (Configuration). Configuration
 * also surfaces User Roles, Feature Toggles, and Firm Settings, which were
 * previously reachable only via link cards on the Settings page — so deep-linking
 * to them left nothing highlighted in the nav.
 */
const navGroups: {
  id: string
  label: string
  items: { path: string; id: string; label: string; icon: typeof LayoutDashboard }[]
}[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { path: '/admin', id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/ops-inbox', id: 'opsInbox', label: 'Ops Inbox', icon: Inbox },
      { path: '/admin/cases', id: 'cases', label: 'Cases', icon: FileText },
      { path: '/admin/case-assistance', id: 'caseAssistance', label: 'Case Assistance', icon: Headphones },
      { path: '/admin/case-flow', id: 'caseFlow', label: 'Case Flow', icon: Workflow },
      { path: '/admin/routing-queue', id: 'routingQueue', label: 'Routing Queue', icon: GitBranch },
      { path: '/admin/manual-review', id: 'manualReview', label: 'Manual Review', icon: ClipboardCheck },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    items: [
      { path: '/admin/attorneys', id: 'attorneys', label: 'Attorneys', icon: Users },
      { path: '/admin/invitations', id: 'invitations', label: 'Invitations', icon: MailCheck },
      { path: '/admin/case-results', id: 'caseResults', label: 'Case Results', icon: BadgeCheck },
    ],
  },
  {
    id: 'oversight',
    label: 'Oversight',
    items: [
      { path: '/admin/analytics', id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/admin/payments', id: 'payments', label: 'Transactions', icon: Receipt },
      { path: '/admin/routing-feedback', id: 'routingFeedback', label: 'Routing Feedback', icon: BrainCircuit },
      { path: '/admin/communications', id: 'communications', label: 'Communications', icon: MessageSquare },
      { path: '/admin/blog', id: 'blog', label: 'Blog', icon: Newspaper },
      { path: '/admin/documents', id: 'documents', label: 'Documents & OCR', icon: FileSearch },
      { path: '/admin/audit-logs', id: 'auditLogs', label: 'Audit Logs', icon: ScrollText },
      { path: '/admin/system-status', id: 'systemStatus', label: 'System Status', icon: Activity },
      { path: '/admin/compliance', id: 'compliance', label: 'Compliance', icon: Shield },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    items: [
      { path: '/admin/matching-rules', id: 'matchingRules', label: 'Matching Rules', icon: Sliders },
      { path: '/admin/heuristics', id: 'heuristics', label: 'Heuristics', icon: SlidersHorizontal },
      { path: '/admin/field-mappings', id: 'fieldMappings', label: 'Field Mappings', icon: ArrowLeftRight },
      { path: '/admin/users', id: 'users', label: 'User Roles', icon: UserCog },
      { path: '/admin/feature-toggles', id: 'featureToggles', label: 'Feature Toggles', icon: ToggleLeft },
      { path: '/admin/firm-settings', id: 'firmSettings', label: 'Firm Settings', icon: Building2 },
      { path: '/admin/settings', id: 'smsTools', label: 'SMS tools', icon: MessageSquareText },
    ],
  },
]


export default function AdminLayout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [capabilities, setCapabilities] = useState<AdminCapability[]>(() => getStoredAdminCapabilities())
  const { routingEnabled, loading: routingStatusLoading } = useAdminRoutingStatus()
  const { darkMode, toggle } = useTheme()
  const { t } = useLanguage()
  const adminUser = getStoredUser<{ email?: string; firstName?: string }>('user')
  const adminEmail = adminUser?.email?.trim() || null

  // Re-verify admin access when the shell mounts so a forged/stale localStorage
  // role cannot keep showing the console after the JWT is no longer allowed.
  useEffect(() => {
    let cancelled = false
    verifyAdminAccess()
      .then((access) => {
        if (cancelled) return
        storeAdminCapabilities(access.capabilities)
        setCapabilities(getStoredAdminCapabilities())
      })
      .catch(() => {
        if (cancelled) return
        clearStoredAuth()
        navigate(getAdminLoginPath(location.pathname), { replace: true })
      })
    return () => {
      cancelled = true
    }
    // Only on shell mount — not on every pathname change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const required = capabilityForAdminPath(item.path)
        return !required || capabilities.includes(required)
      }),
    }))
    .filter((group) => group.items.length > 0)

  const handleSignOut = () => {
    clearStoredAuth()
    navigate('/login/admin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.1),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/86 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/88">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 pressable rounded-lg"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <Link
              to="/admin/matching-rules"
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                routingStatusLoading
                  ? 'bg-slate-100 text-slate-500'
                  : routingEnabled === false
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {routingStatusLoading ? t('adminChrome.routingStatus') : routingEnabled === false ? t('adminChrome.routingOff') : t('adminChrome.routingOn')}
            </Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {adminEmail && (
              <span
                className="hidden max-w-[180px] truncate text-xs text-slate-500 dark:text-slate-400 md:inline"
                title={adminEmail}
              >
                {adminEmail}
              </span>
            )}
            <AdminNotificationBell />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggle}
              aria-label={darkMode ? t('adminChrome.useLightTheme') : t('adminChrome.useDarkTheme')}
              className="pressable rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label={t('adminChrome.signOut')}
              className="pressable inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('adminChrome.signOut')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 border-r border-slate-200/80 bg-white/88 pt-14 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:pt-0 transition-transform duration-200`}
        >
          <nav className="h-full space-y-5 overflow-y-auto p-4 pb-8">
            {visibleNavGroups.map((group) => (
              <div key={group.id}>
                <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t(`adminNav.groups.${group.id}`)}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      item.path === '/admin'
                        ? location.pathname === '/admin'
                        : location.pathname.startsWith(item.path)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-800 dark:text-brand-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {t(`adminNav.items.${item.id}.label`)}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-auto p-4 md:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
