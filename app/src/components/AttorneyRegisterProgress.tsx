const STEPS = [
  { num: 1, label: 'Account Information' },
  { num: 2, label: 'Practice & Service Area' },
  { num: 3, label: 'Capacity & Availability' },
  { num: 4, label: 'Verify' }
]

interface AttorneyRegisterProgressProps {
  currentStep: number
}

export default function AttorneyRegisterProgress({ currentStep }: AttorneyRegisterProgressProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex gap-1">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className={`h-2 flex-1 rounded-full transition-colors ${
              step.num <= currentStep ? 'bg-brand-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {/* Step labels */}
      <div className="mt-2 flex justify-between">
        {STEPS.map((step) => (
          <span
            key={step.num}
            className={`text-[11px] font-medium ${
              step.num === currentStep
                ? 'text-brand-600'
                : step.num < currentStep
                  ? 'text-brand-500'
                  : 'text-gray-400'
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}
