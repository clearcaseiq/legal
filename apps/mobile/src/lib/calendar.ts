/** Group attorney appointment events by local calendar day for SectionList. */

export type AttorneyCalendarEvent = {
  id: string
  leadId?: string
  scheduledAt: string
  type?: string
  duration?: number
  status?: string
  assessmentId?: string | null
  notes?: string | null
  meetingUrl?: string | null
  location?: string | null
  phoneNumber?: string | null
  plaintiffName?: string
  claimType?: string
}

export type DaySection = { title: string; dayKey: string; data: AttorneyCalendarEvent[] }

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSectionTitle(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function groupEventsByDay(events: AttorneyCalendarEvent[]): DaySection[] {
  const map = new Map<string, AttorneyCalendarEvent[]>()
  for (const ev of events) {
    const t = new Date(ev.scheduledAt)
    if (Number.isNaN(t.getTime())) continue
    const key = localDayKey(t)
    const list = map.get(key) || []
    list.push(ev)
    map.set(key, list)
  }
  const keys = [...map.keys()].sort()
  return keys.map((dayKey) => {
    const [y, m, d] = dayKey.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const data = (map.get(dayKey) || []).sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    return { title: formatSectionTitle(date), dayKey, data }
  })
}

export function monthBounds(year: number, monthIndex: number): { from: Date; to: Date } {
  const from = new Date(year, monthIndex, 1)
  const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
  return { from, to }
}

export function formatMeetingType(type?: string): string {
  const t = (type || '').toLowerCase()
  if (t === 'phone') return 'Phone'
  if (t === 'video') return 'Video'
  if (t === 'in_person') return 'In person'
  return type || 'Meeting'
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
