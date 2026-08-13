/**
 * Build a plaintiff-facing Case Value History from stored Prediction rows.
 *
 * History tracks material valuation changes only (not every attorney busywork
 * event). Labels come from the recalculation reason / explain payload when
 * present so bars read as "why the estimate moved".
 */

export type PredictionBands = { p25: number; median: number; p75: number }

export type PredictionForHistory = {
  bands: string
  explain: string
  createdAt: Date | string
}

export type CaseValueHistoryEntry = {
  label: string
  shortLabel: string
  reasonKey: string
  value: number
  bands: PredictionBands
  createdAt: string
}

const REASON_LABELS: Record<string, { label: string; shortLabel: string }> = {
  initial: { label: 'Initial estimate', shortLabel: 'Initial' },
  current: { label: 'Current estimate', shortLabel: 'Current' },
  document_upload: { label: 'After documents', shortLabel: 'Docs' },
  evidence_processing: { label: 'After evidence review', shortLabel: 'Evidence' },
  document_deleted: { label: 'After document removed', shortLabel: 'Updated' },
  plaintiff_damage_estimates: { label: 'After damage updates', shortLabel: 'Damages' },
  materialized_underwriting: { label: 'Initial estimate', shortLabel: 'Initial' },
  updated: { label: 'Updated estimate', shortLabel: 'Updated' },
}

/** Absolute $ or relative % change that counts as a new history point. */
const MIN_ABS_DELTA = 500
const MIN_REL_DELTA = 0.05

function parseBands(raw: string): PredictionBands | null {
  try {
    const bands = JSON.parse(raw) as Partial<PredictionBands>
    const median = Number(bands?.median)
    if (!Number.isFinite(median)) return null
    return {
      p25: Number(bands?.p25) || 0,
      median,
      p75: Number(bands?.p75) || 0,
    }
  } catch {
    return null
  }
}

function parseExplain(raw: string): { reason?: string; trigger?: string; source?: string } {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return {
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      trigger: typeof parsed.trigger === 'string' ? parsed.trigger : undefined,
      source: typeof parsed.source === 'string' ? parsed.source : undefined,
    }
  } catch {
    return {}
  }
}

export function isMaterialValueChange(prevMedian: number, nextMedian: number): boolean {
  if (!Number.isFinite(prevMedian) || !Number.isFinite(nextMedian)) return true
  const delta = Math.abs(nextMedian - prevMedian)
  if (delta < 1) return false
  if (prevMedian <= 0) return delta >= MIN_ABS_DELTA
  return delta >= MIN_ABS_DELTA || delta / prevMedian >= MIN_REL_DELTA
}

function normalizeReasonKey(raw: string | undefined, isFirst: boolean): string {
  const key = (raw || '').trim().toLowerCase()
  if (!key) return isFirst ? 'initial' : 'updated'
  if (key === 'materialized_underwriting') return 'initial'
  if (REASON_LABELS[key]) return key
  return 'updated'
}

function labelsFor(reasonKey: string, position: 'first' | 'middle' | 'last'): {
  label: string
  shortLabel: string
  reasonKey: string
} {
  if (position === 'first') {
    const initial = REASON_LABELS.initial
    return { ...initial, reasonKey: 'initial' }
  }
  if (position === 'last') {
    const current = REASON_LABELS.current
    return { ...current, reasonKey: 'current' }
  }
  const mapped = REASON_LABELS[reasonKey] || REASON_LABELS.updated
  return { ...mapped, reasonKey: REASON_LABELS[reasonKey] ? reasonKey : 'updated' }
}

/**
 * Chronological (oldest → newest) history, material changes only.
 * Always includes the first and latest prediction when bands parse.
 */
export function buildCaseValueHistory(
  predictions: PredictionForHistory[],
  options?: { maxPoints?: number },
): CaseValueHistoryEntry[] {
  const maxPoints = options?.maxPoints ?? 8
  const chronological = [...predictions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const parsed = chronological
    .map((p) => {
      const bands = parseBands(p.bands)
      if (!bands) return null
      const explain = parseExplain(p.explain)
      const reasonRaw = explain.reason || explain.trigger || explain.source
      return {
        bands,
        createdAt: new Date(p.createdAt).toISOString(),
        reasonRaw,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  if (parsed.length === 0) return []

  const kept: typeof parsed = [parsed[0]]
  for (let i = 1; i < parsed.length - 1; i += 1) {
    const prev = kept[kept.length - 1]
    const next = parsed[i]
    if (isMaterialValueChange(prev.bands.median, next.bands.median)) {
      kept.push(next)
    }
  }
  const last = parsed[parsed.length - 1]
  if (kept[kept.length - 1] !== last) {
    if (isMaterialValueChange(kept[kept.length - 1].bands.median, last.bands.median)) {
      kept.push(last)
    } else {
      // Always surface the latest snapshot as "Current", even if the median
      // did not move enough — replaces the prior tip so the chart ends today.
      kept[kept.length - 1] = last
    }
  }

  // If too many material points, keep first + evenly spaced middle + last.
  let trimmed = kept
  if (trimmed.length > maxPoints) {
    const middle = trimmed.slice(1, -1)
    const budget = maxPoints - 2
    const step = middle.length / budget
    const sampled = Array.from({ length: budget }, (_, i) => middle[Math.min(middle.length - 1, Math.floor(i * step))])
    trimmed = [trimmed[0], ...sampled, trimmed[trimmed.length - 1]]
  }

  return trimmed.map((row, index) => {
    const position: 'first' | 'middle' | 'last' =
      trimmed.length === 1
        ? 'last'
        : index === 0
          ? 'first'
          : index === trimmed.length - 1
            ? 'last'
            : 'middle'
    const reasonKey = normalizeReasonKey(row.reasonRaw, index === 0)
    const { label, shortLabel, reasonKey: resolvedKey } = labelsFor(reasonKey, position)
    return {
      label,
      shortLabel,
      reasonKey: resolvedKey,
      value: row.bands.median,
      bands: row.bands,
      createdAt: row.createdAt,
    }
  })
}
