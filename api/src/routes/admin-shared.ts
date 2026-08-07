import { prisma } from '../lib/prisma'

/** Escape hatch for models/fields that the generated client lags behind on. */
export const prismaAny = prisma as any

export function safeJsonParse<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function safeJsonArray(value: string | null | undefined): string[] {
  const parsed = safeJsonParse<unknown>(value)
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
}
