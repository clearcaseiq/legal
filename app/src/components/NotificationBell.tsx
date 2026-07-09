/**
 * Global notification bell - shows unread message count for attorneys.
 * Clicking opens a dropdown with recent messages.
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { getAttorneyUnreadSummary } from '../lib/api'

interface ChatRoomPreview {
  id: string
  leadId?: string | null
  plaintiff: { id: string; name: string; email?: string } | null
  assessment?: { id: string; claimType?: string }
  lastMessage?: { content: string; senderType: string; createdAt: string }
  unreadCount: number
  awaitingReply?: boolean
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [awaitingReplyCount, setAwaitingReplyCount] = useState(0)
  const [chatRooms, setChatRooms] = useState<ChatRoomPreview[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getAttorneyUnreadSummary()
      setUnreadCount(res?.unreadCount ?? 0)
      setAwaitingReplyCount(res?.awaitingReplyCount ?? 0)
      setChatRooms(Array.isArray(res?.rooms) ? res.rooms : [])
    } catch {
      setUnreadCount(0)
      setAwaitingReplyCount(0)
      setChatRooms([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // poll every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const previewText = (room: ChatRoomPreview) => {
    if (room.lastMessage) {
      const content = room.lastMessage.content
      return content.length > 50 ? `${content.slice(0, 50)}…` : content
    }
    return 'No messages yet'
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) loadData() }}
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
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-brand-600">{unreadCount} new</span>
              )}
              {awaitingReplyCount > 0 && (
                <span className="text-xs font-medium text-amber-600">{awaitingReplyCount} awaiting reply</span>
              )}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500 text-sm">Loading…</div>
            ) : chatRooms.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                No messages yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chatRooms.slice(0, 10).map((room) => (
                  <Link
                    key={room.id}
                    to={room.leadId ? `/attorney-dashboard/lead/${room.leadId}/overview` : '/attorney-dashboard?tab=leads'}
                    onClick={() => setOpen(false)}
                    className="block p-3 hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900 truncate">
                        {room.plaintiff?.name || 'Plaintiff'}
                        {room.assessment?.claimType && (
                          <span className="text-slate-500 font-normal ml-1">
                            ({room.assessment.claimType.replace(/_/g, ' ')})
                          </span>
                        )}
                      </div>
                      {room.unreadCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                          {room.unreadCount}
                        </span>
                      ) : room.awaitingReply ? (
                        <span className="flex h-5 items-center justify-center whitespace-nowrap rounded-full bg-amber-100 px-2 text-[10px] font-semibold text-amber-700">
                          Awaiting reply
                        </span>
                      ) : null}
                    </div>
                    {room.assessment?.id && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Case #{room.assessment.id.slice(-6).toUpperCase()}
                      </div>
                    )}
                    <div className="text-sm text-slate-600 truncate mt-0.5">
                      {previewText(room)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-slate-200">
            <Link
              to="/attorney-dashboard?tab=leads"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all cases
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
