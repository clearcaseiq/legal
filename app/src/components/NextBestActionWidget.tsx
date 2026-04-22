/**
 * Floating Next Best Action widget - Visible on all tabs.
 * Keeps attorneys moving forward regardless of which workspace they're in.
 */

import { ChevronRight } from 'lucide-react'

interface NextBestActionWidgetProps {
  actions: string[]
  maxVisible?: number
}

export default function NextBestActionWidget({ actions, maxVisible = 2 }: NextBestActionWidgetProps) {
  if (actions.length === 0) return null

  const visible = actions.slice(0, maxVisible)

  return (
    <div className="fixed bottom-6 right-6 z-40 w-72 rounded-lg border border-amber-200 bg-amber-50 shadow-lg p-4">
      <h4 className="text-xs font-semibold text-amber-900 mb-2">Next Best Action</h4>
      <ul className="space-y-1.5 text-sm text-gray-700">
        {visible.map((action, i) => (
          <li key={i} className="flex items-start gap-2">
            <ChevronRight className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
