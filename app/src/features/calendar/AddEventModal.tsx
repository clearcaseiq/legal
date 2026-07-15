/**
 * MyCase-style "Add event" modal: title, optional case link, start/end (all-day
 * + repeat), location, description, reminders, and staff/client invites.
 * Handles both create and edit (with delete) of a CalendarEvent.
 */
import { useEffect, useState } from 'react'
import { X, Plus, Trash2, Calendar as CalendarIcon, Loader2, Bell, Users, User, Lock, MapPin } from 'lucide-react'
import LeadPickerModal from '../../components/LeadPickerModal'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getEventInvitees,
  getCalendarLocations,
  type CalendarEventDto,
  type CalendarEventInput,
  type EventInvitees,
  type EventRepeatFreq,
  type EventReminder,
  type ReminderRecipient,
  type ReminderChannel,
} from '../../lib/api'

interface LeadOption {
  id: string
  assessmentId?: string
  status?: string
  assessment?: {
    claimType?: string
    venueCounty?: string
    venueState?: string
    user?: { firstName?: string; lastName?: string }
  }
}

interface AddEventModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  leads: LeadOption[]
  initialDate?: Date | null
  initialLead?: { leadId?: string | null; assessmentId?: string | null; label?: string } | null
  editEvent?: CalendarEventDto | null
}

type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'

interface ReminderRow {
  recipient: ReminderRecipient
  channel: ReminderChannel
  num: number
  unit: ReminderUnit
}

const UNIT_MINUTES: Record<ReminderUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
}
const UNIT_OPTS: { v: ReminderUnit; label: string }[] = [
  { v: 'minutes', label: 'minutes' },
  { v: 'hours', label: 'hours' },
  { v: 'days', label: 'days' },
  { v: 'weeks', label: 'weeks' },
]
const RECIPIENT_OPTS: { v: ReminderRecipient; label: string }[] = [
  { v: 'attorneys', label: 'Attorneys' },
  { v: 'contacts', label: 'Contacts' },
  { v: 'all', label: 'Everyone' },
]
const CHANNEL_OPTS: { v: ReminderChannel; label: string }[] = [
  { v: 'email', label: 'email' },
  { v: 'popup', label: 'pop-up' },
]

/** Convert an offset in minutes into the largest whole unit for display. */
function offsetToRow(offsetMinutes: number): { num: number; unit: ReminderUnit } {
  const units: ReminderUnit[] = ['weeks', 'days', 'hours', 'minutes']
  for (const unit of units) {
    const size = UNIT_MINUTES[unit]
    if (offsetMinutes >= size && offsetMinutes % size === 0) {
      return { num: offsetMinutes / size, unit }
    }
  }
  return { num: Math.max(offsetMinutes, 0), unit: 'minutes' }
}

function rowToReminder(r: ReminderRow): EventReminder {
  return {
    offsetMinutes: Math.max(0, Math.round(r.num)) * UNIT_MINUTES[r.unit],
    recipient: r.recipient,
    channel: r.channel,
  }
}

