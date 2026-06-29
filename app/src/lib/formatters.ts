export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Turns a raw enum/database value (e.g. "ACCEPTED", "slip_and_fall",
 * "in_progress") into a human, Title Case label ("Accepted", "Slip And Fall",
 * "In Progress"). Used to keep admin/internal screens from leaking raw enum
 * formatting to users (#73).
 */
export function formatEnumLabel(value: unknown): string {
  if (value == null || value === '') return '—'
  return String(value)
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
