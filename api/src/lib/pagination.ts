/**
 * Shared limit/offset parsing for list endpoints.
 *
 * Every admin list route was doing its own `take: Number(req.query.limit)`,
 * which meant `?limit=999999` was honored and `?limit=abc` produced `take: NaN`
 * and a Prisma 500. Routing all of them through here gives one clamped,
 * NaN-safe interpretation of the same two query params.
 */

export type Pagination = {
  /** Clamped row count for Prisma `take`. */
  take: number
  /** Non-negative row offset for Prisma `skip`. */
  skip: number
}

export type PaginationOptions = {
  defaultLimit?: number
  maxLimit?: number
}

/** Coerce a query param (string | string[] | undefined) to a finite number. */
function toFiniteNumber(value: unknown): number | null {
  if (Array.isArray(value)) return toFiniteNumber(value[0])
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Parse `limit`/`offset` off a request query, clamping the limit into
 * `[1, maxLimit]` and flooring the offset at 0. Non-numeric input falls back to
 * the defaults rather than reaching Prisma as NaN.
 */
export function parsePagination(
  query: Record<string, unknown>,
  { defaultLimit = 50, maxLimit = 200 }: PaginationOptions = {}
): Pagination {
  const rawLimit = toFiniteNumber(query?.limit)
  const rawOffset = toFiniteNumber(query?.offset)

  const take = rawLimit == null ? defaultLimit : Math.min(Math.max(Math.floor(rawLimit), 1), maxLimit)
  const skip = rawOffset == null ? 0 : Math.max(Math.floor(rawOffset), 0)

  return { take, skip }
}

/**
 * The response envelope every paginated admin endpoint returns, so the client
 * can render a pager without guessing whether more rows exist.
 *
 * `total` is the count of rows matching the filter, NOT the length of this
 * page — several endpoints used to return the latter, which made it impossible
 * to tell a full last page from a truncated one.
 */
export function paginated<T>(rows: T[], total: number, { take, skip }: Pagination) {
  return {
    total,
    limit: take,
    offset: skip,
    hasMore: skip + rows.length < total,
  }
}
