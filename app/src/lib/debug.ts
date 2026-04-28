const DEBUG_API_STORAGE_KEY = 'caseiq:debugApi'

export function isApiDebugEnabled() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(DEBUG_API_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const apiDebug = {
  log: (...args: unknown[]) => {
    if (isApiDebugEnabled()) console.log(...args)
  },
  error: (...args: unknown[]) => {
    if (isApiDebugEnabled()) console.error(...args)
  },
}
