import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadAttorneyLicense, lookupStateBarLicense, getAttorneyLicenseStatus } from '../lib/api'
import { US_STATES } from '../lib/constants'
import LicenseUploadResult from '../features/attorney/sections/LicenseUploadResult'
import type { LicenseDocumentCheck } from '../features/attorney/useAttorneyLicense'

type VerificationMethod = 'state_bar_lookup' | 'manual_upload'

export default function AttorneyLicenseUpload() {
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('state_bar_lookup')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [licenseStatus, setLicenseStatus] = useState<any>(null)
  const [documentCheck, setDocumentCheck] = useState<LicenseDocumentCheck | null>(null)
  const [draggingFile, setDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if license already uploaded
    loadLicenseStatus()
  }, [])

  const loadLicenseStatus = async () => {
    try {
      const status = await getAttorneyLicenseStatus()
      setLicenseStatus(status)
      if (status.hasLicense && status.licenseVerified) {
        // License already verified, can skip or show success
        setSuccess(true)
      }
    } catch (err: any) {
      console.error('Failed to load license status:', err)
    }
  }

  const handleStateBarLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!licenseNumber || !licenseState) {
      setError('Please enter both license number and state')
      setIsLoading(false)
      return
    }

    try {
      const response = await lookupStateBarLicense(licenseNumber, licenseState)
      setSuccess(true)
      setLicenseStatus(response.profile)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/attorney-dashboard')
      }, 2000)
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        (err.message?.includes('fetch')
          ? 'Could not reach the ClearCaseIQ API. Please confirm the API server is running and try again.'
          : 'Failed to verify license via state bar lookup')
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!selectedFile) {
      setError('Please select a license file to upload')
      setIsLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('licenseFile', selectedFile)
      if (licenseNumber) {
        formData.append('licenseNumber', licenseNumber)
      }
      if (licenseState) {
        formData.append('licenseState', licenseState)
      }
      formData.append('verificationMethod', 'manual_upload')

      const response = await uploadAttorneyLicense(formData)
      setSuccess(true)
      setLicenseStatus(response.profile)
      setDocumentCheck(response.documentCheck ?? null)

      // Only leave the page when there is nothing left to do. If the bar number
      // on the document did not verify, the attorney needs to read why and
      // correct it, and being bounced to the dashboard after two seconds means
      // never seeing it.
      if (response.profile?.licenseVerified) {
        setTimeout(() => {
          navigate('/attorney-dashboard')
        }, 2000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload license file')
    } finally {
      setIsLoading(false)
    }
  }

  // Shared by the picker and the drop zone so both apply the same limits.
  const selectFile = (file: File | null | undefined) => {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (JPEG, PNG, GIF)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    setSelectedFile(file)
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0])
  }

  if (success) {
    const verified = Boolean(licenseStatus?.licenseVerified)
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8">
            {verified ? (
              <div className="mb-4 text-center">
                <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : null}
            <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
              {verified ? 'License Verified' : 'License Document Saved'}
            </h2>

            {licenseStatus?.licenseVerificationMethod === 'state_bar_lookup' ? (
              <p className="mb-4 text-center text-gray-600">
                Your license has been verified via state bar lookup.
              </p>
            ) : (
              <LicenseUploadResult documentCheck={documentCheck} />
            )}

            {licenseStatus?.licenseNumber && (
              <p className="mt-4 text-center text-sm text-gray-500">
                License Number: {licenseStatus.licenseNumber} ({licenseStatus.licenseState})
              </p>
            )}

            {verified ? (
              <p className="mt-4 text-center text-sm text-gray-500">Redirecting to dashboard...</p>
            ) : (
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Try a different number or file
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/attorney-dashboard')}
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Continue to dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ClearCaseIQ</h1>
          <h2 className="text-2xl font-extrabold text-gray-900">Upload Attorney License</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please verify your attorney license to complete your registration
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Verification Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verification Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setVerificationMethod('state_bar_lookup')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  verificationMethod === 'state_bar_lookup'
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">State Bar Lookup</div>
                <div className="text-sm text-gray-500">
                  Automatically verify active California State Bar licenses
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVerificationMethod('manual_upload')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  verificationMethod === 'manual_upload'
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">Manual Upload</div>
                <div className="text-sm text-gray-500">
                  Upload a copy of your license document
                </div>
              </button>
            </div>
          </div>

          {/* State Bar Lookup Form */}
          {verificationMethod === 'state_bar_lookup' && (
            <form onSubmit={handleStateBarLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number *
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Enter your state bar license number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <select
                  value={licenseState}
                  onChange={(e) => setLicenseState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  required
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify License'}
                </button>
              </div>
            </form>
          )}

          {/* Manual Upload Form */}
          {verificationMethod === 'manual_upload' && (
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License File *
                </label>
                {/* The box advertised drag and drop with no drop handler, so the
                    browser took the drop and navigated away to the file. */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDraggingFile(true)
                  }}
                  onDragLeave={() => setDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDraggingFile(false)
                    selectFile(e.dataTransfer.files?.[0])
                  }}
                  className={`mt-1 border-2 border-dashed rounded-md transition-colors ${
                    draggingFile ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {/* Fills the box so the whole dashed area is clickable, and
                      opens the picker by ref — a label whose htmlFor named the
                      input it wrapped had its forwarded click bubble back out
                      and get forwarded again, which suppresses the dialog. */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-1 px-6 pt-5 pb-6 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <svg
                      className="h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">
                      <span className="font-medium text-brand-600">Upload a file</span> or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">PDF, PNG, JPG, GIF up to 10MB</span>
                    {selectedFile && (
                      <span className="mt-1 text-sm text-gray-700">Selected: {selectedFile.name}</span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number (Optional)
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Enter your license number if known"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State (Optional)
                </label>
                <select
                  value={licenseState}
                  onChange={(e) => setLicenseState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading || !selectedFile}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Uploading...' : 'Upload License'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => navigate('/attorney-dashboard')}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Skip for now — go to dashboard
            </button>
            <p className="text-center text-xs text-slate-500">
              You can verify your license later from Profile settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
