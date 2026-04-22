import { useState } from 'react'
import ConsentWorkflow from '../components/ConsentWorkflow'

export default function TestConsent() {
  const [showConsent, setShowConsent] = useState(false)

  const handleConsentComplete = (consents: any[]) => {
    console.log('Consents completed:', consents)
    setShowConsent(false)
    alert('Consents completed! Check console for details.')
  }

  const handleConsentCancel = () => {
    console.log('Consent cancelled')
    setShowConsent(false)
    alert('Consent cancelled')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Consent Workflow</h1>
        <p className="text-gray-600 mb-6">
          Click the button below to test the consent workflow with e-signature functionality.
        </p>
        
        <button
          onClick={() => setShowConsent(true)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Test Consent Workflow
        </button>

        {showConsent && (
          <ConsentWorkflow
            userId="test-user-id"
            requiredConsents={['terms', 'privacy', 'hipaa']}
            flow="combined"
            onComplete={handleConsentComplete}
            onCancel={handleConsentCancel}
          />
        )}
      </div>
    </div>
  )
}
