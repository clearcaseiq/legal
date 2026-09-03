import { vi } from 'vitest'

const modelCache = new Map<string, ReturnType<typeof makeModel>>()

function makeModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((args: { data?: Record<string, unknown> } = {}) =>
      Promise.resolve({
        id: 'mock-id',
        ...(args.data && typeof args.data === 'object' ? args.data : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ),
    // Reports the number of rows it was handed, so callers that check the count
    // see the batch they actually passed.
    createMany: vi.fn().mockImplementation((args: { data?: unknown } = {}) =>
      Promise.resolve({ count: Array.isArray(args.data) ? args.data.length : args.data ? 1 : 0 })
    ),
    update: vi.fn().mockResolvedValue({}),
    // Defaults to one affected row: an update that silently matched nothing is
    // the unusual case, and code that guards on `count` (optimistic-concurrency
    // writes, conditional state transitions) would otherwise take its failure
    // branch in every test that had not thought about it. Tests that want the
    // no-match path still set `{ count: 0 }` explicitly.
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    upsert: vi.fn().mockImplementation((args: { create?: Record<string, unknown>; update?: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'mock-upsert',
        ...(args?.create ?? args?.update ?? {}),
      })
    ),
    aggregate: vi.fn().mockResolvedValue({ _count: { _all: 0 }, _avg: {}, _sum: {} }),
    groupBy: vi.fn().mockResolvedValue([]),
  }
}

/**
 * Raw-query escape hatches. Without these the proxy below hands back a model
 * stub, so calling prisma.$queryRaw throws "not a function" rather than
 * returning rows.
 */
const rawQueryFns = ['$queryRaw', '$queryRawUnsafe', '$executeRaw', '$executeRawUnsafe'] as const

export const prisma: any = (() => {
  const base: Record<string, unknown> = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  }
  for (const name of rawQueryFns) base[name] = vi.fn().mockResolvedValue([])

  const proxy = new Proxy(base, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined
      if (prop in base) return base[prop]
      if (!modelCache.has(prop)) modelCache.set(prop, makeModel())
      return modelCache.get(prop)!
    },
  })

  base.$transaction = vi.fn((arg: unknown) => {
    if (typeof arg === 'function') return (arg as (p: typeof proxy) => Promise<unknown>)(proxy)
    return Promise.all(arg as Promise<unknown>[])
  })

  return proxy
})()

/** Clears cached model mocks so each test gets fresh vi.fn instances. */
export function resetUniversalPrismaMock() {
  modelCache.clear()
  // The raw helpers live on the base object rather than the cache, so clearing
  // the cache alone would leak a previous test's rows into the next one.
  for (const name of rawQueryFns) {
    const fn = prisma[name] as ReturnType<typeof vi.fn>
    fn.mockReset()
    fn.mockResolvedValue([])
  }
}
