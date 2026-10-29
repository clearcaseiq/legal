import { beforeEach, describe, expect, it, vi } from 'vitest'

const reportError = vi.fn()
let enabled = true

vi.mock('./error-reporting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./error-reporting')>()
  return {
    ...actual,
    isErrorReportingEnabled: () => enabled,
    reportError: (...args: unknown[]) => reportError(...args),
  }
})

import { safeContext, scrubBreadcrumb, scrubEvent } from './error-reporting'
import { createLogger } from './logger'

const silent = { write() {} }

describe('error event scrubbing', () => {
  it('removes request bodies, cookies, query strings, auth headers and the user', () => {
    const event = scrubEvent({
      type: undefined,
      user: { email: 'claimant@example.com', ip_address: '1.2.3.4' },
      request: {
        url: 'https://api.clearcaseiq.com/v1/auth/reset?token=secret',
        data: { injuries: 'broken wrist' },
        cookies: { session: 'abc' },
        query_string: 'token=secret',
        headers: { Authorization: 'Bearer x', Cookie: 'a=b', 'User-Agent': 'UA', 'X-Request-Id': 'r1' },
      },
    } as any)

    expect(event.user).toBeUndefined()
    expect(event.request).toEqual({
      url: 'https://api.clearcaseiq.com/v1/auth/reset',
      headers: { 'User-Agent': 'UA', 'X-Request-Id': 'r1' },
    })
  })

  it('drops console breadcrumbs and strips query strings from outgoing calls', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'claimant data' })).toBeNull()
    expect(scrubBreadcrumb({ category: 'http', data: { url: 'https://x.test/a?key=k', method: 'GET' } })).toEqual({
      category: 'http',
      data: { url: 'https://x.test/a', method: 'GET' },
    })
  })

  it('forwards only opaque ids and operational labels from log context', () => {
    expect(
      safeContext({
        assessmentId: 'a1',
        leadId: 'l1',
        reason: 'routing_gate_review',
        email: 'claimant@example.com',
        phone: '+15555550100',
        facts: { injuries: 'x' },
        attorneyIds: ['a', 'b'],
      }),
    ).toEqual({ assessmentId: 'a1', leadId: 'l1', reason: 'routing_gate_review' })
  })
})

describe('logger forwarding to error reporting', () => {
  beforeEach(() => {
    reportError.mockClear()
    enabled = true
  })

  it('reports error-level lines with the original Error and the log message', () => {
    const log = createLogger(silent)
    const boom = new Error('db down')
    log.error('Failed to list platform payments', { error: boom, assessmentId: 'a1' })

    expect(reportError).toHaveBeenCalledTimes(1)
    const [error, message, context] = reportError.mock.calls[0]
    expect(error).toBe(boom)
    expect(message).toBe('Failed to list platform payments')
    expect(context).toMatchObject({ assessmentId: 'a1' })
  })

  it('wraps a string error so a route that catches its own failure still reports', () => {
    const log = createLogger(silent)
    log.error('Failed to load lead command center', { error: 'Assessment not found' })

    const [error, message] = reportError.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(message).toBe('Failed to load lead command center')
  })

  it('ignores warnings and does nothing while reporting is off', () => {
    const log = createLogger(silent)
    log.warn('Demand narration failed; using deterministic copy', { error: new Error('x') })
    enabled = false
    log.error('Something failed', { error: new Error('y') })

    expect(reportError).not.toHaveBeenCalled()
  })
})
