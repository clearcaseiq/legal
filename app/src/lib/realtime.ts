/**
 * Shared socket.io connection to the API's `/v1/realtime` endpoint.
 *
 * One socket per tab, opened lazily by the first subscriber and authenticated
 * with the stored JWT. WebSocket-only: the long-polling fallback would need
 * sticky sessions at the load balancer, and every supported browser has
 * WebSockets anyway.
 *
 * Pushes are refresh hints. Anything that matters is re-read from the REST API,
 * and subscribers also refetch on reconnect, so an event missed while the
 * socket was down is caught up rather than lost.
 */
import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getApiOrigin } from './runtimeEnv'

const REALTIME_PATH = '/v1/realtime'

export type LeadClaimedEvent = {
  assessmentId: string
  leadId: string | null
}

export type LeadNewEvent = {
  assessmentId: string
  leadId: string | null
  introductionId: string | null
}

type RealtimeEvents = {
  'lead:claimed': LeadClaimedEvent
  'lead:new': LeadNewEvent
}

let socket: Socket | null = null
let socketToken: string | null = null

function readToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('auth_token')
  return token && token.split('.').length === 3 ? token : null
}

/**
 * In `next dev` the REST API is reached through a Next rewrite, which does not
 * carry WebSocket upgrades, so the socket goes straight to the API port.
 */
function realtimeOrigin(): string {
  if (process.env.NODE_ENV === 'development') {
    const explicit = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '')
    if (explicit) return explicit
    return `${window.location.protocol}//${window.location.hostname}:4000`
  }
  return getApiOrigin() || window.location.origin
}

function getSocket(): Socket | null {
  const token = readToken()
  if (!token) {
    socket?.disconnect()
    socket = null
    socketToken = null
    return null
  }
  if (socket && socketToken === token) return socket
  socket?.disconnect()
  socketToken = token
  socket = io(realtimeOrigin(), {
    path: REALTIME_PATH,
    transports: ['websocket'],
    auth: (cb) => cb({ token: readToken() }),
    reconnectionDelayMax: 30_000,
  })
  return socket
}

/**
 * Subscribe to a realtime event for the lifetime of the component.
 * `onReconnect` fires after the socket comes back from a drop, so callers can
 * refetch whatever they may have missed.
 */
export function useRealtimeEvent<E extends keyof RealtimeEvents>(
  event: E,
  handler: (payload: RealtimeEvents[E]) => void,
  onReconnect?: () => void,
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const reconnectRef = useRef(onReconnect)
  reconnectRef.current = onReconnect

  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const listener = (payload: RealtimeEvents[E]) => handlerRef.current(payload)
    let connectedOnce = s.connected
    const onConnect = () => {
      if (connectedOnce) reconnectRef.current?.()
      connectedOnce = true
    }
    s.on(event as string, listener)
    s.on('connect', onConnect)
    return () => {
      s.off(event as string, listener)
      s.off('connect', onConnect)
    }
  }, [event])
}
