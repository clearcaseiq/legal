import { useEffect, useRef } from 'react'
import RoutingStateView from './RoutingStateView'

export default function CaseRoutingStatePanel({ routingState, onDismiss }: { routingState: any; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (routingState) window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }, [routingState])
  if (!routingState) return null
  return <section ref={ref} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="mb-2 font-semibold text-amber-900">Routing state (diagnostic)</h3><p className="mb-2 text-xs text-amber-800">Use this to verify the case was routed correctly. If introductions exist but the attorney doesn&apos;t see it, ensure they log in with the same email.</p><div className="max-h-72 overflow-auto rounded border border-amber-200 bg-white p-3"><RoutingStateView state={routingState} /></div><button onClick={onDismiss} className="mt-2 text-xs text-amber-700 hover:underline">Dismiss</button></section>
}
