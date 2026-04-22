/**
 * Schedule Consult Modal - Full appointment scheduling workflow.
 * Single case only (bulk scheduling not practical per spec).
 */

import { useState } from 'react'
import { X } from 'lucide-react'

const MEETING_TYPES = [
  { id: 'phone', label: 'Phone call' },
  { id: 'video', label: 'Zoom' },
  { id: 'in_person', label: 'In person' }
] as const

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
]

interface ScheduleConsultModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: { date: string; time: string; meetingType: string; notes?: string }) => Promise<void>
  leadId: string
  loading?: boolean
}

export default function ScheduleConsultModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}: ScheduleConsultModalProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().slice(0, 10)

  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('2:00 PM')
  const [meetingType, setMeetingType] = useState<string>('phone')
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    await onSubmit({ date, time, meetingType, notes: notes.trim() || undefined })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-600/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Schedule Consultation</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select date:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={defaultDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select time:</label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {TIME_SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting type:</label>
            <div className="flex flex-wrap gap-2">
              {MEETING_TYPES.map(t => (
                <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="meetingType"
                    value={t.id}
                    checked={meetingType === t.id}
                    onChange={() => setMeetingType(t.id)}
                    className="text-brand-600"
                  />
                  <span className="text-sm text-gray-800">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional):</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Call plaintiff to confirm injuries before consult"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Scheduling…' : 'Schedule Consultation'}
          </button>
        </div>
      </div>
    </div>
  )
}
