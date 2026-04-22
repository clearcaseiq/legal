import { ENV } from '../env'
import { logger } from './logger'

type RetrievalFilters = {
  jurisdiction?: string | null
  claim_type?: string | null
  source?: string | null
}

export type MlPredictionResponse = {
  viability: {
    overall: number
    liability: number
    causation: number
    damages: number
    ci: number[]
  }
  value_bands: {
    p25: number
    median: number
    p75: number
  }
  explainability: Array<{
    feature: string
    direction: '+' | '-'
    impact: number
  }>
  caveats: string[]
  severity?: Record<string, unknown>
  liability?: Record<string, unknown>
  model_version?: string
  source?: 'artifact' | 'fallback'
}

export type GroundedContextMatch = {
  external_id: string
  source: string
  title?: string | null
  citation?: string | null
  excerpt: string
  score: number
  metadata?: Record<string, unknown>
}

async function postJson<T>(path: string, payload: unknown): Promise<T | null> {
  if (!ENV.ML_SERVICE_URL) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ENV.ML_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(new URL(path, ENV.ML_SERVICE_URL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`ML service request failed (${response.status}): ${text.slice(0, 200)}`)
    }

    return await response.json() as T
  } catch (error) {
    logger.warn('ML service request failed', {
      path,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function getMlPrediction(features: Record<string, unknown>) {
  return await postJson<MlPredictionResponse>('/v1/predict', {
    features,
  })
}

export async function searchGroundedLegalContext(input: {
  query: string
  filters?: RetrievalFilters
  topK?: number
}) {
  if (!ENV.ML_RETRIEVAL_ENABLED) return null
  const payload = await postJson<{ matches: GroundedContextMatch[]; backend: string }>('/v1/retrieval/search', {
    query: input.query,
    filters: input.filters || {},
    top_k: input.topK || ENV.ML_RETRIEVAL_TOP_K,
  })
  return payload
}
