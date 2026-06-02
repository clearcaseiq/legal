type AttorneyRegisterBenefitsProps = {
  currentStep: number
  completionPercent: number
}

const STEP_LABELS = ['Create account', 'Select practice areas', 'Choose service area', 'Choose capacity', 'Verify license']

export default function AttorneyRegisterBenefits({ currentStep, completionPercent }: AttorneyRegisterBenefitsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-brand-700">Step {currentStep} of 5</p>
      <h4 className="mt-1 font-semibold text-gray-900">{STEP_LABELS[currentStep - 1]}</h4>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>{completionPercent}% complete</span>
          <span>Finish setup</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${completionPercent}%` }} />
        </div>
      </div>
      <div className="mt-5 rounded-lg bg-brand-50 p-4">
        <p className="text-sm font-semibold text-brand-900">After verification you'll be able to:</p>
        <ul className="mt-3 space-y-2 text-sm text-brand-800">
          <li>✓ Receive matched cases</li>
          <li>✓ Review case intelligence</li>
          <li>✓ Contact plaintiffs directly</li>
        </ul>
      </div>
      <div className="mt-5 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</p>
        <p className="mt-2 text-sm font-semibold text-gray-900">3 New Cases Available</p>
        <div className="mt-3 space-y-2 text-xs text-gray-600">
          <p>Auto Accident - Est. $18k-$35k</p>
          <p>Slip & Fall - Est. $25k-$50k</p>
          <p>Dog Bite - Est. $12k-$20k</p>
        </div>
      </div>
    </div>
  )
}
