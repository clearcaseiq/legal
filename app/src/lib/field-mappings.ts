/**
 * Field mappings (frontend mirror of api/src/lib/field-mappings-config.ts).
 *
 * Admin-editable synonym/alias maps that reconcile values which drift between
 * surfaces (e.g. the case type chosen in attorney search vs. the specialty slug
 * an attorney stored). Kept in sync with the backend shape.
 */

export interface MappingEntry {
  canonical: string
  label?: string
  aliases: string[]
}

export interface FieldMapping {
  field: string
  label: string
  description?: string
  sourceLabel?: string
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
