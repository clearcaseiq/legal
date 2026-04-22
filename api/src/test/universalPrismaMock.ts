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
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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

export const prisma: any = (() => {
  const base: Record<string, unknown> = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  }

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
}
