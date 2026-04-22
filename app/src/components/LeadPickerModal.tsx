/**
 * Modal to pick a lead for a quick action.
 */
import { X } from 'lucide-react'

interface Lead {
  id: string
  assessmentId?: string
  status?: string
  assessment?: {
    claimType?: string
    venueCounty?: string
    venueState?: string
    user?: { firstName?: string; lastName?: string }
  }
}

interface LeadPickerModalProps {
  isOpen: boolean
  onClose: () => void
  leads: Lead[]
  title: string
  onSelect: (lead: Lead) => void
  emptyMessage?: string
}

export default function LeadPickerModal({
  isOpen,
  onClose,
  leads,
  title,
  onSelect,
  emptyMessage = 'No cases available. Add a lead first.'
}: LeadPickerModalProps) {
  if (!isOpen) return null

  const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const isIdentityRevealed = (l: Lead) => ['contacted', 'consulted', 'retained'].includes(l?.status || '')
  const caseId = (l: Lead) => l.id?.slice(-8)?.toUpperCase() || l.assessmentId?.slice(-8)?.toUpperCase() || '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {leads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
          ) : (
            <ul className="space-y-2">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    onClick={() => {
                      onSelect(lead)
                      onClose()
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-brand-50 hover:border-brand-200 transition-colors"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        #{caseId(lead)}
                      </span>
                      <span className="font-medium text-gray-900">
                        {claimLabel(lead.assessment?.claimType || 'Case')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}
                      {isIdentityRevealed(lead) && (
                        <span className="ml-2 text-gray-400">
                          · {[lead.assessment?.user?.firstName, lead.assessment?.user?.lastName].filter(Boolean).join(' ') || '—'}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
