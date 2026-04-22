import { useState } from 'react'
import { testAuth, clearAuth, getAuthStatus, createAssessment } from '../lib/api'

export default function AuthDebug() {
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')

  const checkAuthStatus = () => {
    const result = getAuthStatus()
    setStatus(result)
  }

  const testAuthentication = async () => {
    try {
      setError('')
      const result = await testAuth()
      setStatus({ ...status, authTest: result })
    } catch (err: any) {
      setError(`Auth test failed: ${err.message}`)
    }
  }

  const clearAuthentication = () => {
    clearAuth()
    setStatus(null)
    setError('')
  }

  const testAssessmentCreation = async () => {
    try {
      setError('')
      const testData = {
        claimType: 'auto',
        venue: { state: 'CA' },
        incident: {
          date: new Date().toISOString().split('T')[0],
          narrative: 'Test incident for debugging'
        },
        damages: {},
        consents: {
          tos: true,
          privacy: true,
          ml_use: true,
          hipaa: false
        }
      }
      
      console.log('🧪 Testing assessment creation with:', testData)
      const result = await createAssessment(testData)
      setStatus({ ...status, assessmentTest: `Success! Assessment ID: ${result}` })
    } catch (err: any) {
      setError(`Assessment test failed: ${err.message}`)
      console.error('Assessment creation error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Debug</h1>
        
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <button
                onClick={checkAuthStatus}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Check Auth Status
              </button>
              
              <button
                onClick={testAuthentication}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-2"
              >
                Test Authentication
              </button>
              
              <button
                onClick={clearAuthentication}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-2"
              >
                Clear Auth Data
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Assessment Test</h2>
            <button
              onClick={testAssessmentCreation}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Test Assessment Creation
            </button>
          </div>

          {status && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Status:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded">
              <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-yellow-700 space-y-1">
              <li>Click "Check Auth Status" to see what's in localStorage</li>
              <li>Click "Test Authentication" to verify your token works</li>
              <li>If auth fails, click "Clear Auth Data" and login again</li>
              <li>Click "Test Assessment Creation" to test the API call</li>
              <li>Check browser console (F12) for detailed logs</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Quick Fixes:</h3>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>If you see "Invalid token", click "Clear Auth Data"</li>
              <li>If you see "No token", login at <a href="/login" className="underline">/login</a></li>
              <li>Use email: test@example.com, password: password123</li>
              <li>If assessment creation fails, check the console logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
