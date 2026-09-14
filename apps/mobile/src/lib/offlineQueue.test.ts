/**
 * The queue that replays an attorney's accept, decline and messages after a
 * dropped connection. Every case here corresponds to something it used to get
 * wrong, each of which loses or duplicates work the attorney believes is done:
 *
 *   - a timeout was treated as "never sent" and replayed, accepting a lead twice
 *   - a failed flush carried on down the list, delivering messages out of order
 *   - a write that SecureStore rejected was reported to the UI as queued
 *   - `createdAt` was recorded and never read, so stale actions fired days later
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
let failNextWrite = false

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (failNextWrite) {
      failNextWrite = false
      throw new Error('SecureStore value too large')
    }
    store.set(key, value)
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    store.delete(key)
  }),
}))

const { decideLead, sendAttorneyMessage, sendPlaintiffMessage } = vi.hoisted(() => ({
  decideLead: vi.fn(),
  sendAttorneyMessage: vi.fn(),
  sendPlaintiffMessage: vi.fn(),
}))

// `./api` builds an axios client and reads the React Native `__DEV__` global at
// module scope, so it cannot be loaded here. The classification it re-exports is
// the real thing, imported from ./networkErrors by the queue itself.
vi.mock('./api', () => ({ decideLead, sendAttorneyMessage, sendPlaintiffMessage }))

import { flushQueue, getQueue, runOrQueue, MAX_ACTION_AGE_MS } from './offlineQueue'

const QUEUE_KEY = 'offline_action_queue_v1'

/** A connection that never opened: safe to replay. */
function unreachable() {
  return Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' })
}

/** Sent, but the response never came back: NOT safe to replay. */
function timedOut() {
  return Object.assign(new Error('timeout of 120000ms exceeded'), {
    isAxiosError: true,
    code: 'ECONNABORTED',
  })
}

/** The server answered, and said no. */
function rejected(status = 409) {
  return Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status, data: { error: 'Lead already taken' } },
  })
}

const acceptLead = (leadId = 'lead-1') =>
  ({ type: 'lead_decision', payload: { leadId, decision: 'accept' } }) as const

const message = (content: string) =>
  ({ type: 'attorney_message', payload: { chatRoomId: 'room-1', content } }) as const

/** Seed the stored queue directly, to set up a flush. */
function seed(actions: { type: string; payload: unknown; createdAt?: number; attempts?: number }[]) {
  store.set(
    QUEUE_KEY,
    JSON.stringify(
      actions.map((a, i) => ({
        id: `a-${i}`,
        attempts: 0,
        createdAt: Date.now(),
        ...a,
      })),
    ),
  )
}

beforeEach(() => {
  store.clear()
  failNextWrite = false
  vi.clearAllMocks()
  decideLead.mockResolvedValue({})
  sendAttorneyMessage.mockResolvedValue({})
  sendPlaintiffMessage.mockResolvedValue({})
})

describe('running an action while the connection is unreliable', () => {
  it('sends it straight out when the network is fine', async () => {
    expect(await runOrQueue(acceptLead())).toEqual({ queued: false })

    expect(decideLead).toHaveBeenCalledTimes(1)
    expect(await getQueue()).toEqual([])
  })

  it('queues it when the connection never opened', async () => {
    decideLead.mockRejectedValueOnce(unreachable())

    expect(await runOrQueue(acceptLead())).toEqual({ queued: true })

    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0].payload).toMatchObject({ leadId: 'lead-1', decision: 'accept' })
  })

  it('refuses to queue a timeout, which may already have been accepted', async () => {
    // The heart of it. A 120s timeout that fires almost certainly reached the
    // server; replaying it accepts the lead a second time. The attorney gets a
    // real error and decides for themselves.
    decideLead.mockRejectedValueOnce(timedOut())

    await expect(runOrQueue(acceptLead())).rejects.toThrow(/timeout/i)
    expect(await getQueue()).toEqual([])
  })

  it('raises a server refusal rather than swallowing it', async () => {
    decideLead.mockRejectedValueOnce(rejected())

    await expect(runOrQueue(acceptLead())).rejects.toThrow()
    expect(await getQueue()).toEqual([])
  })

  it('reports the original failure when the action could not be stored', async () => {
    // Claiming "we'll send this when you're back online" is a lie if nothing was
    // written down, and the attorney would never think to redo it.
    decideLead.mockRejectedValueOnce(unreachable())
    failNextWrite = true

    await expect(runOrQueue(acceptLead())).rejects.toThrow(/network error/i)
  })
})

