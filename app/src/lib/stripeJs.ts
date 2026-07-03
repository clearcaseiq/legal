// Loads Stripe.js from Stripe's CDN at runtime (the only supported way — Stripe
// requires the script be served from js.stripe.com and not bundled). Returns a
// cached, initialized Stripe instance for the given publishable key so we never
// inject the script or construct the client more than once.

type StripeInstance = any

const SCRIPT_SRC = 'https://js.stripe.com/v3'

let scriptPromise: Promise<void> | null = null
const clientCache = new Map<string, StripeInstance>()

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Stripe.js can only be loaded in the browser'))
  }
  if ((window as any).Stripe) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null
    if (existing) {
      if ((window as any).Stripe) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')))
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load Stripe.js'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export async function getStripeJs(publishableKey: string): Promise<StripeInstance> {
  if (!publishableKey) throw new Error('Missing Stripe publishable key')
  const cached = clientCache.get(publishableKey)
  if (cached) return cached

  await loadScript()
  const stripe = (window as any).Stripe(publishableKey)
  clientCache.set(publishableKey, stripe)
  return stripe
}
