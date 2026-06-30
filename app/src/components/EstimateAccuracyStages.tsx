import { Check } from 'lucide-react'

interface EstimateAccuracyStagesProps {
  /** A preliminary estimate exists (injury + liability). */
  hasEstimate: boolean
  /** The client has entered any self-reported economic figures. */
  economicsEntered: boolean
  /** Bills or medical records have been uploaded. */
  hasDocuments: boolean
  /** Medical specials are confirmed by complete documentation. */
  isVerified: boolean
}

const STAGES = [
  {
    title: 'Preliminary',
    blurb: 'Based on your injury and who was at fault.',
  },
  {
    title: 'Damages added',
    blurb: 'Your medical bills and lost wages are factored in.',
  },
  {
    title: 'Documented',
    blurb: 'Records and bills are attached to your case.',
  },
  {
    title: 'Verified',
    blurb: 'Specials confirmed by complete documentation.',
  },
]

const NEXT_HINTS = [
  'Add your medical bills and lost wages to move past a preliminary estimate.',
  'Upload your bills or treatment records to back up the numbers.',
  'Confirm your bills are complete to fully verify your estimate.',
]

// A four-stage tracker that shows the estimate getting more accurate as the
// client adds information. The number starts as a preliminary floor and "levels
// up" — which is both honest about confidence and a reason to keep engaging.
export default function EstimateAccuracyStages({
  hasEstimate,
  economicsEntered,
  hasDocuments,
  isVerified,
}: EstimateAccuracyStagesProps) {
  if (!hasEstimate) return null

  // currentStage is 1-based: how far the case has progressed.
  let currentStage = 1
  if (economicsEntered) currentStage = 2
  if (hasDocuments) currentStage = 3
  if (isVerified) currentStage = 4

  const nextHint = currentStage < 4 ? NEXT_HINTS[currentStage - 1] : null

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-900">Estimate accuracy</p>
        <p className="text-xs font-medium text-slate-500">
          Stage {currentStage} of {STAGES.length}
        </p>
      </div>

      <div className="flex items-start">
        {STAGES.map((stage, index) => {
          const stageNumber = index + 1
          const isComplete = stageNumber < currentStage
          const isCurrent = stageNumber === currentStage
          return (
            <div key={stage.title} className="flex-1 flex flex-col items-center text-center relative">
              {/* Connector line to the previous node */}
              {index > 0 && (
                <span
                  className={`absolute top-3 right-1/2 h-0.5 w-full ${
                    stageNumber <= currentStage ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isComplete
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : stageNumber}
              </span>
              <span
                className={`mt-2 text-[11px] font-medium ${
                  stageNumber <= currentStage ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {stage.title}
              </span>
              <span className="mt-0.5 hidden sm:block text-[10px] leading-tight text-slate-400 px-1">
                {stage.blurb}
              </span>
            </div>
          )
        })}
      </div>

      {nextHint && (
        <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span className="font-semibold">Next: </span>
          {nextHint}
        </p>
      )}
    </div>
  )
}
