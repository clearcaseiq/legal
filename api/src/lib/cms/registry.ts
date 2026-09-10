/**
 * Provider registry — maps a provider id to its connector implementation and
 * exposes metadata for the connect UI.
 */
import { supportsInboundSync, type CmsConnector, type CmsProviderId, type CmsProviderMeta } from './types'
import { clioConnector } from './providers/clio'
import { filevineConnector } from './providers/filevine'
import { smartadvocateConnector } from './providers/smartadvocate'
import { casepeerConnector } from './providers/casepeer'
import { zapierConnector } from './providers/zapier'

const CONNECTORS: Record<CmsProviderId, CmsConnector> = {
  clio: clioConnector,
  filevine: filevineConnector,
  smartadvocate: smartadvocateConnector,
  casepeer: casepeerConnector,
  zapier: zapierConnector,
}

export function getConnector(provider: string): CmsConnector | null {
  return (CONNECTORS as Record<string, CmsConnector>)[provider] ?? null
}

export function listProviderMeta(): CmsProviderMeta[] {
  // Derived here rather than restated in each connector's meta(), so a
  // provider that gains listMatters cannot forget to advertise it.
  return Object.values(CONNECTORS).map((c) => ({ ...c.meta(), supportsInbound: supportsInboundSync(c) }))
}

export const SUPPORTED_PROVIDERS: CmsProviderId[] = Object.keys(CONNECTORS) as CmsProviderId[]
