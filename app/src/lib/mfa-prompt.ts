/**
 * Bridge between the HTTP layer and the two-step verification dialog.
 *
 * An admin or attorney's sign-in token is admitted only to the MFA endpoints
 * until they enter a code, so the first API call after any sign-in path (the
 * login pages, OAuth callbacks, registration, invite acceptance) answers 401
 * MFA_REQUIRED. `http.ts` hands that to `requestMfa`, which opens the dialog
 * mounted at the app root and resolves once a full token is stored, so the
 * request can be retried. Concurrent callers share one prompt.
 */
export type MfaPromptRequest = { enrolled: boolean }
type MfaPromptHandler = (request: MfaPromptRequest) => Promise<boolean>

let handler: MfaPromptHandler | null = null
let pending: Promise<boolean> | null = null

export function registerMfaPrompt(next: MfaPromptHandler | null): void {
  handler = next
}

export function requestMfa(request: MfaPromptRequest): Promise<boolean> {
  if (!handler) return Promise.resolve(false)
  if (!pending) {
    pending = handler(request).finally(() => {
      pending = null
    })
  }
  return pending
}
