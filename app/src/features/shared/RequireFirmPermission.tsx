import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getStoredRole } from '../../lib/auth'
import { loadFirmAccess, type FirmAction } from '../../hooks/useFirmAccess'
import { STAFF_CASES_ROUTE } from './AttorneyWorkspaceLayout'

/**
 * Lets firm staff into a page only when their firm permissions include the
 * action. Attorneys pass straight through: they always keep their own pages.
 * The server enforces the same rule; this only keeps staff off a page whose
 * requests would all be refused.
 */
export default function RequireFirmPermission({ action, children }: { action: FirmAction; children: ReactNode }) {
  const isStaff = getStoredRole() === 'staff'
  const [state, setState] = useState<'pending' | 'allow' | 'deny'>(isStaff ? 'pending' : 'allow')

  useEffect(() => {
    if (!isStaff) return
    let cancelled = false
    void loadFirmAccess().then((access) => {
      if (!cancelled) setState(access?.actions?.[action] ? 'allow' : 'deny')
    })
    return () => {
      cancelled = true
    }
  }, [isStaff, action])

  if (state === 'pending') return null
  if (state === 'deny') return <Navigate to={STAFF_CASES_ROUTE} replace />
  return <>{children}</>
}
