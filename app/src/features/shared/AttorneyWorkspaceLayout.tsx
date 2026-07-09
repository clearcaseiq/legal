import { type ComponentType } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Inbox,
  Gauge,
  Store,
  Upload,
  Briefcase,
  FolderOpen,
  CalendarDays,
  MessagesSquare,
  FileSignature,
  ListChecks,
  Contact,
  Wallet,
  Sparkles,
  Building2,
  ChevronRight,
} from 'lucide-react'
import { AttorneyWorkspaceProvider, useAttorneyWorkspace } from './AttorneyWorkspaceContext'
import { initials } from './ui'

interface NavEntry {
  to: string
  label: string
  description?: string
  icon: ComponentType<{ className?: string }>
  firmAdminOnly?: boolean
}

interface NavSection {
  id: string
  label: string
  entries: NavEntry[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'leadgen',
    label: 'Lead Generation',
    entries: [
      { to: '/attorney-dashboard/leadgen/matches', label: 'New Matches', description: 'Cases awaiting review', icon: Inbox },
      { to: '/attorney-dashboard/leadgen/quality', label: 'Lead Quality', description: 'Conversion by practice area', icon: Gauge },
      { to: '/attorney-dashboard/leadgen/marketplace', label: 'Marketplace Performance', description: 'Acquisition ROI', icon: Store },
    ],
  },
  {
    id: 'casework',
    label: 'Case Management',
    entries: [
      { to: '/attorney-dashboard/cases/active', label: 'Active Cases', description: 'Retained caseload', icon: Briefcase },
      { to: '/attorney-dashboard/cases/workspace', label: 'Case Workspace', description: 'Full case file', icon: FolderOpen },
      { to: '/attorney-dashboard/cases/calendar', label: 'Calendar & Consults', description: 'Upcoming meetings', icon: CalendarDays },
      { to: '/attorney-dashboard/cases/messages', label: 'Messages', description: 'Client & adjuster threads', icon: MessagesSquare },
      { to: '/attorney-dashboard/cases/documents', label: 'Documents & E-sign', description: 'Requests & signatures', icon: FileSignature },
      { to: '/attorney-dashboard/cases/tasks', label: 'Tasks', description: 'Cross-case queue', icon: ListChecks },
      { to: '/attorney-dashboard/cases/contacts', label: 'Contacts', description: 'Parties directory', icon: Contact },
      { to: '/attorney-dashboard/cases/billing', label: 'Billing', description: 'Fees, invoices, costs', icon: Wallet },
      { to: '/attorney-dashboard/cases/copilot', label: 'AI Copilot', description: 'Analysis & next actions', icon: Sparkles },
      { to: '/attorney-dashboard/cases/firm', label: 'Firm Dashboard', description: 'Team caseload', icon: Building2, firmAdminOnly: true },
      { to: '/attorney-dashboard/cases/intake', label: 'Intake', description: 'Manual & imported leads', icon: Upload },
    ],
  },
]

// Per-domain color coding for the nav chips + active states. Lead Generation is
// blue (acquisition), Case Management is emerald (delivery).
type DomainId = 'leadgen' | 'casework'

