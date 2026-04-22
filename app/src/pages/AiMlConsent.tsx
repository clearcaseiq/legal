import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AiMlConsent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('return') || '/assess'
  const step = searchParams.get('step')
  const returnPath = step ? `${returnTo}?step=${step}` : returnTo

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">AI/ML Consent</h1>
      <p className="text-sm text-gray-600">
        This consent allows automated analysis to generate non-binding insights about your case.
      </p>
      <div className="card text-sm text-gray-700 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">What this enables</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Automated analysis of the information you submit.</li>
            <li>Estimated case strength and value ranges.</li>
            <li>Insights to help you organize next steps.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">Important notes</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Outputs are informational and not legal advice.</li>
            <li>Results depend on the completeness of your inputs.</li>
            <li>De-identified data may be used to improve model quality.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">Human review</h2>
          <p>
            We may use human review to improve accuracy and safety with appropriate access controls.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">Your control</h2>
          <p>
            You can request deletion of your data or stop using the service at any time.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            localStorage.setItem('consent_read_ml', 'true')
            navigate(returnPath)
          }}
          className="btn-primary"
        >
          I have read this
        </button>
        <button
          onClick={() => navigate(returnPath)}
          className="btn-outline"
        >
          Back
        </button>
      </div>
    </div>
  )
}
