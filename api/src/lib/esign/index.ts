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

/** Resolve a provider by id, falling back to ESIGN_PROVIDER / dropbox_sign. */
export function getESignatureProvider(id?: string): ESignatureProvider {
  const key = (id || process.env.ESIGN_PROVIDER || 'dropbox_sign') as ESignProviderId
  const provider = PROVIDERS[key]
  if (!provider) throw new ESignNotConfiguredError(String(key))
  return provider
}

/** Metadata for every known provider (drives a settings/connect UI). */
export function listESignatureProviders(): ESignProviderMeta[] {
  return [dropboxSignProvider.meta(), documensoProvider.meta()]
}

export * from './types'
