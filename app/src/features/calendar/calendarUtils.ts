/**
 * Shared types + date/layout helpers for the Google-Calendar-style attorney
 * calendar (day / week / month views).
 */

export type CalKind = 'consult' | 'task'

export interface ConsultInfo {
  type?: string | null
  duration?: number | null
  status?: string | null
  claimType?: string | null
  notes?: string | null
  meetingUrl?: string | null
  hostMeetingUrl?: string | null
  location?: string | null
  phoneNumber?: string | null
  /** Public "Calendly-style" booking metadata. */
  eventTypeName?: string | null
  bookerEmail?: string | null
  manageToken?: string | null
}

export interface CalItem {
  kind: CalKind
  id: string
  leadId?: string | null
  date: Date
  /** End time for timed (consult) items. */
  end?: Date
  title: string
  hasTime: boolean
  /** For consults: 'case' (lead-linked) or 'booking' (public booking). */
  source?: 'case' | 'booking'
  consult?: ConsultInfo
}

export type CalView = 'day' | 'week' | 'month' | 'list'

/** How many days the agenda (list) view spans from its anchor. */
export const LIST_SPAN_DAYS = 30

export const HOUR_HEIGHT = 48
export const DAY_MINUTES = 24 * 60

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const dateKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

/** Sunday-based start of the week containing d. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -d.getDay())

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

export const timeLabel = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export const hourLabel = (h: number) => {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

export const claimLabel = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—'

/** Visible date range for a view, used to fetch consults from the API. */
export function rangeForView(view: CalView, anchor: Date): { from: Date; to: Date } {
  if (view === 'day') {
    return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) }
  }
  if (view === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: addDays(from, 7) }
  }
  if (view === 'list') {
    const from = startOfDay(anchor)
    return { from, to: addDays(from, LIST_SPAN_DAYS) }
  }
  // month grid can show up to 6 weeks; pad generously.
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return { from: gridStart, to: addDays(gridStart, 42) }
}

export interface PositionedEvent {
  item: CalItem
  top: number
  height: number
  leftPct: number
  widthPct: number
}

interface LayoutNode {
  item: CalItem
  start: number
  end: number
  col: number
  cols: number
}

/**
 * Position a day's timed events into non-overlapping columns (Google-style):
 * events that overlap in time share the width of their cluster.
 */
export function layoutDayEvents(items: CalItem[]): PositionedEvent[] {
  const timed: LayoutNode[] = items
    .filter((i) => i.hasTime)
    .map((item) => {
      const start = minutesOfDay(item.date)
      const endMin = item.end ? minutesOfDay(item.end) : start + (item.consult?.duration || 30)
      return { item, start, end: Math.max(endMin, start + 15), col: 0, cols: 1 }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  let group: LayoutNode[] = []
  let groupMaxEnd = -1

  const flush = () => {
    if (group.length === 0) return
    const colEnds: number[] = []
    for (const node of group) {
      let placed = false
      for (let c = 0; c < colEnds.length; c += 1) {
        if (node.start >= colEnds[c]) {
          node.col = c
          colEnds[c] = node.end
          placed = true
          break
        }
      }
      if (!placed) {
        node.col = colEnds.length
        colEnds.push(node.end)
      }
    }
    const nCols = colEnds.length
    for (const node of group) node.cols = nCols
    group = []
    groupMaxEnd = -1
  }

  for (const node of timed) {
    if (groupMaxEnd !== -1 && node.start >= groupMaxEnd) flush()
    group.push(node)
    groupMaxEnd = Math.max(groupMaxEnd, node.end)
  }
  flush()

  return timed.map((node) => {
    const top = (node.start / 60) * HOUR_HEIGHT
    const height = Math.max(((node.end - node.start) / 60) * HOUR_HEIGHT, 22)
    const widthPct = 100 / node.cols
    return {
      item: node.item,
      top,
      height,
      leftPct: node.col * widthPct,
      widthPct,
    }
  })
}
