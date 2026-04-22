import fs from 'node:fs'
import path from 'node:path'

type BenchmarkLookupRow = {
  specialtyBucket: string
  piCategory: string
  hcpcsCode: string
  hcpcsDescription: string
  providerMonthRows: number
  medianPaidPerPatient: number
  p90PaidPerPatient: number
  weightedPaidPerPatient: number
}

export type MedicalCostBenchmarkCategoryMatch = {
  categoryLabel: string
  specialtyBucket: string
  piCategory: string
  benchmarkCode: string
  benchmarkDescription: string
  providerMonthRows: number
  medianPaidPerPatient: number
  p90PaidPerPatient: number
  weightedPaidPerPatient: number
}

export type MedicalCostBenchmarkSummary = {
  status: 'available' | 'limited' | 'unavailable'
  matchedEventCount: number
  totalChronologyEvents: number
  matchedCategories: MedicalCostBenchmarkCategoryMatch[]
  unmatchedLabels: string[]
  benchmarkTypicalTotal: number | null
  benchmarkHighTotal: number | null
  medCharges: number | null
  detail: string
  caution: string
}

type ChronologyLikeEvent = {
  label?: string | null
  provider?: string | null
}

type CategoryDescriptor = {
  categoryLabel: string
  specialtyBucket: string
  piCategory: string
  patterns: RegExp[]
}

const CATEGORY_DESCRIPTORS: CategoryDescriptor[] = [
  {
    categoryLabel: 'Emergency care',
    specialtyBucket: 'emergency_medicine',
    piCategory: 'er_eval',
    patterns: [/\ber\b/i, /\bemergency\b/i, /\burgent care\b/i, /\bed visit\b/i],
  },
  {
    categoryLabel: 'Imaging',
    specialtyBucket: 'diagnostic_radiology',
    piCategory: 'imaging',
    patterns: [/\bmri\b/i, /\bct\b/i, /\bx-?ray\b/i, /\bradiology\b/i, /\bimaging\b/i],
  },
  {
    categoryLabel: 'Physical therapy',
    specialtyBucket: 'physical_therapy',
    piCategory: 'pt_ot_chiro',
    patterns: [/\bpt\b/i, /\bphysical therapy\b/i, /\bphysio\b/i, /\brehab\b/i],
  },
  {
    categoryLabel: 'Pain management',
    specialtyBucket: 'pain_medicine',
    piCategory: 'pain_injection',
    patterns: [/\bpain\b/i, /\binjection\b/i, /\bepidural\b/i, /\bnerve block\b/i],
  },
  {
    categoryLabel: 'Interventional pain management',
    specialtyBucket: 'interventional_pain_medicine',
    piCategory: 'pain_injection',
    patterns: [/\bepidural\b/i, /\bfacet\b/i, /\bnerve root\b/i, /\bsteroid injection\b/i],
  },
  {
    categoryLabel: 'Orthopaedic follow-up',
    specialtyBucket: 'orthopaedic_surgery',
    piCategory: 'office_eval',
    patterns: [/\bortho\b/i, /\borthopedic\b/i, /\borthopaedic\b/i, /\bsurgeon\b/i],
  },
  {
    categoryLabel: 'Ambulance transport',
    specialtyBucket: 'ambulance',
    piCategory: 'ambulance',
    patterns: [/\bambulance\b/i, /\bems\b/i, /\btransport\b/i, /\bparamedic\b/i],
  },
  {
    categoryLabel: 'Physical medicine and rehab',
    specialtyBucket: 'physical_medicine_rehab',
    piCategory: 'office_eval',
    patterns: [/\bpm&r\b/i, /\bphysical medicine\b/i, /\brehab medicine\b/i],
  },
]

let cachedBenchmarkRows: BenchmarkLookupRow[] | null = null

function resolveLookupPath() {
  const candidates = [
    path.resolve(process.cwd(), 'Injury Intelligence', 'Data', 'Medicare', 'trauma-core-product-ready-lookup-overall.csv'),
    path.resolve(process.cwd(), '..', '..', 'Injury Intelligence', 'Data', 'Medicare', 'trauma-core-product-ready-lookup-overall.csv'),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0]
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }

  values.push(current)
  return values
}

