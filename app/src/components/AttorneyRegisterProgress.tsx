import { useLanguage } from '../contexts/LanguageContext'

const STEP_KEYS = ['prog1', 'prog2', 'prog3', 'prog4']

interface AttorneyRegisterProgressProps {
  currentStep: number
}

export default function AttorneyRegisterProgress({ currentStep }: AttorneyRegisterProgressProps) {
  const { t } = useLanguage()
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex gap-1">
        {STEP_KEYS.map((key, i) => (
          <div
            key={key}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i + 1 <= currentStep ? 'bg-brand-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {/* Step labels */}
      <div className="mt-2 flex justify-between">
        {STEP_KEYS.map((key, i) => (
          <span
            key={key}
            className={`text-[11px] font-medium ${
              i + 1 === currentStep
                ? 'text-brand-600'
                : i + 1 < currentStep
                  ? 'text-brand-500'
                  : 'text-gray-400'
            }`}
          >
            {t(`attorneyReg.${key}`)}
          </span>
        ))}
      </div>
    </div>
  )
}
