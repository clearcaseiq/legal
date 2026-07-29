/**
 * E-signature provider registry + selector.
 *
 * Choose the active provider with the ESIGN_PROVIDER env var (defaults to
 * dropbox_sign). Everything else in the app imports getESignatureProvider()
 * and stays provider-agnostic — routes never reference a vendor SDK directly.
 */
import { documensoProvider } from './documenso'
import { dropboxSignProvider } from './dropbox-sign'
import {
  ESignNotConfiguredError,
  type ESignProviderId,
  type ESignProviderMeta,
  type ESignatureProvider,
} from './types'

const PROVIDERS: Partial<Record<ESignProviderId, ESignatureProvider>> = {
  dropbox_sign: dropboxSignProvider,
  documenso: documensoProvider,
}

/**
 * Resolve a provider by id.
 *
 * An explicit id (e.g. the provider recorded on an existing envelope) is always
 * honoured — a envelope created on Dropbox Sign can only be voided there. When
 * the caller has no preference we take ESIGN_PROVIDER, but fall back to any
 * provider that actually has credentials, so a server configured for Documenso
 * alone doesn't fail against the `dropbox_sign` default (CP-436).
 */
export function getESignatureProvider(id?: string): ESignatureProvider {
  if (id) {
    const explicit = PROVIDERS[id as ESignProviderId]
    if (!explicit) throw new ESignNotConfiguredError(String(id))
    return explicit
  }

  const preferred = PROVIDERS[(process.env.ESIGN_PROVIDER || 'dropbox_sign') as ESignProviderId]
  if (preferred?.meta().configured) return preferred

  const configured = Object.values(PROVIDERS).find((p) => p?.meta().configured)
  if (configured) return configured

  throw new ESignNotConfiguredError(preferred?.id || process.env.ESIGN_PROVIDER || 'dropbox_sign')
}

/** True when at least one provider has usable credentials on this server. */
export function isESignatureConfigured(): boolean {
  return Object.values(PROVIDERS).some((p) => p?.meta().configured)
}

/** Metadata for every known provider (drives a settings/connect UI). */
export function listESignatureProviders(): ESignProviderMeta[] {
  return [dropboxSignProvider.meta(), documensoProvider.meta()]
}

export * from './types'
