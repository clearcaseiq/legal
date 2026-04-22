import { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface Step {
  key: string
  title: string
  description: string
}

interface StepperProps {
  steps: Step[]
  currentStep: string
  children: ReactNode
}

export default function Stepper({ steps, currentStep, children }: StepperProps) {
  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStepIndex
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  index <= currentStepIndex ? 'text-primary-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="mx-4 h-5 w-5 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {steps[currentStepIndex]?.title}
          </h2>
          <p className="text-gray-600">{steps[currentStepIndex]?.description}</p>
        </div>

        {children}
      </div>
    </div>
  )
}
