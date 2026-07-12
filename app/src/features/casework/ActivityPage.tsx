import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, MessagesSquare, ArrowRight } from 'lucide-react'
import { getFirmActivity, type ActivityItem } from '../../lib/api'
import { PageHeader, SectionCard, EmptyState, Avatar, Badge } from '../shared/ui'

const POLL_MS = 30_000

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

function ActivityRow({ item, onOpen }: { item: ActivityItem; onOpen: (item: ActivityItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      disabled={!item.link}
      className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 disabled:cursor-default"
    >
      <Avatar name={item.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">{item.author}</p>
          <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(item.at)}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{item.snippet}</p>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="truncate font-medium text-slate-500">{item.caseName}</span>
          {item.claimType && (
            <>
              <span className="text-slate-300">•</span>
              <span className="truncate">{item.claimType.replace(/_/g, ' ')}</span>
            </>
          )}
          {item.link && (
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
              Open case <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function ActivityPage() {
  const navigate = useNavigate()
  const [mentions, setMentions] = useState<ActivityItem[]>([])
  const [discussion, setDiscussion] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await getFirmActivity()
      setMentions(res.mentions || [])
      setDiscussion(res.discussion || [])
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, POLL_MS)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const openItem = (item: ActivityItem) => {
    if (item.link) navigate(item.link)
  }

  const mentionCount = useMemo(() => mentions.length, [mentions])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        description="Where you've been @mentioned and recent discussion on your cases. Click any item to jump into the matter."
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      )}

      <SectionCard
        title="Mentions of you"
        trailing={mentionCount > 0 ? <Badge tone="brand">{mentionCount}</Badge> : undefined}
      >
        {loading ? (
          <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
        ) : mentions.length === 0 ? (
          <EmptyState message="No mentions yet. When a teammate @mentions you in a case discussion, it shows up here." />
        ) : (
          <div className="space-y-0.5">
            {mentions.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <AtSign className="mt-3 h-4 w-4 shrink-0 text-brand-400" />
                <div className="min-w-0 flex-1">
                  <ActivityRow item={m} onOpen={openItem} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent case discussion">
        {loading ? (
          <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
        ) : discussion.length === 0 ? (
          <EmptyState message="No recent discussion on your cases. Comments teammates post on your matters will appear here." />
        ) : (
          <div className="space-y-0.5">
            {discussion.map((d) => (
              <div key={d.id} className="flex items-start gap-2">
                <MessagesSquare className="mt-3 h-4 w-4 shrink-0 text-slate-300" />
                <div className="min-w-0 flex-1">
                  <ActivityRow item={d} onOpen={openItem} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
