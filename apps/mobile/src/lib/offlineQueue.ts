/**
 * Lightweight offline action queue for attorney actions that must not be lost
 * when the device briefly drops connectivity (accept/decline a lead, send a
 * message). Actions are attempted immediately; on a connectivity failure they
 * are persisted to SecureStore and drained opportunistically (app resume, next
 * successful dashboard load, or an explicit flush).
 *
 * This intentionally avoids a native NetInfo dependency: "offline" is inferred
 * from the shape of the axios error (no server response) via `isOfflineError`.
 */
import * as SecureStore from 'expo-secure-store'
import { decideLead, sendAttorneyMessage, sendPlaintiffMessage, isOfflineError } from './api'

const QUEUE_KEY = 'offline_action_queue_v1'
const MAX_ATTEMPTS = 8

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

async function writeQueue(queue: QueuedAction[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    /* best-effort persistence */
  }
  notify(queue)
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>): Promise<void> {
  const queue = await getQueue()
  queue.push({ ...action, id: makeId(), createdAt: Date.now(), attempts: 0 } as QueuedAction)
  await writeQueue(queue)
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
 * Run a network action now. If it fails purely because the device is offline,
 * persist it to the queue and resolve as `{ queued: true }` so the UI can show
 * an optimistic "will sync" state instead of a hard error.
 */
export async function runOrQueue(
  action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>
): Promise<{ queued: boolean }> {
  try {
    await executeAction({ ...action, id: makeId(), createdAt: Date.now(), attempts: 0 } as QueuedAction)
    return { queued: false }
  } catch (err) {
    if (isOfflineError(err)) {
      await enqueue(action)
      return { queued: true }
    }
    throw err
  }
}

let flushing = false

/** Attempt to drain every queued action. Safe to call repeatedly; no-ops while already flushing. */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  if (flushing) {
    const q = await getQueue()
    return { sent: 0, remaining: q.length }
  }
  flushing = true
  let sent = 0
  try {
    let queue = await getQueue()
    if (queue.length === 0) return { sent: 0, remaining: 0 }

    const remaining: QueuedAction[] = []
    for (const action of queue) {
      try {
        await executeAction(action)
        sent += 1
      } catch (err) {
        if (isOfflineError(err)) {
          // Still offline: keep this and all subsequent actions in order.
          remaining.push({ ...action, attempts: action.attempts + 1 })
        } else {
          // Server rejected the action (e.g. lead already taken). Drop after a
          // few attempts so a permanently-failing action can't wedge the queue.
          const attempts = action.attempts + 1
          if (attempts < MAX_ATTEMPTS) {
            remaining.push({ ...action, attempts })
          }
        }
      }
    }
    queue = remaining
    await writeQueue(queue)
    return { sent, remaining: queue.length }
  } finally {
    flushing = false
  }
}
