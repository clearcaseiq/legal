import { ShieldCheck } from 'lucide-react'
import type { EsignProviderMeta } from '../lib/api-esign'

/**
 * Renders a radio list of e-signature tools the attorney can choose from.
 * When the document is a HIPAA authorization, only HIPAA-capable (BAA-backed or
 * self-hosted) providers are shown — mirroring the server-side guard.
 */
export function EsignProviderPicker({
  providers,
  documentType,
  value,
  onChange,
}: {
  providers: EsignProviderMeta[]
  documentType: string
  value: string | null
  onChange: (id: string) => void
}) {
  const requiresHipaa = documentType === 'hipaa_authorization'
  const available = providers.filter((p) => p.configured && (!requiresHipaa || p.hipaaCapable))

  if (providers.length === 0) {
    return <p className="text-sm text-gray-500">Loading signature tools…</p>
  }

  if (available.length === 0) {
    return (
      <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
        {requiresHipaa
          ? 'No HIPAA-capable e-signature tool is configured. A provider with a signed BAA (or a self-hosted deployment) is required for HIPAA authorizations.'
          : 'No e-signature tool is configured on the server yet.'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {available.map((p) => (
        <label
          key={p.id}
          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
            value === p.id
              ? 'border-brand-600 ring-1 ring-brand-600'
              : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="esign-provider"
            checked={value === p.id}
            onChange={() => onChange(p.id)}
            className="mt-1"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-medium text-gray-900">
              {p.label}
              {p.hipaaCapable && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-3 w-3" />
                  HIPAA-capable
                </span>
              )}
            </span>
            {p.notes && <span className="block text-xs text-gray-500 mt-0.5">{p.notes}</span>}
          </span>
        </label>
      ))}
      {requiresHipaa && (
        <p className="text-xs text-gray-500">
          Only HIPAA-capable tools are shown because this is a HIPAA authorization.
        </p>
      )}
    </div>
  )
}