function loadBenchmarkRows(): BenchmarkLookupRow[] {
  if (cachedBenchmarkRows) return cachedBenchmarkRows

  const lookupPath = resolveLookupPath()
  if (!fs.existsSync(lookupPath)) {
    cachedBenchmarkRows = []
    return cachedBenchmarkRows
  }

  const raw = fs.readFileSync(lookupPath, 'utf-8')
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const header = parseCsvLine(lines[0] || '')
  const rows: BenchmarkLookupRow[] = []

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    const record = Object.fromEntries(header.map((key, index) => [key, cols[index] || '']))
    rows.push({
      specialtyBucket: record.specialty_bucket,
      piCategory: record.pi_category,
      hcpcsCode: record.hcpcs_code,
      hcpcsDescription: record.hcpcs_description,
      providerMonthRows: Number(record.provider_month_rows || 0),
      medianPaidPerPatient: Number(record.median_paid_per_patient || 0),
      p90PaidPerPatient: Number(record.p90_paid_per_patient || 0),
      weightedPaidPerPatient: Number(record.weighted_paid_per_patient || 0),
    })
  }

  cachedBenchmarkRows = rows
  return rows
}

function inferDescriptor(label: string) {
  return CATEGORY_DESCRIPTORS.find((descriptor) => descriptor.patterns.some((pattern) => pattern.test(label)))
}

function getRepresentativeRow(descriptor: CategoryDescriptor, rows: BenchmarkLookupRow[]) {
  return rows
    .filter((row) => row.specialtyBucket === descriptor.specialtyBucket && row.piCategory === descriptor.piCategory)
    .sort((a, b) => b.providerMonthRows - a.providerMonthRows)[0]
}

export function buildMedicalCostBenchmarkSummary(params: {
  chronology: ChronologyLikeEvent[]
  medCharges?: number | null
}): MedicalCostBenchmarkSummary {
  const rows = loadBenchmarkRows()
  const chronology = params.chronology || []
  const unmatchedLabels = new Set<string>()
  const matches: MedicalCostBenchmarkCategoryMatch[] = []

  for (const event of chronology) {
    const label = [event.label, event.provider].filter(Boolean).join(' ').trim()
    if (!label) continue

    const descriptor = inferDescriptor(label)
    if (!descriptor) {
      unmatchedLabels.add(label)
      continue
    }

    const benchmark = getRepresentativeRow(descriptor, rows)
    if (!benchmark) {
      unmatchedLabels.add(label)
      continue
    }

    matches.push({
      categoryLabel: descriptor.categoryLabel,
      specialtyBucket: benchmark.specialtyBucket,
      piCategory: benchmark.piCategory,
      benchmarkCode: benchmark.hcpcsCode,
      benchmarkDescription: benchmark.hcpcsDescription,
      providerMonthRows: benchmark.providerMonthRows,
      medianPaidPerPatient: benchmark.medianPaidPerPatient,
      p90PaidPerPatient: benchmark.p90PaidPerPatient,
      weightedPaidPerPatient: benchmark.weightedPaidPerPatient,
    })
  }

  const benchmarkTypicalTotal = matches.length > 0
    ? Number(matches.reduce((sum, item) => sum + item.weightedPaidPerPatient, 0).toFixed(2))
    : null
  const benchmarkHighTotal = matches.length > 0
    ? Number(matches.reduce((sum, item) => sum + item.p90PaidPerPatient, 0).toFixed(2))
    : null

  const uniqueCategoryLabels = Array.from(new Set(matches.map((item) => item.categoryLabel)))
  const medCharges = typeof params.medCharges === 'number' ? params.medCharges : null

  let status: MedicalCostBenchmarkSummary['status'] = 'unavailable'
  if (matches.length >= 3) status = 'available'
  else if (matches.length > 0) status = 'limited'

  const detail =
    status === 'available'
      ? `We matched ${matches.length} treatment event${matches.length === 1 ? '' : 's'} to Medicaid trauma benchmark categories, mostly ${uniqueCategoryLabels.join(', ')}.`
      : status === 'limited'
        ? `We found limited benchmark coverage for ${matches.length} treatment event${matches.length === 1 ? '' : 's'}, mainly ${uniqueCategoryLabels.join(', ')}.`
        : 'No reliable treatment labels were available to compare this file against the trauma benchmark lookup yet.'

  return {
    status,
    matchedEventCount: matches.length,
    totalChronologyEvents: chronology.length,
    matchedCategories: matches.slice(0, 6),
    unmatchedLabels: Array.from(unmatchedLabels).slice(0, 6),
    benchmarkTypicalTotal,
    benchmarkHighTotal,
    medCharges,
    detail,
    caution: 'These are population-level Medicaid treatment benchmarks inferred from broad treatment categories, not patient-specific reimbursement predictions.',
  }
}
