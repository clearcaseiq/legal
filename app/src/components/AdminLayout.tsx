import { ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  Users,
  Sliders,
  ClipboardCheck,
  MessageSquare,
  FileSearch,
  BarChart3,
  BrainCircuit,
  Shield,
  Settings,
  LogOut,
  Menu,
  Power,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { BrandMark } from './BrandLogo'
import { clearStoredAuth } from '../lib/auth'
import { useAdminRoutingStatus } from '../hooks/useAdminRoutingStatus'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/cases', label: 'Cases', icon: FileText },
  { path: '/admin/routing-queue', label: 'Routing Queue', icon: GitBranch },
  { path: '/admin/attorneys', label: 'Attorneys', icon: Users },
  { path: '/admin/matching-rules', label: 'Matching Rules', icon: Sliders },
  { path: '/admin/manual-review', label: 'Manual Review', icon: ClipboardCheck },
  { path: '/admin/routing-feedback', label: 'Routing Feedback', icon: BrainCircuit },
  { path: '/admin/communications', label: 'Communications', icon: MessageSquare },
  { path: '/admin/documents', label: 'Documents & OCR', icon: FileSearch },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/compliance', label: 'Compliance', icon: Shield },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { routingEnabled, loading: routingStatusLoading } = useAdminRoutingStatus()

  const handleLogout = () => {
    clearStoredAuth()
    navigate('/login/admin?redirect=/admin')
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
            <span className="font-semibold font-display text-slate-900 dark:text-slate-100 tracking-tight">
              Admin
            </span>
            <span className="text-ui-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Ops
            </span>
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
              {routingStatusLoading ? 'Routing status...' : routingEnabled === false ? 'Routing off' : 'Routing on'}
            </Link>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-ui-sm pressable rounded-lg px-2 py-1 -mr-1"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 border-r border-slate-200/80 bg-white/88 pt-14 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:pt-0 transition-transform duration-200`}
        >
          <nav className="p-4 space-y-1 overflow-y-auto h-full">
            {navItems.map((item) => {
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-800 dark:text-brand-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
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
