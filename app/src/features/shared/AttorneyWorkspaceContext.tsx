import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredUser } from '../../lib/auth'
import { getAttorneyUnreadCount } from '../../lib/api'
import { useFirmDashboardSummary } from '../../hooks/useFirmDashboardSummary'

/** How often (ms) to refresh the unread-message badge in the nav. */
const UNREAD_POLL_MS = 30_000

export interface AttorneyIdentity {
  id: string | null
  name: string
  email: string | null
  firmName: string | null
}

export interface AttorneyWorkspaceValue {
  attorney: AttorneyIdentity
  /** Firm role resolved from the firm workspace context (e.g. 'firm_admin', 'attorney'). */
  firmRole: string | null
  /** Firm permission strings resolved for the current member. */
  permissions: string[]
  /** True when the signed-in attorney can see firm-wide (all-attorney) surfaces. */
  isFirmAdmin: boolean
  loading: boolean
  /** Unread in-app client messages across all of this attorney's threads (polled). */
  unreadMessages: number
}

const AttorneyWorkspaceContext = createContext<AttorneyWorkspaceValue | null>(null)

function readStoredAttorney(): AttorneyIdentity {
  const attorney = getStoredUser<{
    id?: string
    name?: string
    firstName?: string
    lastName?: string
    email?: string
    firmName?: string
  }>('attorney')
  const user = getStoredUser<{ firstName?: string; lastName?: string; email?: string }>('user')

  const firstName = attorney?.firstName || user?.firstName || ''
  const lastName = attorney?.lastName || user?.lastName || ''
  const composed = `${firstName} ${lastName}`.trim()

  return {
    id: attorney?.id ?? null,
    name: attorney?.name || composed || 'Attorney',
    email: attorney?.email || user?.email || null,
    firmName: attorney?.firmName ?? null,
  }
}

export function AttorneyWorkspaceProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useFirmDashboardSummary()
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Poll the unread-message count so the "Messages" nav badge stays fresh while
  // the attorney works elsewhere in the workspace. Best-effort; errors are ignored.
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const res = await getAttorneyUnreadCount()
        if (!cancelled) setUnreadMessages(Number(res?.unreadCount) || 0)
      } catch {
        /* ignore transient failures */
      }
    }
    refresh()
    const id = window.setInterval(refresh, UNREAD_POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const value = useMemo<AttorneyWorkspaceValue>(() => {
    const attorney = readStoredAttorney()
    const workspace = (data?.workspace ?? {}) as { currentRole?: string; permissions?: string[] }
    const firmRole = workspace.currentRole ?? null
    const permissions = Array.isArray(workspace.permissions) ? workspace.permissions : []
    const isFirmAdmin =
      firmRole === 'firm_admin' ||
      permissions.includes('view_all_cases') ||
      permissions.includes('manage_users')

    return { attorney, firmRole, permissions, isFirmAdmin, loading, unreadMessages }
  }, [data, loading, unreadMessages])

  return <AttorneyWorkspaceContext.Provider value={value}>{children}</AttorneyWorkspaceContext.Provider>
}

export function useAttorneyWorkspace(): AttorneyWorkspaceValue {
  const ctx = useContext(AttorneyWorkspaceContext)
  if (!ctx) {
    throw new Error('useAttorneyWorkspace must be used within an AttorneyWorkspaceProvider')
  }
  return ctx
}
