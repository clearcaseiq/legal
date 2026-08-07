export type ChecklistItem = {
  id: string
  label: string
  hint: string
  category: 'incident' | 'medical' | 'financial' | 'insurance'
}

export const MEDICAL_RECORDS_CHECKLIST: ChecklistItem[] = [
  {
    id: 'police',
    label: 'Police or incident report',
    hint: 'Crash report number, narrative, and any citations.',
    category: 'incident',
  },
  {
    id: 'photos',
    label: 'Photos / video of the scene or injuries',
    hint: 'Vehicles, hazards, visible injuries, and property damage.',
    category: 'incident',
  },
  {
    id: 'witness',
    label: 'Witness names and contact info',
    hint: 'Independent witnesses often matter when fault is disputed.',
    category: 'incident',
  },
  {
    id: 'er',
    label: 'ER / urgent care records',
    hint: 'First medical visit after the incident.',
    category: 'medical',
  },
  {
    id: 'pcp',
    label: 'Primary care or follow-up notes',
    hint: 'Continuity of care and symptom progression.',
    category: 'medical',
  },
  {
    id: 'imaging',
    label: 'Imaging reports (X-ray, CT, MRI)',
    hint: 'Reports matter as much as the images themselves.',
    category: 'medical',
  },
  {
    id: 'pt',
    label: 'PT / chiropractic / specialist notes',
    hint: 'Treatment plans, frequency, and response to care.',
    category: 'medical',
  },
  {
    id: 'rx',
    label: 'Prescription and medication list',
    hint: 'Dates, dosages, and prescribing provider.',
    category: 'medical',
  },
  {
    id: 'bills',
    label: 'Itemized medical bills',
    hint: 'Provider, dates of service, and amounts billed.',
    category: 'financial',
  },
  {
    id: 'eob',
    label: 'EOBs / explanation of benefits',
    hint: 'What insurance paid, denied, or adjusted.',
    category: 'financial',
  },
  {
    id: 'wage',
    label: 'Wage-loss proof',
    hint: 'Pay stubs, employer letter, or tax records for missed work.',
    category: 'financial',
  },
  {
    id: 'oop',
    label: 'Out-of-pocket expense log',
    hint: 'Mileage, copays, medical devices, caregivers.',
    category: 'financial',
  },
  {
    id: 'policy',
    label: 'Your auto / health insurance declarations',
    hint: 'Coverage types and limits, including UM/UIM when relevant.',
    category: 'insurance',
  },
  {
    id: 'letters',
    label: 'Insurer letters and adjuster emails',
    hint: 'Denials, reservation-of-rights, low offers, recorded-statement requests.',
    category: 'insurance',
  },
  {
    id: 'other',
    label: 'Prior injury records (if relevant)',
    hint: 'Insurers often ask; having them ready reduces delay.',
    category: 'medical',
  },
]

export const CHECKLIST_CATEGORIES: { id: ChecklistItem['category']; label: string }[] = [
  { id: 'incident', label: 'Incident evidence' },
  { id: 'medical', label: 'Medical records' },
  { id: 'financial', label: 'Bills & damages' },
  { id: 'insurance', label: 'Insurance paperwork' },
]
