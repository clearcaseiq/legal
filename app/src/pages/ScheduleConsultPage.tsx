/**
 * Schedule consultation page - dedicated screen (not post-acceptance).
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Video, Check, Loader2 } from 'lucide-react'
import { getLead, scheduleConsultation, getAttorneyZoomStatus, getAttorneyZoomConnectUrl, type AttorneyZoomStatus } from '../lib/api'
import { invalidateAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'
import { BackButton } from '../features/shared/ui'

const MEETING_TYPES = [
  { id: 'phone', label: 'Phone call' },
  { id: 'video', label: 'Zoom' },
  { id: 'in_person', label: 'In person' }
]

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
]

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function ScheduleConsultPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateFromUrl = searchParams.get('date')
  // When rescheduling an existing consult, the caller passes the current time /
  // meeting type so we prefill them instead of silently resetting to defaults.
  const timeFromUrl = searchParams.get('time')
  const typeFromUrl = searchParams.get('type')
  const isReschedule = !!(timeFromUrl || typeFromUrl)
  // Where "Back"/"Cancel"/success returns to — the caller passes ?returnTo=
  // (e.g. Active Cases). Must be an internal path; falls back to the dashboard.
  const returnToRaw = searchParams.get('returnTo')
  const returnTo = returnToRaw && returnToRaw.startsWith('/') ? returnToRaw : '/attorney-dashboard'
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use LOCAL calendar dates (not toISOString, which is UTC and shifts the day
  // near midnight). `todayStr` is the earliest selectable date so the attorney can
  // book same-day (CP-305) and can move a reschedule earlier than its original
  // date (CP-339); it just can't be pushed into the past.
  const pad = (n: number) => String(n).padStart(2, '0')
  const toLocalYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const now = new Date()
  const todayStr = toLocalYmd(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const defaultDate = dateFromUrl || toLocalYmd(tomorrow)

  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(timeFromUrl && TIME_SLOTS.includes(timeFromUrl) ? timeFromUrl : '2:00 PM')
  const [meetingType, setMeetingType] = useState(
    typeFromUrl && MEETING_TYPES.some((t) => t.id === typeFromUrl) ? typeFromUrl : 'phone',
  )
  const [notes, setNotes] = useState('')
  const [zoomStatus, setZoomStatus] = useState<AttorneyZoomStatus | null>(null)
  const [zoomConnecting, setZoomConnecting] = useState(false)

  useEffect(() => {
    if (!leadId) {
      setError('No case selected')
      setLoading(false)
      return
    }
    getLead(leadId)
      .then(setLead)
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || 'Failed to load case'))
      .finally(() => setLoading(false))
  }, [leadId])

  useEffect(() => {
    getAttorneyZoomStatus()
      .then(setZoomStatus)
      .catch(() => setZoomStatus(null))
  }, [])

  const refreshZoomStatus = useCallback(async () => {
    try {
      const status = await getAttorneyZoomStatus()
      setZoomStatus(status)
      return status
    } catch {
      return null
    }
  }, [])

  // Connect Zoom in a popup so the half-filled consult form isn't lost. The
  // /oauth/zoom/complete bounce page posts the result back here; we also poll on
  // popup close as a fallback in case the message is missed.
  const connectZoom = useCallback(async () => {
    if (zoomConnecting) return
    setZoomConnecting(true)
    setError(null)
    try {
      const { authorizeUrl } = await getAttorneyZoomConnectUrl()
      const w = 520
      const h = 660
      const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2)
      const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2)
      const popup = window.open(authorizeUrl, 'zoom-oauth', `width=${w},height=${h},left=${left},top=${top}`)
      if (!popup) {
        setError('Your browser blocked the Zoom popup. Allow popups for this site, then click "Connect Zoom" again.')
        setZoomConnecting(false)
        return
      }

      let settled = false
      const finish = async (ok: boolean, message?: string) => {
        if (settled) return
        settled = true
        window.removeEventListener('message', onMessage)
        window.clearInterval(poll)
        if (ok) {
          await refreshZoomStatus()
        } else if (message) {
          setError(message)
        } else {
          // Popup closed without confirmation — re-check in case it did connect.
          await refreshZoomStatus()
        }
        setZoomConnecting(false)
      }

      const onMessage = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return
        if (!e.data || e.data.type !== 'zoom_oauth') return
        void finish(e.data.status === 'success', e.data.status === 'success' ? undefined : (e.data.error || 'Zoom connection failed.'))
      }
      window.addEventListener('message', onMessage)

      const poll = window.setInterval(() => {
        if (popup.closed) void finish(false)
      }, 1000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to start Zoom connection.')
      setZoomConnecting(false)
    }
  }, [zoomConnecting, refreshZoomStatus])

  const handleSelectMeetingType = (id: string) => {
    setMeetingType(id)
    // First-time Zoom selection: pop the connect flow automatically.
    if (id === 'video' && zoomStatus?.configured && !zoomStatus?.connected && !zoomConnecting) {
      void connectZoom()
    }
  }

  const zoomNeedsConnect = meetingType === 'video' && !!zoomStatus?.configured && !zoomStatus?.connected

  const handleSubmit = async () => {
    if (!leadId) return
    if (zoomNeedsConnect) {
      setError('Connect your Zoom account to schedule a Zoom consultation.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await scheduleConsultation(leadId, {
        date,
        time,
        meetingType,
        notes: notes.trim() || undefined
      })
      invalidateAttorneyDashboardSummary()
      navigate(returnTo)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to schedule consultation')
    } finally {
      setSaving(false)
    }
  }

  const caseLabel = lead
    ? `${claimLabel(lead.assessment?.claimType || 'Case')} — ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}`
    : ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
        <BackButton onClick={() => navigate(returnTo)} label="Back" className="mt-4" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <BackButton onClick={() => navigate(returnTo)} label="Back" className="mb-6" />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{isReschedule ? 'Reschedule consultation' : 'Schedule consultation'}</h1>
          <p className="text-sm text-gray-500 mt-1">{caseLabel}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayStr}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meeting type</label>
              <div className="flex flex-wrap gap-4">
                {MEETING_TYPES.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="meetingType"
                      value={t.id}
                      checked={meetingType === t.id}
                      onChange={() => handleSelectMeetingType(t.id)}
                      className="text-brand-600"
                    />
                    <span className="text-sm text-gray-800">{t.label}</span>
                  </label>
                ))}
              </div>

              {meetingType === 'video' && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {!zoomStatus ? (
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking your Zoom connection…
                    </p>
                  ) : !zoomStatus.configured ? (
                    <p className="text-sm text-amber-700">
                      Zoom isn't enabled on this server yet — a Google Meet / Teams link will be created instead.
                    </p>
                  ) : zoomStatus.connected ? (
                    <p className="flex items-center gap-2 text-sm text-emerald-700">
                      <Check className="h-4 w-4" />
                      Zoom connected{zoomStatus.email ? ` as ${zoomStatus.email}` : ''}. A Zoom meeting link will be created automatically.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-gray-600">
                        Connect your Zoom account once — we'll create the meeting link for every Zoom consult after that.
                      </p>
                      <button
                        type="button"
                        onClick={() => void connectZoom()}
                        disabled={zoomConnecting}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2D8CFF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2681f2] disabled:opacity-60"
                      >
                        {zoomConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Waiting for Zoom…
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4" /> Connect Zoom
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Call plaintiff to confirm injuries before consult"
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => navigate(returnTo)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || zoomNeedsConnect}
              title={zoomNeedsConnect ? 'Connect your Zoom account first' : undefined}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : isReschedule ? 'Save new time' : 'Schedule consultation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
