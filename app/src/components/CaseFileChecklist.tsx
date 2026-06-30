import { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import InlineEvidenceUpload from './InlineEvidenceUpload'

interface CaseFileChecklistProps {
  assessmentId?: string
  hasInsurance: boolean
  hasMedicalBills: boolean
  hasMedicalRecords: boolean
  hasPoliceReport: boolean
  hasWageLossProof: boolean
  hasInjuryPhotos: boolean
  /** Called after files are uploaded so the parent can refresh the estimate. */
  onUploaded?: () => void
}

interface ChecklistItem {
  key: string
  label: string
  category: string
  subcategory?: string
  why: string
  howToGet?: string
  done: boolean
}

// Guided "build your case file" checklist. Each item the client is entitled to
// collect themselves — the legally safest path to better data. Adding any item
// uploads through the existing evidence pipeline, which re-runs the live
// estimate. Framed around what to gather and how to get it, not homework.
export default function CaseFileChecklist({
  assessmentId,
  hasInsurance,
  hasMedicalBills,
  hasMedicalRecords,
  hasPoliceReport,
  hasWageLossProof,
  hasInjuryPhotos,
  onUploaded,
}: CaseFileChecklistProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  const items: ChecklistItem[] = [
    {
      key: 'insurance',
      label: 'Insurance declarations page',
      category: 'insurance',
      subcategory: 'dec_page',
      why: 'Shows the coverage limits — the realistic ceiling on your recovery.',
      howToGet: "Ask your insurer (or the at-fault driver's) for the “declarations page.” It's free and you're entitled to yours.",
      done: hasInsurance,
    },
    {
      key: 'bills',
      label: 'Medical bills',
      category: 'bills',
      subcategory: 'medical_bill',
      why: 'Your treatment costs are a core part of the claim and usually raise the estimate.',
      howToGet: 'Ask each provider for an itemized bill, or upload statements as they arrive.',
      done: hasMedicalBills,
    },
    {
      key: 'medical_records',
      label: 'Medical records',
      category: 'medical_records',
      why: 'Records tie your injuries to the accident and strengthen the whole case.',
      howToGet: 'Request records from each provider you saw, or upload an after-visit summary.',
      done: hasMedicalRecords,
    },
    {
      key: 'police_report',
      label: 'Police / incident report',
      category: 'police_report',
      why: 'A report is strong, independent evidence of who was at fault.',
      howToGet: 'Get it from the responding department or your state DMV crash-report portal.',
      done: hasPoliceReport,
    },
    {
      key: 'wage_loss',
      label: 'Lost wage proof',
      category: 'wage_loss',
      why: 'Time missed from work adds directly to your recoverable damages.',
      howToGet: 'Upload pay stubs, an employer letter, or a note showing missed dates.',
      done: hasWageLossProof,
    },
    {
      key: 'photos',
      label: 'Injury & scene photos',
      category: 'photos',
      subcategory: 'injury_photos',
      why: 'Photos make injuries and damage concrete for the adjuster.',
      howToGet: 'Upload any photos of your injuries, the vehicles, or the scene.',
      done: hasInjuryPhotos,
    },
  ]

  const completed = items.filter((i) => i.done).length
  const percent = Math.round((completed / items.length) * 100)

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Build your case file</p>
          <p className="mt-0.5 text-xs text-slate-500">
            You&apos;re entitled to every item below. Add what you have now — each one sharpens your
            estimate. You can always come back as more arrives.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900 tabular-nums">{percent}%</p>
          <p className="text-[11px] text-slate-400">
            {completed}/{items.length} added
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((item) => {
          const isOpen = openKey === item.key
          return (
            <li key={item.key} className="py-3">
              <div className="flex items-start gap-3">
                {item.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        item.done ? 'text-slate-500 line-through' : 'text-slate-900'
                      }`}
                    >
                      {item.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpenKey(isOpen ? null : item.key)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      {item.done ? 'Add more' : 'Add'}
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{item.why}</p>
                  {isOpen && (
                    <div className="mt-3">
                      {item.howToGet && (
                        <p className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {item.howToGet}
                        </p>
                      )}
                      <InlineEvidenceUpload
                        assessmentId={assessmentId}
                        category={item.category}
                        subcategory={item.subcategory}
                        compact
                        tightChrome
                        hideHeader
                        uploadButtonLabel={`Upload ${item.label.toLowerCase()}`}
                        onFilesUploaded={() => onUploaded?.()}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
