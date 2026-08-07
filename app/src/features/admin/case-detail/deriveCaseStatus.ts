export function deriveCaseStatus(caseData: any): { label: string; tone: string; raw: string } {
  const raw = String(caseData?.status ?? '')
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-green-100 text-green-800',
  }
  const make = (label: string, tone: string) => ({ label, tone: tones[tone] || tones.slate, raw })
  if (caseData?.manualReviewStatus === 'pending') return make('On hold — manual review', 'amber')
  const introductions = Array.isArray(caseData?.introductions) ? caseData.introductions : []
  if (introductions.some((intro: any) => String(intro?.status).toLowerCase() === 'accepted')) return make('Attorney engaged', 'green')
  const lowered = raw.toLowerCase()
  if (lowered === 'retained') return make('Retained', 'green')
  if (introductions.length > 0) return make('Routed — awaiting attorney', 'blue')
  switch (lowered) {
    case 'draft':
    case 'analyzing': return make('Intake in progress', 'slate')
    case 'completed': return make('Intake complete — ready to route', 'slate')
    case 'submitted': return make('Submitted to attorneys', 'blue')
    case 'matched': return make('Matched', 'blue')
    default: return make(raw ? raw.replace(/_/g, ' ') : 'Unknown', 'slate')
  }
}
