/**
 * A rate-limit store backed by Postgres, so a limit means the same thing no
 * matter which instance answers the request.
 *
 * `express-rate-limit` defaults to counting in process memory. That was correct
 * while production was one server and silently wrong the moment it became two:
 * a caller whose requests alternate between instances is measured against two
 * independent counters, so the effective allowance is the configured one
 * multiplied by the number of hosts. For the app-wide limiter that is merely
 * imprecise. For sign-in it is a security property quietly relaxed — 30
 * attempts per quarter hour, chosen to make password guessing impractical,
 * became 60 with no change to the configuration and nothing in the logs.
 *
 * Only the limiters where the number matters use this. The blunt app-wide
 * limiter stays in memory deliberately: it guards against floods rather than
 * enforcing a precise budget, and giving it a shared store would add a database
 * round-trip to every request the API serves in order to make a ceiling nobody
 * reaches twice as accurate.
 */

import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit'
import { prisma } from './prisma'
import { logger } from './logger'

/**
 * Rows are keyed by caller, so the table grows with distinct addresses rather
 * than with traffic, and expired rows are harmless apart from the space. They
 * are cleared on a small fraction of writes instead of by a dedicated loop —
 * background loops run only on the scheduler leaseholder, and this should not
 * quietly stop being tidied because leadership moved.
 */
const CLEANUP_PROBABILITY = 0.005
const CLEANUP_GRACE_MS = 60 * 60 * 1000

export class PostgresRateLimitStore implements Store {
  /** Set by express-rate-limit from the limiter's own options. */
  private windowMs = 15 * 60 * 1000

  /**
   * Keeps each limiter's counters distinct, so one address hitting sign-in does
   * not spend its upload allowance. Named `namespace` rather than `prefix`
   * because `Store` declares a public `prefix` of its own.
   */
  private readonly namespace: string

  constructor(namespace: string) {
    this.namespace = namespace
  }

  init(options: Options): void {
    this.windowMs = options.windowMs
  }

  private id(key: string): string {
    return `${this.namespace}:${key}`
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const seconds = this.windowMs / 1000

    try {
      // One statement, so concurrent requests on different instances cannot
      // interleave a read and a write and both believe they were the first.
      // The window is restarted rather than extended when the stored one has
      // already passed, which is what makes this a fixed window rather than a
      // sliding one that never lets a blocked caller back in.
      const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
        INSERT INTO rate_limit_counters ("key", "count", "expiresAt")
        VALUES (
          ${this.id(key)},
          1,
          now() + make_interval(secs => ${seconds}::double precision)
        )
        ON CONFLICT ("key") DO UPDATE
        SET "count" = CASE
              WHEN rate_limit_counters."expiresAt" <= now() THEN 1
              ELSE rate_limit_counters."count" + 1
            END,
            "expiresAt" = CASE
              WHEN rate_limit_counters."expiresAt" <= now()
              THEN now() + make_interval(secs => ${seconds}::double precision)
              ELSE rate_limit_counters."expiresAt"
            END
        RETURNING "count", "expiresAt"
      `

      if (Math.random() < CLEANUP_PROBABILITY) void this.cleanup()

      const row = rows[0]
      return { totalHits: row?.count ?? 1, resetTime: row?.expiresAt }
    } catch (error) {
      // Fail open. A caller cannot sign in while the database is unreachable
      // anyway — the credential lookup needs it — so refusing traffic here
      // would turn a database blip into a lockout without protecting anything.
      logger.error('Rate limit store unavailable; allowing the request', {
        limiter: this.namespace,
        error: error instanceof Error ? error.message : String(error),
      })
      return { totalHits: 1, resetTime: undefined }
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE rate_limit_counters
        SET "count" = GREATEST("count" - 1, 0)
        WHERE "key" = ${this.id(key)} AND "expiresAt" > now()
      `
    } catch {
      // Only used by `skipSuccessfulRequests`, which nothing here enables. A
      // failure costs the caller one request of allowance.
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await prisma.$executeRaw`DELETE FROM rate_limit_counters WHERE "key" = ${this.id(key)}`
    } catch (error) {
      logger.warn('Could not reset a rate limit counter', {
        limiter: this.namespace,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM rate_limit_counters
        WHERE "expiresAt" < now() - make_interval(secs => ${CLEANUP_GRACE_MS / 1000}::double precision)
      `
    } catch {
      // Tidying only; the next write will try again.
    }
  }
}
