/**
 * Global notification bell for plaintiffs - shows unread message count from
 * attorneys and, on click, a per-case breakdown that links into the conversation.
 * Mirrors the attorney NotificationBell.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { getPlaintiffMessageSummary } from '../lib/api'
import { formatSpecialty } from '../lib/constants'

interface RoomPreview {
  id: string
  assessmentId?: string | null
  attorney: { id: string; name: string } | null
  assessment?: { id: string; claimType?: string; venueState?: string } | null
  lastMessage?: { content: string; senderType: string; createdAt: string } | null
  unreadCount: number
}

export default function PlaintiffNotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [rooms, setRooms] = useState<RoomPreview[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getPlaintiffMessageSummary()
      setUnreadCount(res?.unreadCount ?? 0)
      setRooms(Array.isArray(res?.rooms) ? res.rooms : [])
    } catch {
      setUnreadCount(0)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const previewText = (room: RoomPreview) => {
    if (room.lastMessage) {
      const content = room.lastMessage.content
      return content.length > 50 ? `${content.slice(0, 50)}…` : content
    }
    return 'No messages yet'
  }

  const openRoom = (room: RoomPreview) => {
    setOpen(false)
    navigate('/messaging', {
      state: { attorneyId: room.attorney?.id, assessmentId: room.assessment?.id ?? room.assessmentId },
    })
  }

  const caseRef = (room: RoomPreview) => {
    const id = room.assessment?.id ?? room.assessmentId
    return id ? `Case #${id.slice(-6).toUpperCase()}` : 'Case'
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) void loadData() }}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
        title="Messages"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 max-h-96 overflow-hidden bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-600" />
              Messages
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-brand-600">{unreadCount} new</span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500 text-sm">Loading…</div>
            ) : rooms.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No messages yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rooms.slice(0, 10).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => openRoom(room)}
                    className="block w-full p-3 hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900 truncate">
                        {room.attorney?.name || 'Your attorney'}
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {caseRef(room)}
                      {room.assessment?.claimType && ` · ${formatSpecialty(room.assessment.claimType)}`}
                    </div>
                    <div className="text-sm text-slate-600 truncate mt-0.5">
                      {previewText(room)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-slate-200">
            <button
              onClick={() => { setOpen(false); navigate('/messaging') }}
              className="block w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all messages
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
