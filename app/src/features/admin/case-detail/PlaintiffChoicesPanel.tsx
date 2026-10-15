export type PlaintiffChoiceStatus = 'waiting' | 'reviewing' | 'accepted' | 'passed' | 'no_response'

export interface PlaintiffChoice {
  id: string
  rank: number
  name: string
  firmName?: string | null
  status: PlaintiffChoiceStatus
}

const STATUS_LABELS: Record<PlaintiffChoiceStatus, { label: string; className: string }> = {
  waiting: { label: 'Not contacted', className: 'bg-slate-100 text-slate-600' },
  reviewing: { label: 'Reviewing', className: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800' },
  passed: { label: 'Passed', className: 'bg-slate-100 text-slate-500' },
  no_response: { label: 'No response', className: 'bg-amber-100 text-amber-800' },
}

export default function PlaintiffChoicesPanel({
  choices,
  routing,
  error,
  canOverride,
  onRouteNext,
}: {
  choices: PlaintiffChoice[]
  routing: boolean
  error: string | null
  canOverride: boolean
  onRouteNext: (override?: boolean) => void
}) {
  if (choices.length === 0) {
    return (
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        The plaintiff did not rank any attorneys for this case.
      </div>
    )
  }

  const next = choices.find((choice) => choice.status === 'waiting')
  const inFlight = choices.find((choice) => choice.status === 'reviewing' || choice.status === 'accepted')

  return (
    <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
      <p className="text-sm font-semibold text-slate-900">Plaintiff's choices, in their order</p>
      <p className="mt-0.5 text-xs text-slate-600">
        The plaintiff authorized only these attorneys. Routing offers the case to one at a time, in this order.
      </p>
      <ol className="mt-3 space-y-1.5">
        {choices.map((choice) => (
          <li
            key={choice.id}
            className={`flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm ${choice.id === next?.id ? 'bg-white ring-1 ring-brand-300' : ''}`}
          >
            <span className="min-w-0 truncate">
              <span className="mr-2 font-semibold text-brand-700">{choice.rank}.</span>
              <span className="font-medium text-slate-900">{choice.name}</span>
              {choice.firmName && <span className="text-slate-500"> · {choice.firmName}</span>}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[choice.status].className}`}>
              {STATUS_LABELS[choice.status].label}
            </span>
          </li>
        ))}
      </ol>
      {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {inFlight ? (
          <p className="text-sm text-slate-600">
            {inFlight.name} {inFlight.status === 'accepted' ? 'has accepted this case.' : 'is reviewing this case now.'}
          </p>
        ) : next ? (
          <button
            type="button"
            onClick={() => onRouteNext(false)}
            disabled={routing}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {routing ? 'Routing…' : `Send to next choice: ${next.name}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRouteNext(false)}
            disabled={routing}
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {routing ? 'Proposing…' : 'All choices tried: propose a new set to the plaintiff'}
          </button>
        )}
        {canOverride && (
          <button
            type="button"
            onClick={() => onRouteNext(true)}
            disabled={routing}
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            Send anyway, past the routing pause
          </button>
        )}
      </div>
    </div>
  )
}