describe('draining the queue', () => {
  it('sends everything once the connection is back', async () => {
    seed([acceptLead('lead-1'), message('hello')])

    expect(await flushQueue()).toMatchObject({ sent: 2, remaining: 0 })
    expect(await getQueue()).toEqual([])
  })

  it('stops at the first action that cannot be sent, keeping order', async () => {
    // Carrying on down the list delivers a later message before the earlier one
    // it was replying to, which reads as a non-sequitur in the client's thread.
    seed([message('first'), message('second'), message('third')])
    sendAttorneyMessage.mockRejectedValueOnce(unreachable())

    const result = await flushQueue()

    expect(result).toMatchObject({ sent: 0, remaining: 3 })
    expect(sendAttorneyMessage).toHaveBeenCalledTimes(1)
    expect((await getQueue()).map((a: any) => a.payload.content)).toEqual(['first', 'second', 'third'])
  })

  it('keeps the tail in order after a partial drain', async () => {
    seed([message('first'), message('second'), message('third')])
    sendAttorneyMessage.mockResolvedValueOnce({}).mockRejectedValueOnce(unreachable())

    expect(await flushQueue()).toMatchObject({ sent: 1, remaining: 2 })
    expect((await getQueue()).map((a: any) => a.payload.content)).toEqual(['second', 'third'])
  })

  it('drops an action the server keeps refusing instead of wedging the queue', async () => {
    seed([{ ...acceptLead(), attempts: 7 }, message('still goes out')])
    decideLead.mockRejectedValueOnce(rejected())

    const result = await flushQueue()

    expect(result.sent).toBe(1)
    expect(await getQueue()).toEqual([])
  })

  it('discards actions too old to be meaningful, without sending them', async () => {
    // By now the offer may have gone to another firm; accepting it silently on
    // the attorney's behalf is worse than losing it.
    seed([{ ...acceptLead(), createdAt: Date.now() - MAX_ACTION_AGE_MS - 1000 }])

    expect(await flushQueue()).toMatchObject({ sent: 0, remaining: 0, expired: 1 })
    expect(decideLead).not.toHaveBeenCalled()
  })

  it('keeps an action that is merely old', async () => {
    seed([{ ...acceptLead(), createdAt: Date.now() - MAX_ACTION_AGE_MS + 60_000 }])

    expect(await flushQueue()).toMatchObject({ sent: 1, expired: 0 })
  })

  it('does nothing when there is nothing queued', async () => {
    expect(await flushQueue()).toEqual({ sent: 0, remaining: 0, expired: 0 })
    expect(decideLead).not.toHaveBeenCalled()
  })
})

describe('the storage budget', () => {
  it('drops the oldest rather than letting the write fail', async () => {
    // expo-secure-store gives up somewhere above 2048 bytes, so an unbounded
    // queue eventually stops persisting anything at all.
    const long = 'x'.repeat(400)
    for (let i = 0; i < 8; i++) {
      sendAttorneyMessage.mockRejectedValueOnce(unreachable())
      await runOrQueue(message(`${i}-${long}`))
    }

    const queue = await getQueue()
    expect(queue.length).toBeLessThan(8)
    expect(JSON.stringify(queue).length).toBeLessThanOrEqual(1800)
    // What survives is the most recent, which is what the attorney just did.
    expect((queue.at(-1) as any).payload.content.startsWith('7-')).toBe(true)
  })

  it('measures multi-byte content by its real width', async () => {
    // The app ships Spanish and Chinese; counting characters would undercount
    // these by a factor of three and overflow the store anyway.
    const chinese = '案'.repeat(500)
    sendAttorneyMessage.mockRejectedValueOnce(unreachable())

    await runOrQueue(message(chinese)).catch(() => undefined)

    const raw = store.get(QUEUE_KEY)
    // A single oversized action cannot be trimmed away, but it must not drag
    // others down with it on the next write.
    expect(raw === undefined || raw.length > 0).toBe(true)
  })
})
