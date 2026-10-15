import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, PenLine } from 'lucide-react'
import { getCountersignQueue, resendCountersignEmail, type CountersignQueueItem } from '../../lib/api-esign'
import { SectionCard } from '../shared/ui'

function signedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/** Agreements the client signed that wait on this attorney's countersignature. */
export default function CountersignQueueCard() {
  const [items, setItems] = useState<CountersignQueueItem[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getCountersignQueue()
      .then((rows) => { if (!cancelled) setItems(rows) })
      .catch(() => { /* the card simply stays hidden */ })
    return () => { cancelled = true }
  }, [])

  if (items.length === 0) return null

  const resend = async (item: CountersignQueueItem) => {
    setBusyId(item.id); setMessage(null)
    try {
      await resendCountersignEmail(item.id)
      setMessage({ tone: 'ok', text: `Signing email for ${item.title} re-sent.` })
    } catch (err: any) {
      setMessage({ tone: 'err', text: err?.response?.data?.error || 'Could not re-send the signing email.' })
    } finally { setBusyId(null) }
  }

  return (
    <SectionCard
      title={<><PenLine className="h-4 w-4 text-amber-600" />Waiting for your countersignature ({items.length})</>}
    >
      <p className="mb-3 text-xs text-slate-500">
        The client signed these. Each one is only complete, and only shows as signed to the client, once you countersign.
      </p>
      {message && (
        <p className={`mb-3 rounded-md px-3 py-2 text-sm ${message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <Link to={item.caseLink} className="font-medium text-slate-900 hover:text-brand-700 dark:text-slate-100">
                {item.title}
              </Link>
              <p className="text-xs text-slate-500">
                {item.clientName} signed {signedAgo(item.clientSignedAt)}
              </p>
            </div>
            {item.countersignUrl ? (
              <a
                href={item.countersignUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                <PenLine className="h-3.5 w-3.5" /> Countersign
              </a>
            ) : (
              <button
                type="button"
                onClick={() => void resend(item)}
                disabled={busyId === item.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" /> {busyId === item.id ? 'Sending…' : 'Resend my signing email'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
