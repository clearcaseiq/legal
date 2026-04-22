import { z } from 'zod'

/** HTML selects use value=""; RHF number inputs can yield NaN — treat as omitted. */
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.enum(values).optional()
  )
}

function preprocessOptionalNumber(val: unknown): unknown {
  if (val === '' || val === null || val === undefined) return undefined
  const n = typeof val === 'number' ? val : Number(val)
  return Number.isFinite(n) ? n : undefined
}

/** Client form validation for attorney signup (aligned with API after submit mapping). */
export const AttorneyRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  firmName: z.string().optional(),
  firmWebsite: z.union([z.string().url(), z.literal('')]).optional(),
  stateBarNumber: z.string().optional(),
  stateBarState: z.string().optional(),
  specialties: z.array(z.string()).min(1, 'Select at least one case type'),
  secondaryCaseTypes: z.array(z.string()).optional(),
  venues: z.array(z.string()).min(1, 'Select at least one state'),
  preferredCounties: z.array(z.string()).optional(),
  preferredCities: z.string().optional(),
  excludedCaseTypes: z.array(z.string()).optional(),
  minInjurySeverity: z.preprocess(
    preprocessOptionalNumber,
    z.number().min(0).max(4).optional()
  ),
  minDamagesRange: z.preprocess(preprocessOptionalNumber, z.number().min(0).optional()),
  maxDamagesRange: z.preprocess(preprocessOptionalNumber, z.number().min(0).optional()),
  insuranceRequired: z.enum(['yes', 'no']).optional(),
  mustHaveMedicalTreatment: z.enum(['yes', 'no']).optional(),
  requirePoliceReport: z.boolean().optional(),
  requireMedicalRecords: z.boolean().optional(),
  maxCasesPerWeek: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      if (typeof val === 'number') return val
      if (typeof val === 'string') return Number(val)
      return undefined
    },
    z.number().int().min(0).optional()
  ),
  maxCasesPerMonth: z.preprocess(
    (val) => {
      if (val === '' || val === undefined || val === null) return undefined
      if (typeof val === 'number') return val
      if (typeof val === 'string') return Number(val)
      return undefined
    },
    z.number().int().min(0).optional()
  ),
  intakeStatus: optionalEnum(['accept_immediately', 'pause', 'vacation'] as const),
  preferredConsultationMethod: optionalEnum(['phone', 'zoom', 'in_person'] as const),
  pricingModel: optionalEnum(['fixed_price', 'auction', 'both'] as const),
  paymentModel: optionalEnum(['subscription', 'pay_per_case', 'both'] as const),
})

export type AttorneyRegisterFormValues = z.infer<typeof AttorneyRegisterSchema>