const DOMAIN_STYLE: Record<DomainId, {
  row: string
  chipActive: string
  chipIdle: string
  bar: string
  desc: string
  pillActive: string
}> = {
  leadgen: {
    row: 'bg-blue-50 text-blue-900',
    chipActive: 'bg-blue-600 text-white',
    chipIdle: 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-700',
    bar: 'bg-blue-600',
    desc: 'text-blue-500',
    pillActive: 'border-blue-300 bg-blue-50 text-blue-700',
  },
  casework: {
    row: 'bg-emerald-50 text-emerald-900',
    chipActive: 'bg-emerald-600 text-white',
    chipIdle: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:text-emerald-700',
    bar: 'bg-emerald-600',
    desc: 'text-emerald-600',
    pillActive: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
}

function domainStyle(id: string) {
  return DOMAIN_STYLE[(id as DomainId)] ?? DOMAIN_STYLE.leadgen
}

// Static case-management pages that live directly under /cases/*. Anything else in
// that slot (or under /lead/*) is a single-case workspace file.
const STATIC_CASE_PAGES = new Set([
  'active', 'workspace', 'calendar', 'messages', 'documents', 'tasks', 'contacts', 'billing', 'copilot', 'firm', 'intake',
])

/** True when the path is a single-case workspace file (/lead/:id/... or /cases/:id/...). */
function isCaseFilePath(pathname: string): boolean {
  if (pathname.startsWith('/attorney-dashboard/lead/')) return true
  const m = pathname.match(/^\/attorney-dashboard\/cases\/([^/]+)/)
  return Boolean(m && !STATIC_CASE_PAGES.has(m[1]))
}

function navEntryActive(to: string, pathname: string): boolean {
  if (pathname === to || pathname.startsWith(`${to}/`)) return true
  // The Case Workspace launcher owns the single-case file routes too.
  if (to === '/attorney-dashboard/cases/workspace' && isCaseFilePath(pathname)) return true
  return false
}

function domainForPath(pathname: string): 'Lead Generation' | 'Case Management' | 'Attorney Workspace' {
  if (pathname.startsWith('/attorney-dashboard/leadgen')) return 'Lead Generation'
  if (pathname.startsWith('/attorney-dashboard/cases')) return 'Case Management'
  if (isCaseFilePath(pathname)) return 'Case Management'
  return 'Attorney Workspace'
}

const MESSAGES_ROUTE = '/attorney-dashboard/cases/messages'

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function Sidebar() {
  const location = useLocation()
  const { attorney, isFirmAdmin, unreadMessages } = useAttorneyWorkspace()

  const isActive = (to: string) => navEntryActive(to, location.pathname)

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 space-y-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Link
          to="/attorney-profile"
          title="View your attorney profile"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-3 py-2.5 transition hover:border-brand-200 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm">
            {initials(attorney.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{attorney.name}</p>
            <p className="truncate text-xs text-slate-500">{attorney.firmName || 'Attorney workspace'}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </Link>
        {NAV_SECTIONS.map((section) => {
          const entries = section.entries.filter((entry) => !entry.firmAdminOnly || isFirmAdmin)
          const style = domainStyle(section.id)
          return (
            <div key={section.id}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {section.label}
              </p>
              <nav className="space-y-0.5">
                {entries.map((entry) => {
                  const Icon = entry.icon
                  const active = isActive(entry.to)
                  return (
                    <Link
                      key={entry.to}
                      to={entry.to}
                      className={`group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition ${
                        active ? style.row : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <span className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full ${style.bar}`} />
                      )}
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                          active ? style.chipActive : style.chipIdle
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium leading-tight">{entry.label}</span>
                        {entry.description && (
                          <span
                            className={`block text-[11px] leading-tight ${active ? style.desc : 'text-slate-400'}`}
                          >
                            {entry.description}
                          </span>
                        )}
                      </span>
                      {entry.to === MESSAGES_ROUTE && <NavBadge count={unreadMessages} />}
                    </Link>
                  )
                })}
              </nav>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function MobileNav() {
  const location = useLocation()
  const { isFirmAdmin, unreadMessages } = useAttorneyWorkspace()
  const isActive = (to: string) => navEntryActive(to, location.pathname)
  const entries = NAV_SECTIONS.flatMap((s) => s.entries.map((e) => ({ ...e, domain: s.id }))).filter(
    (e) => !e.firmAdminOnly || isFirmAdmin,
  )
  return (
    <div className="lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
        {entries.map((entry) => {
          const Icon = entry.icon
          const active = isActive(entry.to)
          const style = domainStyle(entry.domain)
          return (
            <Link
              key={entry.to}
              to={entry.to}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-semibold transition ${
                active ? style.pillActive : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`relative flex h-5 w-5 items-center justify-center rounded-full ${
                  active ? style.chipActive : style.chipIdle
                }`}
              >
                <Icon className="h-3 w-3" />
                {entry.to === MESSAGES_ROUTE && unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </span>
              {entry.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function WorkspaceChrome() {
  const location = useLocation()
  const domain = domainForPath(location.pathname)
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="font-semibold text-slate-700">ClearCaseIQ</span>
        <span className="text-slate-300">/</span>
        <span>{domain}</span>
      </div>
      <div className="flex gap-6">
        <Sidebar />
        <div className="min-w-0 flex-1 space-y-4">
          <MobileNav />
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default function AttorneyWorkspaceLayout() {
  return (
    <AttorneyWorkspaceProvider>
      <WorkspaceChrome />
    </AttorneyWorkspaceProvider>
  )
}
