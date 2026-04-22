const LABELS: Record<string, string> = {
  police_report: 'Police report',
  medical_records: 'Medical records',
  injury_photos: 'Injury photos',
  wage_loss: 'Wage / lost income',
  insurance: 'Insurance',
  other: 'Other',
}

export function labelRequestedDoc(key: string): string {
  return LABELS[key] || key.replace(/_/g, ' ')
}
