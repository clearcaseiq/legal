/**
 * Field mappings configuration
 *
 * Admin-editable synonym/alias maps that let non-engineers reconcile values that
 * drift between surfaces — e.g. the plaintiff-facing case type chosen in attorney
 * search vs. the specialty slug an attorney actually stored. Stored in the same
 * admin-editable `routingConfig` key/value table as heuristics and matching rules,
 * so mappings can change without a deploy.
 *
 * The shape is intentionally generic (a list of fields, each with canonical
 * values and aliases) so additional fields can be mapped from the Admin screen
 * without new code.
 */

import { prisma } from './prisma'

const CONFIG_KEY = 'field_mappings'

export interface MappingEntry {
  /** The canonical value (what the rest of the system treats as the source of truth). */
  canonical: string
  /** Optional human-friendly label for the admin UI. */
  label?: string
  /** Equivalent values that should resolve to the canonical value. */
  aliases: string[]
}

export interface FieldMapping {
  /** Stable identifier used in code (e.g. 'claimType'). */
  field: string
  /** Display name shown in the Admin UI. */
  label: string
  /** What the mapping is for. */
  description?: string
  /** Column header for the canonical value in the Admin UI. */
  sourceLabel?: string
  /** Column header for the aliases in the Admin UI. */
  targetLabel?: string
  entries: MappingEntry[]
}

export interface FieldMappingsConfig {
  mappings: FieldMapping[]
}

export const DEFAULT_FIELD_MAPPINGS: FieldMappingsConfig = {
  mappings: [
    {
      field: 'claimType',
      label: 'Case Type → Attorney Specialty',
      description:
        'Maps the plaintiff-facing case type chosen in attorney search to the attorney specialty slug(s) it should match. Add aliases when the same case type has been stored under different slugs (e.g. legacy vs. current vocabulary).',
      sourceLabel: 'Search case type',
      targetLabel: 'Matching specialty slug(s)',
      entries: [
        { canonical: 'auto', label: 'Auto Accident', aliases: ['vehicle'] },
        { canonical: 'slip_and_fall', label: 'Slip-and-Fall', aliases: ['slip_fall'] },
        { canonical: 'dog_bite', label: 'Dog Bite', aliases: [] },
        { canonical: 'medmal', label: 'Medical Malpractice', aliases: [] },
        { canonical: 'product', label: 'Product Liability', aliases: [] },
        { canonical: 'nursing_home_abuse', label: 'Nursing Home Abuse', aliases: [] },
        { canonical: 'wrongful_death', label: 'Wrongful Death', aliases: [] },
        { canonical: 'high_severity_surgery', label: 'High-Severity / Surgery', aliases: [] },
      ],
    },
  ],
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const normalizeEntry = (raw: unknown): MappingEntry | null => {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const canonical = asString(obj.canonical)
  if (!canonical) return null
  const aliases = Array.isArray(obj.aliases)
    ? Array.from(
        new Set(
          obj.aliases
            .map(asString)
            .filter((a) => a.length > 0 && a !== canonical)
        )
      )
    : []
  const label = asString(obj.label)
  return { canonical, aliases, ...(label ? { label } : {}) }
}

const normalizeMapping = (raw: unknown): FieldMapping | null => {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const field = asString(obj.field)
  if (!field) return null
  const entries = Array.isArray(obj.entries)
    ? obj.entries.map(normalizeEntry).filter((e): e is MappingEntry => e !== null)
    : []
  return {
    field,
    label: asString(obj.label) || field,
    description: asString(obj.description) || undefined,
    sourceLabel: asString(obj.sourceLabel) || undefined,
    targetLabel: asString(obj.targetLabel) || undefined,
    entries,
  }
}

/** Sanitize an arbitrary parsed value into a valid config, preserving admin edits. */
export function normalizeFieldMappings(raw?: Partial<FieldMappingsConfig> | null): FieldMappingsConfig {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.mappings)) {
    return DEFAULT_FIELD_MAPPINGS
  }
  const mappings = raw.mappings.map(normalizeMapping).filter((m): m is FieldMapping => m !== null)
  return mappings.length ? { mappings } : DEFAULT_FIELD_MAPPINGS
}

export async function getFieldMappings(): Promise<FieldMappingsConfig> {
  try {
    const row = await prisma.routingConfig.findUnique({ where: { key: CONFIG_KEY } })
    if (!row?.value) return DEFAULT_FIELD_MAPPINGS
    try {
      return normalizeFieldMappings(JSON.parse(row.value) as Partial<FieldMappingsConfig>)
    } catch {
      return DEFAULT_FIELD_MAPPINGS
    }
  } catch {
    // Table may not exist yet (migration not run) — fall back to defaults.
    return DEFAULT_FIELD_MAPPINGS
  }
}

export async function saveFieldMappings(config: Partial<FieldMappingsConfig>): Promise<FieldMappingsConfig> {
  const normalized = normalizeFieldMappings(config)
  try {
    await prisma.routingConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(normalized) },
      update: { value: JSON.stringify(normalized) },
    })
    return normalized
  } catch {
    throw new Error(
      'Failed to save field mappings. Ensure the routing_config table exists (run: npx prisma migrate deploy)'
    )
  }
}

/**
 * Resolve the set of values a given source value should match for a field.
 * Returns [canonical, ...aliases] for the matching entry, or just the value
 * itself when no mapping exists. Matching is case-insensitive and also succeeds
 * when the value is listed as one of an entry's aliases.
 */
export function resolveMatchValues(config: FieldMappingsConfig, field: string, value: string): string[] {
  const mapping = config.mappings.find((m) => m.field === field)
  if (!mapping) return [value]
  const needle = value.trim().toLowerCase()
  const entry = mapping.entries.find(
    (e) =>
      e.canonical.toLowerCase() === needle ||
      e.aliases.some((a) => a.toLowerCase() === needle)
  )
  if (!entry) return [value]
  return Array.from(new Set([entry.canonical, ...entry.aliases]))
}
