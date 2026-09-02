import { describe, expect, it } from 'vitest'
import { createLogger } from './logger'

/**
 * These pin the argument order the codebase actually uses. pino's own contract
 * is `(mergingObject, message)`, and calling it the other way round silently
 * discards the object — which is how a 500 reached production logged as one
 * bare sentence with no error attached.
 */
function captureLogLines(run: (log: any) => void): Record<string, any>[] {
  const lines: Record<string, any>[] = []
  const log = createLogger({
    write(chunk: string) {
      for (const line of String(chunk).split('\n')) {
        if (!line.trim()) continue
        lines.push(JSON.parse(line))
      }
    },
  })

  run(log)
  return lines
}

describe('logger argument order', () => {
  it('keeps context passed as (message, object), which pino would otherwise drop', () => {
    const [line] = captureLogLines((log) => {
      log.warn('Login rejected', { userId: 'u1', reason: 'bad_password' })
    })

    expect(line.msg).toBe('Login rejected')
    expect(line.userId).toBe('u1')
    expect(line.reason).toBe('bad_password')
  })

  it('still accepts pino native (object, message) order', () => {
    const [line] = captureLogLines((log) => {
      log.info({ requestId: 'r1' }, 'Handled request')
    })

    expect(line.msg).toBe('Handled request')
    expect(line.requestId).toBe('r1')
  })

  it('serializes an Error under `error`, the key most call sites use', () => {
    const [line] = captureLogLines((log) => {
      log.error('Failed to list platform payments', { error: new Error('boom') })
    })

    expect(line.msg).toBe('Failed to list platform payments')
    // The bug this guards against logged `{}` here, because an Error's message
    // and stack are non-enumerable.
    expect(line.error?.message).toBe('boom')
    expect(line.error?.stack).toContain('boom')
  })

  it('serializes an Error under `err` too', () => {
    const [line] = captureLogLines((log) => {
      log.error({ err: new Error('kaboom') }, 'Something failed')
    })

    expect(line.err?.message).toBe('kaboom')
  })

  it('leaves a non-Error `error` value alone', () => {
    const [line] = captureLogLines((log) => {
      log.error('Rejected', { error: 'not found' })
    })

    expect(line.error).toBe('not found')
  })

  it('does not steal an interpolation value from a printf message', () => {
    const [line] = captureLogLines((log) => {
      log.info('rendered %o', { a: 1 })
    })

    expect(line.msg).toContain('"a":1')
    expect(line.a).toBeUndefined()
  })

  it('applies the same handling to child loggers', () => {
    const [line] = captureLogLines((log) => {
      log.child({ scope: 'billing' }).error('Charge failed', { attempt: 2 })
    })

    expect(line.scope).toBe('billing')
    expect(line.attempt).toBe(2)
    expect(line.msg).toBe('Charge failed')
  })
})
