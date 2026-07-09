import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export interface CaseWorkspaceValue {
  /** The lead/case id from the route, or null on the cross-case list surfaces. */
  caseId: string | null
  /** The active workspace section from the route (overview, evidence, billing, ...). */
  section: string
  /** Open a case workspace at a specific section. */
  openCase: (caseId: string, section?: string) => void
  /** Navigate to another section of the current case. */
  goToSection: (section: string) => void
  /** Return to the cross-case Active Cases list. */
  backToActiveCases: () => void
}

const CaseWorkspaceContext = createContext<CaseWorkspaceValue | null>(null)

/**
 * Lightweight per-case navigation context. The heavy per-case data/state still
 * lives in the AttorneyDashboard engine (which reads the same :leadId/:section
 * route params); this context gives the new casework surfaces a single, typed
 * way to open and move around a case workspace without threading navigate()
 * callbacks through every component.
 */
export function CaseWorkspaceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const params = useParams<{ leadId?: string; section?: string }>()

  const caseId = params.leadId ?? null
  const section = (params.section ?? 'overview').toLowerCase()

  const openCase = useCallback(
    (id: string, targetSection = 'overview') => {
      navigate(`/attorney-dashboard/lead/${id}/${targetSection}`)
    },
    [navigate],
  )

  const goToSection = useCallback(
    (targetSection: string) => {
      if (!caseId) return
      navigate(`/attorney-dashboard/lead/${caseId}/${targetSection}`)
    },
    [caseId, navigate],
  )

  const backToActiveCases = useCallback(() => {
    navigate('/attorney-dashboard/cases/active')
  }, [navigate])

  const value = useMemo<CaseWorkspaceValue>(
    () => ({ caseId, section, openCase, goToSection, backToActiveCases }),
    [caseId, section, openCase, goToSection, backToActiveCases],
  )

  return <CaseWorkspaceContext.Provider value={value}>{children}</CaseWorkspaceContext.Provider>
}

export function useCaseWorkspace(): CaseWorkspaceValue {
  const ctx = useContext(CaseWorkspaceContext)
  if (!ctx) {
    throw new Error('useCaseWorkspace must be used within a CaseWorkspaceProvider')
  }
  return ctx
}
