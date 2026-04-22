/**
 * Case Command Modals - Mission control workflows for Call, Message, Schedule Consult.
 * Each modal connects attorney → plaintiff → system with clear backend actions.
 */

import { useState } from 'react'
import { Phone, MessageSquare, Calendar, X } from 'lucide-react'

const MESSAGE_TEMPLATES = [
  "Hi, I'm reviewing your case and would like to ask a few questions.",
  "I've received your intake. We'll review it and get back to you within 24 hours.",
  "Could you please upload your medical records and police report when you have a moment?",
  "Your consultation has been scheduled. Please confirm your availability."
]

export function CallPlaintiffModal({
  open,
  onClose,
  plaintiffName,
  phone,
  preferredContact,
  onLogOutcome,
  loading
}: {
  open: boolean
  onClose: () => void
  plaintiffName: string
  phone: string
  preferredContact: string
  onLogOutcome: (outcome: string, notes?: string) => Promise<void>
  loading?: boolean
}) {
  const [showOutcome, setShowOutcome] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')

  const outcomes = [
    'Reached plaintiff',
    'Left voicemail',
    'No answer',
    'Wrong number',
    'Requested documents',
    'Consult scheduled'
  ]

  const handleStartCall = () => {
    if (phone) window.location.href = `tel:${phone.replace(/\D/g, '')}`
  }

  const handleLogOutcome = async () => {
    if (!outcome) return
    await onLogOutcome(outcome, notes || undefined)
    setOutcome('')
    setNotes('')
    setShowOutcome(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Plaintiff Contact</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs text-gray-500">Name</div>
            <div className="font-medium text-gray-900">{plaintiffName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Phone</div>
            <div className="font-medium text-gray-900">{phone || 'Not provided'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Preferred contact</div>
            <div className="font-medium text-gray-900">{preferredContact || 'Phone'}</div>
          </div>

          {!showOutcome ? (
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleStartCall}
                disabled={!phone}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="h-4 w-4" />
                Start Call
              </button>
              <button
                onClick={() => setShowOutcome(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50"
              >
                Log Call Outcome
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Select outcome…</option>
                  {outcomes.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Add any notes…"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLogOutcome}
                  disabled={!outcome || loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Save Outcome'}
                </button>
                <button
                  onClick={() => setShowOutcome(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MessagePlaintiffModal({
  open,
  onClose,
  plaintiffName,
  contactHistory,
  onSendMessage,
  loading
}: {
  open: boolean
  onClose: () => void
  plaintiffName: string
  contactHistory: any[]
  onSendMessage: (message: string) => Promise<void>
  loading?: boolean
}) {
  const [message, setMessage] = useState('')
  const [attachDocument, setAttachDocument] = useState(false)
  const [requestDocuments, setRequestDocuments] = useState(false)

  const [template, setTemplate] = useState('')

  const handleSend = async () => {
    let body = message
    if (requestDocuments) body = (body ? body + '\n\n' : '') + 'Please upload the requested documents when you have them.'
    if (!body.trim()) return
    await onSendMessage(body)
    setMessage('')
    setTemplate('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Message Plaintiff</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="text-sm text-gray-600">To: <strong>{plaintiffName}</strong></div>

          {contactHistory.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 max-h-32 overflow-y-auto">
              <div className="text-xs font-medium text-gray-500 mb-2">Recent contact</div>
              {contactHistory.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="text-xs text-gray-700 mb-1">
                  {c.contactType} — {c.notes || 'No notes'}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quick templates</label>
            <select
              value={template}
              onChange={(e) => {
                const v = e.target.value
                setTemplate(v)
                if (v !== '') setMessage(MESSAGE_TEMPLATES[Number(v)])
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Choose a template…</option>
              {MESSAGE_TEMPLATES.map((t, i) => (
                <option key={i} value={String(i)}>{t.slice(0, 50)}…</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              placeholder="Type your message…"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={attachDocument}
                onChange={(e) => setAttachDocument(e.target.checked)}
                className="rounded border-gray-300"
              />
              Attach document
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={requestDocuments}
                onChange={(e) => setRequestDocuments(e.target.checked)}
                className="rounded border-gray-300"
              />
              Request documents
            </label>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageSquare className="h-4 w-4" />
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScheduleConsultModal({
  open,
  onClose,
  plaintiffName,
  onSchedule,
  loading
}: {
  open: boolean
  onClose: () => void
  plaintiffName: string
  onSchedule: (scheduledAt: string, meetingType: 'phone' | 'zoom' | 'in-person') => Promise<void>
  loading?: boolean
}) {
  const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const [date, setDate] = useState(defaultDate.toISOString().slice(0, 10))
  const [time, setTime] = useState('10:00')
  const [meetingType, setMeetingType] = useState<'phone' | 'zoom' | 'in-person'>('phone')

  const handleSchedule = async () => {
    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    await onSchedule(scheduledAt, meetingType)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Consultation</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">With: <strong>{plaintiffName}</strong></div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Meeting type</label>
            <div className="space-y-2">
              {(['phone', 'zoom', 'in-person'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="meetingType"
                    checked={meetingType === t}
                    onChange={() => setMeetingType(t)}
                    className="text-brand-600"
                  />
                  {t === 'phone' ? 'Phone' : t === 'zoom' ? 'Zoom' : 'In-person'}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            {loading ? 'Scheduling…' : 'Schedule Consultation'}
          </button>
        </div>
      </div>
    </div>
  )
}
