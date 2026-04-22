import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X, FileText, Shield, Mail, AlertTriangle, Download, Eye } from 'lucide-react'
import { getUserConsents, getConsentStatus, updateConsent } from '../lib/api'
import { createConsent } from '../lib/api-consent'
import ConsentWorkflow from '../components/ConsentWorkflow'
import Tooltip from '../components/Tooltip'

interface Consent {
  id: string
  consentType: string
  version: string
  documentId: string
  granted: boolean
  grantedAt: string | null
  revokedAt: string | null
  expiresAt: string | null
  signatureData: string | null
  signatureMethod: string | null
  consentText: string
  createdAt: string
  updatedAt: string
}

interface ConsentStatus {
  userId: string
  status: Array<{
    type: string
    granted: boolean
    grantedAt: string | null
    version: string
    expiresAt: string | null
    isExpired: boolean
  }>
  allRequiredConsentsGranted: boolean
  missingConsents: string[]
}

export default function ConsentManagement() {
  const [consents, setConsents] = useState<Consent[]>([])
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showConsentWorkflow, setShowConsentWorkflow] = useState(false)
  const [showConsentDetails, setShowConsentDetails] = useState<Consent | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadConsentData()
  }, [])

  const loadConsentData = async () => {
    try {
      setLoading(true)
      
      // Get user ID from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        navigate('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      const userId = user.id

      // Load consents and status in parallel
      const [consentsResponse, statusResponse] = await Promise.all([
        getUserConsents(),
        getConsentStatus(userId)
      ])

      if (consentsResponse.success) {
        setConsents(consentsResponse.data)
      }

      if (statusResponse.success) {
        setConsentStatus(statusResponse.data)
      }
    } catch (err: any) {
      setError('Failed to load consent data')
      console.error('Error loading consent data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeConsent = async (consentId: string) => {
    if (!confirm('Are you sure you want to revoke this consent? This may limit your ability to use certain features.')) {
      return
    }

    try {
      await updateConsent(consentId, {
        granted: false,
        revokedAt: new Date().toISOString()
      })

      // Reload consent data
      await loadConsentData()
    } catch (err: any) {
      setError('Failed to revoke consent')
      console.error('Error revoking consent:', err)
    }
  }

  const getConsentIcon = (type: string) => {
    switch (type) {
      case 'hipaa':
        return <Shield className="h-5 w-5 text-blue-600" />
      case 'terms':
        return <FileText className="h-5 w-5 text-green-600" />
      case 'privacy':
        return <Shield className="h-5 w-5 text-purple-600" />
      case 'marketing':
        return <Mail className="h-5 w-5 text-orange-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getConsentTitle = (type: string) => {
    switch (type) {
      case 'hipaa':
        return 'HIPAA Privacy Authorization'
      case 'terms':
        return 'Terms of Service'
      case 'privacy':
        return 'Privacy Policy'
      case 'marketing':
        return 'Marketing Communications'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getConsentStatusBadge = (consent: Consent) => {
    if (!consent.granted) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Revoked</span>
    }
    
    if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Expired</span>
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
  }

  const downloadSignature = (signatureData: string, consentType: string) => {
    if (signatureData.startsWith('data:image/')) {
      // Base64 image signature
      const link = document.createElement('a')
      link.download = `signature-${consentType}-${new Date().toISOString().split('T')[0]}.png`
      link.href = signatureData
      link.click()
    } else {
      // Text or timestamp signature
      const blob = new Blob([signatureData], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `signature-${consentType}-${new Date().toISOString().split('T')[0]}.txt`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const intakeRequiredConsentTypes = ['privacy', 'hipaa', 'terms']
  const effectiveMissingConsents = consentStatus
    ? consentStatus.missingConsents.filter(type => !intakeRequiredConsentTypes.includes(type))
    : []
  const requiredConsentsComplete = consentStatus
    ? consentStatus.allRequiredConsentsGranted || effectiveMissingConsents.length === 0
    : false

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading consent data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Consent Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your legal consents and privacy preferences
          </p>
          <div className="mt-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
            >
              Back to My Assessments
            </Link>
          </div>
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Privacy, HIPAA, and Terms consents are completed during intake. This page is for review and optional updates.
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Consent Status Overview */}
        {consentStatus && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Consent Status</h2>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {consentStatus.status.filter(s => s.granted && !s.isExpired).length}
                  </div>
                  <div className="text-sm text-gray-500">Active Consents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {effectiveMissingConsents.length}
                  </div>
                  <div className="text-sm text-gray-500">Missing Consents</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${requiredConsentsComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                    {requiredConsentsComplete ? '✓' : '⚠'}
                  </div>
                  <div className="text-sm text-gray-500">Compliance Status</div>
                </div>
              </div>
              
              {effectiveMissingConsents.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Missing Required Consents
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        You need to complete the following consents: {effectiveMissingConsents.join(', ')}
                      </p>
                      <button
                        onClick={() => setShowConsentWorkflow(true)}
                        className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                      >
                        Complete Consents →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consent List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Consents</h2>
              <button
                onClick={() => setShowConsentWorkflow(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Optional Consent
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {consents.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No consents on file yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your required intake consents are already completed. Optional consents will appear here.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowConsentWorkflow(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Optional Consent
                  </button>
                </div>
              </div>
            ) : (
              consents.map((consent) => (
                <div key={consent.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getConsentIcon(consent.consentType)}
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          {getConsentTitle(consent.consentType)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Version {consent.version} • {consent.signatureMethod || 'No signature'}
                          {consent.grantedAt && (
                            <span> • Granted on {new Date(consent.grantedAt).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getConsentStatusBadge(consent)}
                      
                      {consent.signatureData && (
                        <Tooltip content="Download signature">
                          <button
                            onClick={() => downloadSignature(consent.signatureData!, consent.consentType)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label="Download signature"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                      
                      <Tooltip content="View details">
                        <button
                          onClick={() => setShowConsentDetails(consent)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      
                      {consent.granted && (
                        <Tooltip content="Revoke consent">
                          <button
                            onClick={() => handleRevokeConsent(consent.id)}
                            className="text-red-400 hover:text-red-600"
                            aria-label="Revoke consent"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consent Workflow Modal */}
        {showConsentWorkflow && consentStatus && (
          <ConsentWorkflow
            userId={consentStatus.userId}
            requiredConsents={consentStatus.missingConsents}
            flow="combined"
            onComplete={async (newConsents) => {
              try {
                for (const consent of newConsents) {
                  await createConsent({
                    ...consent,
                    expiresAt:
                      consent.consentType === 'marketing'
                        ? undefined
                        : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                  })
                }
              } catch (e) {
                console.error('Failed to save consents', e)
              }
              await loadConsentData()
              setShowConsentWorkflow(false)
            }}
            onCancel={() => setShowConsentWorkflow(false)}
          />
        )}

        {/* Consent Details Modal */}
        {showConsentDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getConsentTitle(showConsentDetails.consentType)}
                </h3>
                <button
                  onClick={() => setShowConsentDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getConsentStatusBadge(showConsentDetails)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Version</label>
                    <div className="mt-1 text-sm text-gray-900">{showConsentDetails.version}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Granted Date</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {showConsentDetails.grantedAt 
                        ? new Date(showConsentDetails.grantedAt).toLocaleString()
                        : 'Not granted'
                      }
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Signature Method</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {showConsentDetails.signatureMethod || 'None'}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Consent Text
                  </label>
                  <div
                    className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto text-sm"
                    dangerouslySetInnerHTML={{
                      __html: showConsentDetails.consentText.replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
