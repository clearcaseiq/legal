/**
 * The recovery has to fire once and only once.
 *
 * Reloading on a caught error is the fix for a stale chunk and a reload loop
 * for anything else, so the tests that matter are the ones that pin the
 * boundary between those two: which errors count, and what happens on the
 * second failure in a row.
 */
import { describe, expect, it } from 'vitest'
import { isChunkLoadError, shouldReloadForChunkError } from './chunkReload'

function storage(initial?: string) {
  const store = new Map<string, string>()
  if (initial !== undefined) store.set('chunk_reload_attempt', initial)
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    read: () => store.get('chunk_reload_attempt') ?? null,
  }
}

describe('isChunkLoadError', () => {
  it('recognises webpack by its error name', () => {
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'anything' })).toBe(true)
  })

  it('recognises the message the user actually reported', () => {
    expect(isChunkLoadError({ message: 'Loading chunk 8558 failed.' })).toBe(true)
  })

  it('recognises a failed CSS chunk', () => {
    expect(isChunkLoadError({ message: 'Loading CSS chunk 412 failed.' })).toBe(true)
  })

  it('recognises native ESM wording across browsers', () => {
    expect(isChunkLoadError({ message: 'Failed to fetch dynamically imported module: /x.js' })).toBe(true)
    expect(isChunkLoadError({ message: 'error loading dynamically imported module' })).toBe(true)
    expect(isChunkLoadError({ message: 'Importing a module script failed.' })).toBe(true)
  })

  it('leaves ordinary component bugs alone, which must not trigger a reload', () => {
    expect(isChunkLoadError({ message: "Cannot read properties of undefined (reading 'map')" })).toBe(false)
    expect(isChunkLoadError({ name: 'TypeError', message: 'x is not a function' })).toBe(false)
  })

  it('does not match a message that merely mentions chunks', () => {
    expect(isChunkLoadError({ message: 'Uploaded chunk rejected by the server' })).toBe(false)
  })

  it('tolerates a missing error', () => {
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError({})).toBe(false)
  })
})

describe('shouldReloadForChunkError', () => {
  const chunkError = { name: 'ChunkLoadError', message: 'Loading chunk 8558 failed.' }

  it('reloads the first time a chunk goes missing', () => {
    expect(shouldReloadForChunkError(chunkError, 1_000, storage())).toBe(true)
  })

  it('records the attempt, so the decision cannot come apart from the record', () => {
    const store = storage()
    shouldReloadForChunkError(chunkError, 1_000, store)
    expect(store.read()).toBe('1000')
  })

  it('refuses a second reload moments later, because the first did not help', () => {
    const store = storage('1000')
    expect(shouldReloadForChunkError(chunkError, 3_000, store)).toBe(false)
  })

  it('allows recovery again once the window has passed, for a later deploy', () => {
    const store = storage('1000')
    expect(shouldReloadForChunkError(chunkError, 60_000, store)).toBe(true)
  })

  it('never reloads for an ordinary error, however many times it happens', () => {
    const store = storage()
    const bug = { name: 'TypeError', message: 'x is not a function' }
    expect(shouldReloadForChunkError(bug, 1_000, store)).toBe(false)
    expect(store.read()).toBeNull()
  })

  it('ignores an unparseable stored attempt rather than being wedged by it', () => {
    expect(shouldReloadForChunkError(chunkError, 1_000, storage('not-a-number'))).toBe(true)
  })

  it('declines to reload when storage cannot record the attempt', () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('storage disabled')
      },
    }
    expect(shouldReloadForChunkError(chunkError, 1_000, throwing)).toBe(false)
  })
})
