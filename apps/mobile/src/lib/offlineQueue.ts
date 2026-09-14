/**
 * Lightweight offline action queue for attorney actions that must not be lost
 * when the device briefly drops connectivity (accept/decline a lead, send a
 * message). Actions are attempted immediately; on a connectivity failure they
 * are persisted to SecureStore and drained opportunistically (app resume, next
 * successful dashboard load, or an explicit flush).
 *
 * This intentionally avoids a native NetInfo dependency: "unsent" is inferred
 * from the shape of the axios error via `isUnsentRequestError`, which is
 * narrower than `isOfflineError` because replaying a write that may already
 * have been processed accepts a lead or sends a message twice.
 *
 * Three properties this file is responsible for, each of which it previously
 * got wrong:
 *   - Never replay an action that might already have landed.
 *   - Drain in the order the attorney performed the actions.
 *   - Either persist an action or admit that it did not.
 */
import * as SecureStore from 'expo-secure-store'
import { decideLead, sendAttorneyMessage, sendPlaintiffMessage } from './api'
import { isUnsentRequestError } from './networkErrors'

const QUEUE_KEY = 'offline_action_queue_v1'
const MAX_ATTEMPTS = 8

/**
 * Actions older than this are dropped unsent. A decision the attorney made
 * yesterday should not fire into a case that has moved on since — by then the
 * offer may have gone to someone else, and silently accepting it is worse than
 * losing it.
 */
export const MAX_ACTION_AGE_MS = 24 * 60 * 60 * 1000

/**
 * expo-secure-store warns above 2048 bytes per value on Android and can fail
 * outright, so the queue is kept under that with room to spare rather than
 * growing until a write disappears.
 */
const MAX_QUEUE_BYTES = 1800

export type QueuedActionType = 'lead_decision' | 'attorney_message' | 'plaintiff_message'

export type QueuedAction =
  | {
      id: string
      type: 'lead_decision'
      createdAt: number
      attempts: number
      payload: { leadId: string; decision: 'accept' | 'reject'; notes?: string; declineReason?: string }
    }
  | {
      id: string
      type: 'attorney_message'
      createdAt: number
      attempts: number
      payload: { chatRoomId: string; content: string }
    }
  | {
      id: string
      type: 'plaintiff_message'
      createdAt: number
      attempts: number
      payload: { chatRoomId: string; content: string }
    }

type Listener = (queue: QueuedAction[]) => void

const listeners = new Set<Listener>()

function notify(queue: QueuedAction[]) {
  for (const l of listeners) {
    try {
      l(queue)
    } catch {
      /* listener errors must not break the queue */
    }
  }
}

/** Subscribe to queue changes (e.g. to show a "N pending" badge). Returns an unsubscribe fn. */
export function subscribeToQueue(listener: Listener): () => void {
  listeners.add(listener)
  void getQueue().then(listener)
  return () => listeners.delete(listener)
}

export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueuedAction[]) : []
  } catch {
    return []
  }
}

/**
 * UTF-8 width of a string, measured the way the storage layer will see it.
 * `TextEncoder` is not guaranteed on every React Native runtime, and the app
 * ships Spanish and Chinese, where counting characters would badly undercount.
 */
function byteLength(value: string): number {
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4
      i++ // surrogate pair: one code point, already counted
    } else bytes += 3
  }
  return bytes
}

/** Drop the oldest actions until the queue fits the storage budget. */
function trimToBudget(queue: QueuedAction[]): QueuedAction[] {
  let trimmed = queue
  while (trimmed.length > 1 && byteLength(JSON.stringify(trimmed)) > MAX_QUEUE_BYTES) {
    trimmed = trimmed.slice(1)
  }
  return trimmed
}

/**
 * Persist the queue. Returns what was actually stored — which may be shorter
 * than what was handed in — or null if the write failed outright. Callers have
 * to look, because the previous version swallowed both cases and left the UI
 * promising to send something that no longer existed.
 */
async function writeQueue(queue: QueuedAction[]): Promise<QueuedAction[] | null> {
  const trimmed = trimToBudget(queue)
  try {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(trimmed))
  } catch {
    return null
  }
  notify(trimmed)
  return trimmed
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Append an action. False when it could not be stored, trimmed away included. */
async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>): Promise<boolean> {
  const queue = await getQueue()
  const entry = { ...action, id: makeId(), createdAt: Date.now(), attempts: 0 } as QueuedAction
  const persisted = await writeQueue([...queue, entry])
  return persisted !== null && persisted.some((a) => a.id === entry.id)
}

async function executeAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case 'lead_decision':
      await decideLead(action.payload.leadId, action.payload.decision, action.payload.notes, action.payload.declineReason)
      return
    case 'attorney_message':
      await sendAttorneyMessage(action.payload.chatRoomId, action.payload.content)
      return
    case 'plaintiff_message':
      await sendPlaintiffMessage(action.payload.chatRoomId, action.payload.content)
      return
  }
}

/**
 * Run a network action now. If it failed in a way that proves it never reached
 * the server, persist it and resolve as `{ queued: true }` so the UI can show an
 * optimistic "will sync" state. Anything else — including a timeout, which may
 * already have been processed — is raised, because the attorney needs to know
 * the outcome is uncertain rather than have it re-sent for them.
 */
export async function runOrQueue(
  action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>
): Promise<{ queued: boolean }> {
  try {
    await executeAction({ ...action, id: makeId(), createdAt: Date.now(), attempts: 0 } as QueuedAction)
    return { queued: false }
  } catch (err) {
    if (!isUnsentRequestError(err)) throw err
    // "We'll send this when you're back online" is only true if it was written
    // down. When it was not, the original failure is the honest answer.
    if (!(await enqueue(action))) throw err
    return { queued: true }
  }
}

let flushing = false

/** Attempt to drain every queued action. Safe to call repeatedly; no-ops while already flushing. */
export async function flushQueue(): Promise<{ sent: number; remaining: number; expired: number }> {
  if (flushing) {
    const q = await getQueue()
    return { sent: 0, remaining: q.length, expired: 0 }
  }
  flushing = true
  let sent = 0
  try {
    const stored = await getQueue()
    if (stored.length === 0) return { sent: 0, remaining: 0, expired: 0 }

    const now = Date.now()
    const queue = stored.filter((action) => now - action.createdAt < MAX_ACTION_AGE_MS)
    const expired = stored.length - queue.length

    const remaining: QueuedAction[] = []
    for (let i = 0; i < queue.length; i++) {
      const action = queue[i]
      try {
        await executeAction(action)
        sent += 1
      } catch (err) {
        if (isUnsentRequestError(err)) {
          // Still no connection. Keep this one and everything behind it, in the
          // order it was performed: carrying on down the list would deliver a
          // later message before the earlier one it was replying to.
          remaining.push({ ...action, attempts: action.attempts + 1 }, ...queue.slice(i + 1))
          break
        }
        // The server rejected it (a lead already taken, a timeout we will not
        // replay). Drop after a few tries so one bad action cannot wedge the
        // queue behind it forever.
        const attempts = action.attempts + 1
        if (attempts < MAX_ATTEMPTS) {
          remaining.push({ ...action, attempts })
        }
      }
    }

    const persisted = await writeQueue(remaining)
    return { sent, remaining: (persisted ?? remaining).length, expired }
  } finally {
    flushing = false
  }
}