const REPEAT_OPTS: { v: EventRepeatFreq; label: string }[] = [
  { v: 'daily', label: 'Daily' },
  { v: 'weekly', label: 'Weekly' },
  { v: 'monthly', label: 'Monthly' },
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function dateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function timeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function combine(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr || '00:00'}`)
}
function claimLabel(s?: string) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AddEventModal({
  open,
  onClose,
  onSaved,
  leads,
  initialDate,
  initialLead,
  editEvent,
}: AddEventModalProps) {
  const isEdit = !!editEvent

  const [title, setTitle] = useState('')
  const [linkedCase, setLinkedCase] = useState<{ leadId?: string | null; assessmentId?: string | null; label: string } | null>(null)
  const [notLinked, setNotLinked] = useState(false)
  const [casePickerOpen, setCasePickerOpen] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)

  const [repeats, setRepeats] = useState(false)
  const [repeatFreq, setRepeatFreq] = useState<EventRepeatFreq>('weekly')
  const [repeatUntil, setRepeatUntil] = useState('')

  const [location, setLocation] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [customLocation, setCustomLocation] = useState(false)
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [reminders, setReminders] = useState<ReminderRow[]>([])

  const [invitees, setInvitees] = useState<EventInvitees | null>(null)
  const [clientInvited, setClientInvited] = useState(false)
  const [clientAttend, setClientAttend] = useState(false)
  const [staffState, setStaffState] = useState<Record<string, { share: boolean; attend: boolean }>>({})

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNote, setShowNote] = useState(true)

  // Seed form state whenever the modal opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setShowNote(true)

    if (editEvent) {
      const s = new Date(editEvent.startAt)
      const e = new Date(editEvent.endAt)
      setTitle(editEvent.title)
      setLinkedCase(
        editEvent.assessmentId
          ? { leadId: editEvent.leadId, assessmentId: editEvent.assessmentId, label: 'Linked case' }
          : null,
      )
      setNotLinked(!editEvent.assessmentId)
      setStartDate(dateInput(s))
      setStartTime(timeInput(s))
      setEndDate(dateInput(e))
      setEndTime(timeInput(e))
      setAllDay(editEvent.allDay)
      setRepeats(!!editEvent.repeatFreq)
      setRepeatFreq((editEvent.repeatFreq as EventRepeatFreq) || 'weekly')
      setRepeatUntil(editEvent.repeatUntil ? dateInput(new Date(editEvent.repeatUntil)) : '')
      setLocation(editEvent.location || '')
      setCustomLocation(false)
      setDescription(editEvent.description || '')
      setIsPrivate(!!editEvent.isPrivate)
      setReminders(
        (editEvent.reminders || []).map((r) => ({
          recipient: r.recipient || 'all',
          channel: r.channel || 'email',
          ...offsetToRow(r.offsetMinutes),
        })),
      )
    } else {
      const base = initialDate ? new Date(initialDate) : new Date()
      if (!initialDate || (base.getHours() === 0 && base.getMinutes() === 0)) base.setHours(18, 0, 0, 0)
      const end = new Date(base.getTime() + 60 * 60000)
      setTitle('')
      setLinkedCase(
        initialLead?.assessmentId
          ? { leadId: initialLead.leadId, assessmentId: initialLead.assessmentId, label: initialLead.label || 'Linked case' }
          : null,
      )
      setNotLinked(!initialLead?.assessmentId)
      setStartDate(dateInput(base))
      setStartTime(timeInput(base))
      setEndDate(dateInput(end))
      setEndTime(timeInput(end))
      setAllDay(false)
      setRepeats(false)
      setRepeatFreq('weekly')
      setRepeatUntil('')
      setLocation('')
      setCustomLocation(false)
      setDescription('')
      setIsPrivate(false)
      setReminders([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEvent])

  // Load the firm's saved locations for the picker.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getCalendarLocations()
      .then((res) => {
        if (cancelled) return
        const list = res.locations || []
        setLocations(list)
        // If the current location isn't a saved one, switch to custom entry.
        setLocation((cur) => {
          if (cur && !list.some((l) => l.toLowerCase() === cur.toLowerCase())) {
            setCustomLocation(true)
          }
          return cur
        })
      })
      .catch(() => !cancelled && setLocations([]))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEvent])

  // Load staff + case client whenever the linked case changes.
  const assessmentId = notLinked ? null : linkedCase?.assessmentId || null
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getEventInvitees(assessmentId)
      .then((res) => {
        if (cancelled) return
        setInvitees(res)
        // Pre-check staff shares from an event being edited.
        if (editEvent) {
          const next: Record<string, { share: boolean; attend: boolean }> = {}
          for (const s of res.staff) {
            const match = editEvent.attendees.find(
              (a) => a.kind === 'staff' && (a.firmMemberId === s.firmMemberId || (a.email && a.email === s.email)),
            )
            next[s.firmMemberId] = { share: !!match, attend: !!match?.attend }
          }
          setStaffState(next)
          const clientAtt = editEvent.attendees.find((a) => a.kind === 'client')
          setClientInvited(!!clientAtt)
          setClientAttend(!!clientAtt?.attend)
        }
      })
      .catch(() => !cancelled && setInvitees({ staff: [], client: null }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assessmentId])

  if (!open) return null

  const pickCase = (lead: LeadOption) => {
    const name = [lead.assessment?.user?.firstName, lead.assessment?.user?.lastName].filter(Boolean).join(' ')
    const label = `${claimLabel(lead.assessment?.claimType || 'Case')}${name ? ` — ${name}` : ''}`
    setLinkedCase({ leadId: lead.id, assessmentId: lead.assessmentId || null, label })
    setNotLinked(false)
    setCasePickerOpen(false)
  }

  const addReminder = () =>
    setReminders((prev) => [
      ...prev,
      { recipient: 'attorneys', channel: 'email', num: 1, unit: 'days' },
    ])
  const updateReminder = (idx: number, patch: Partial<ReminderRow>) =>
    setReminders((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  const removeReminder = (idx: number) => setReminders((prev) => prev.filter((_, i) => i !== idx))

  const toggleStaff = (firmMemberId: string, field: 'share' | 'attend', val: boolean) =>
    setStaffState((prev) => {
      const cur = prev[firmMemberId] || { share: false, attend: false }
      const next = { ...cur, [field]: val }
      // Attending implies shared.
      if (field === 'attend' && val) next.share = true
      if (field === 'share' && !val) next.attend = false
      return { ...prev, [firmMemberId]: next }
    })

  const buildAttendees = (): CalendarEventInput['attendees'] => {
    const out: NonNullable<CalendarEventInput['attendees']> = []
    if (!notLinked && clientInvited && invitees?.client) {
      out.push({
        kind: 'client',
        userId: invitees.client.userId,
        email: invitees.client.email,
        name: invitees.client.name,
        attend: clientAttend,
      })
    }
    for (const s of invitees?.staff || []) {
      const st = staffState[s.firmMemberId]
      if (st?.share || st?.attend) {
        out.push({
          kind: 'staff',
          firmMemberId: s.firmMemberId,
          userId: s.userId,
          email: s.email,
          name: s.name,
          attend: !!st.attend,
          share: !!st.share,
        })
      }
    }
    return out
  }

  const save = async () => {
    if (!title.trim()) {
      setError('Please enter an event name.')
      return
    }
    const start = allDay ? combine(startDate, '00:00') : combine(startDate, startTime)
    const end = allDay ? combine(endDate || startDate, '23:59') : combine(endDate, endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Please provide a valid start and end.')
      return
    }
    if (end <= start) {
      setError('End time must be after the start time.')
      return
    }

    const payload: CalendarEventInput = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      assessmentId: notLinked ? null : linkedCase?.assessmentId || null,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay,
      isPrivate,
      repeatFreq: repeats ? repeatFreq : null,
      repeatUntil: repeats && repeatUntil ? combine(repeatUntil, '23:59').toISOString() : null,
      reminders: reminders.map(rowToReminder),
      attendees: buildAttendees(),
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit && editEvent) await updateCalendarEvent(editEvent.eventId, payload)
      else await createCalendarEvent(payload)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not save the event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editEvent) return
    if (!window.confirm('Delete this event? Invited attendees will be notified.')) return
    setDeleting(true)
    setError(null)
    try {
      await deleteCalendarEvent(editEvent.eventId)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not delete the event.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit event' : 'Add event'}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_18rem]">
          {/* Left: event fields */}
          <div className="space-y-4">
            {/* Case link */}
            <div>
              <label className="block text-xs font-semibold text-slate-600">Case or Lead</label>
              {notLinked ? (
                <div className="mt-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Not linked to a case
                </div>
              ) : linkedCase ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="truncate text-sm font-medium text-slate-800">{linkedCase.label}</span>
                  <button
                    type="button"
                    onClick={() => setCasePickerOpen(true)}
                    className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCasePickerOpen(true)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-500 hover:border-slate-300"
                >
                  Select a case or lead…
                </button>
              )}
              <label className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={notLinked}
                  onChange={(e) => {
                    setNotLinked(e.target.checked)
                    if (e.target.checked) setClientInvited(false)
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                This event is not linked to a case
              </label>
            </div>

            {/* Event name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600">Event name</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deposition, Court hearing, Client meeting"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Start / End */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="w-12 text-xs font-semibold text-slate-600">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                )}
                <label className="ml-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  All day
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="w-12 text-xs font-semibold text-slate-600">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                )}
              </div>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={repeats}
                  onChange={(e) => setRepeats(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                This event repeats
              </label>
              {repeats && (
                <div className="flex flex-wrap items-center gap-2 pl-1">
                  <select
                    value={repeatFreq}
                    onChange={(e) => setRepeatFreq(e.target.value as EventRepeatFreq)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {REPEAT_OPTS.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-500">until</span>
                  <input
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <span className="text-xs text-slate-400">(optional)</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <MapPin className="h-3.5 w-3.5" /> Location
              </label>
              {customLocation ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter an address, room, or meeting link"
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  />
                  {locations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomLocation(false)
                        setLocation('')
                      }}
                      className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-3">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select location</option>
                    {locations.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomLocation(true)
                      setLocation('')
                    }}
                    className="shrink-0 whitespace-nowrap text-sm font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Add location
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                This description will be viewable by anyone invited to this event.
              </p>
            </div>

            {/* Reminders */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Bell className="h-3.5 w-3.5" /> Reminders
              </label>
              <div className="mt-1.5 space-y-2">
                {reminders.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                    <select
                      value={r.recipient}
                      onChange={(e) => updateReminder(i, { recipient: e.target.value as ReminderRecipient })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      aria-label="Reminder recipient"
                    >
                      {RECIPIENT_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={r.channel}
                      onChange={(e) => updateReminder(i, { channel: e.target.value as ReminderChannel })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      aria-label="Reminder channel"
                    >
                      {CHANNEL_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={r.num}
                      onChange={(e) => updateReminder(i, { num: Math.max(0, Number(e.target.value)) })}
                      className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      aria-label="Reminder amount"
                    />
                    <select
                      value={r.unit}
                      onChange={(e) => updateReminder(i, { unit: e.target.value as ReminderUnit })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                      aria-label="Reminder unit"
                    >
                      {UNIT_OPTS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-400">before</span>
                    <button
                      type="button"
                      onClick={() => removeReminder(i)}
                      className="ml-auto rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove reminder"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addReminder}
                  disabled={reminders.length >= 6}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add a reminder
                </button>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  You can only edit reminders that you created. Reminders assigned to you by another firm
                  user will need to be edited by the creator.
                </p>
              </div>
            </div>

            {/* Private */}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              Mark this event as private
            </label>
          </div>

          {/* Right: invitees + note */}
          <div className="space-y-4">
            {showNote && (
              <div className="relative rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                <button
                  onClick={() => setShowNote(false)}
                  className="absolute right-1.5 top-1.5 text-sky-400 hover:text-sky-600"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="pr-4">
                  When you invite clients and staff, they receive an email with the event details and a link to
                  view it.
                </p>
              </div>
            )}

            {/* Client contact */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <User className="h-3.5 w-3.5" /> Contacts &amp; Leads
              </p>
              {notLinked ? (
                <p className="text-xs text-slate-400">Link a case to invite the client.</p>
              ) : invitees?.client ? (
                <div className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">{invitees.client.name}</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={clientInvited}
                        onChange={(e) => setClientInvited(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      Invite
                    </label>
                  </div>
                  {clientInvited && (
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={clientAttend}
                        onChange={(e) => setClientAttend(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      Attending
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No client contact on this case.</p>
              )}
            </div>

            {/* Staff */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Users className="h-3.5 w-3.5" /> Staff
                </p>
                <div className="flex gap-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <span>Share</span>
                  <span>Attend</span>
                </div>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {(invitees?.staff || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No firm staff found.</p>
                ) : (
                  invitees!.staff.map((s) => {
                    const st = staffState[s.firmMemberId] || { share: false, attend: false }
                    return (
                      <div key={s.firmMemberId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                          <p className="truncate text-[11px] text-slate-400">{s.roleLabel}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 pr-1">
                          <input
                            type="checkbox"
                            checked={st.share}
                            onChange={(e) => toggleStaff(s.firmMemberId, 'share', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            aria-label={`Share with ${s.name}`}
                          />
                          <input
                            type="checkbox"
                            checked={st.attend}
                            onChange={(e) => toggleStaff(s.firmMemberId, 'attend', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            aria-label={`${s.name} attends`}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="min-w-0">
            {error && <p className="truncate text-sm text-rose-600">{error}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting || saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || deleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </div>
      </div>

      <LeadPickerModal
        isOpen={casePickerOpen}
        onClose={() => setCasePickerOpen(false)}
        leads={leads}
        title="Select a case or lead"
        onSelect={pickCase}
        emptyMessage="No cases available."
      />
    </div>
  )
}
