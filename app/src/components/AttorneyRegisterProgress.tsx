const STEPS = [
  { num: 1, label: 'Account' },
  { num: 2, label: 'Practice Areas' },
  { num: 3, label: 'Preferences' },
  { num: 4, label: 'Capacity' },
  { num: 5, label: 'Verify' }
]

interface AttorneyRegisterProgressProps {
  currentStep: number
}

export default function AttorneyRegisterProgress({ currentStep }: AttorneyRegisterProgressProps) {
  return (
    <div className="mb-8">
      {/* Step labels */}
      <div className="flex justify-between items-center mb-2">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className={`text-xs font-medium ${
              step.num <= currentStep ? 'text-brand-600' : 'text-gray-400'
            }`}
          >
            Step {step.num} — {step.label}
          </div>
        ))}
      </div>
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
      {/* Short labels for bar */}
      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
        <span>Account</span>
        <span>Practice</span>
        <span>Preferences</span>
        <span>Capacity</span>
        <span>Verify</span>
      </div>
    </div>
  )
}
