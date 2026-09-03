import { useLocation } from 'react-router-dom'

/**
 * Where the Case Assistance screens are mounted for the current visitor.
 *
 * The same components serve two shells: specialists at `/assistance`, and
 * managers inside the admin sidebar at `/admin/case-assistance`. Links have to
 * be built from wherever the screen actually is, or clicking a row throws a
 * manager out of the admin chrome mid-task.
 */
export function useAssistanceBasePath(): string {
  const { pathname } = useLocation()
  return pathname.startsWith('/admin') ? '/admin/case-assistance' : '/assistance'
}
