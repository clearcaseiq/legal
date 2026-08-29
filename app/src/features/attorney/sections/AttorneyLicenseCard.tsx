import { AlertTriangle, CheckCircle, Eye, Shield, ShieldAlert, Upload } from 'lucide-react'
import { US_STATES } from '../../../lib/constants'
import { getApiOrigin } from '../../../lib/runtimeEnv'
import type { useAttorneyLicense } from '../useAttorneyLicense'

type LicenseState = ReturnType<typeof useAttorneyLicense>

const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500'
const SUBMIT =
  'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed'

export default function AttorneyLicenseCard({
  handleLicenseFileChange,
  handleLicenseFileUpload,
  handleStateBarLookup,
  licenseError,
  licenseLoading,
  licenseMethod,
  licenseNumber,
  licenseState,
  licenseStatus,
  licenseSuccess,
  selectedLicenseFile,
  setLicenseError,
  setLicenseMethod,
  setLicenseNumber,
  setLicenseState,
}: LicenseState) {
  // The stored file is behind auth, so it is fetched with the bearer token and
  // handed to the browser as a blob rather than linked directly.
  const openLicenseFile = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLicenseError('Authentication required. Please log in again.')
        return
      }
      const apiUrl =
        getApiOrigin() || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
      const response = await fetch(`${apiUrl}${licenseStatus.licenseFileUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setLicenseError(errorData.error || 'Failed to load license file. Please try again.')
        return
      }
      const blobUrl = window.URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = blobUrl
      link.target = '_blank'
      link.download = licenseStatus.licenseFileName || 'license.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setLicenseError('Failed to load license file. Please try again.')
      console.error('Error loading license file:', err)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Attorney License</h3>
          <p className="mt-1 text-sm text-slate-500">Upload and verify your state bar license</p>
        </div>
        {licenseStatus?.licenseVerified ? (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">License Verified</span>
          </div>
        ) : null}
        {licenseStatus?.hasLicense && !licenseStatus?.licenseVerified ? (
          <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-1">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Pending Verification</span>
          </div>
        ) : null}
        {/* An unverified licence with nothing uploaded used to render no badge at
            all, so the card looked the same whether the licence had been checked
            or never supplied. Say so plainly instead. */}
        {!licenseStatus?.licenseVerified && !licenseStatus?.hasLicense ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">License not verified</span>
          </div>
        ) : null}
      </div>

      {licenseStatus?.hasLicense ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="mb-2 text-sm font-medium text-gray-900">Current License</h4>
              {licenseStatus.licenseNumber ? (
                <p className="text-sm text-gray-600">
                  License Number: <span className="font-medium">{licenseStatus.licenseNumber}</span>
                </p>
              ) : null}
              {licenseStatus.licenseState ? (
                <p className="text-sm text-gray-600">
                  State:{' '}
                  <span className="font-medium">
                    {US_STATES.find((state) => state.code === licenseStatus.licenseState)?.name ||
                      licenseStatus.licenseState}
                  </span>
                </p>
              ) : null}
              {licenseStatus.licenseVerificationMethod ? (
                <p className="text-sm text-gray-600">
                  Verification Method:{' '}
                  <span className="font-medium capitalize">
                    {licenseStatus.licenseVerificationMethod.replace(/_/g, ' ')}
                  </span>
                </p>
              ) : null}
              {licenseStatus.licenseVerifiedAt ? (
                <p className="text-sm text-gray-600">
                  Verified:{' '}
                  <span className="font-medium">
                    {new Date(licenseStatus.licenseVerifiedAt).toLocaleDateString()}
                  </span>
                </p>
              ) : null}
            </div>
            {licenseStatus.licenseFileUrl ? (
              <button
                onClick={() => void openLicenseFile()}
                className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-800"
              >
                <Eye className="mr-1 h-4 w-4" />
                View License
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {licenseSuccess ? (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            <p className="text-sm font-medium text-green-700">
              {licenseMethod === 'state_bar_lookup'
                ? 'License verified successfully via state bar lookup!'
                : 'License file uploaded successfully! It will be reviewed by our team.'}
            </p>
          </div>
        </div>
      ) : null}

      {licenseError ? (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-600">{licenseError}</p>
        </div>
      ) : null}

      <div className="mb-6">
        <label className="mb-3 block text-sm font-medium text-gray-700">Verification Method</label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setLicenseMethod('state_bar_lookup')}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              licenseMethod === 'state_bar_lookup'
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="mb-1 font-medium text-gray-900">State Bar Lookup</div>
            <div className="text-sm text-gray-500">Automatically verify active California State Bar licenses</div>
          </button>
          <button
            type="button"
            onClick={() => setLicenseMethod('manual_upload')}
            className={`rounded-lg border-2 p-4 text-left transition-colors ${
              licenseMethod === 'manual_upload'
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="mb-1 font-medium text-gray-900">Manual Upload</div>
            <div className="text-sm text-gray-500">Upload a copy of your license document</div>
          </button>
        </div>
      </div>

      {licenseMethod === 'state_bar_lookup' ? (
        <form onSubmit={handleStateBarLookup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">License Number *</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className={INPUT}
              placeholder="Enter your state bar license number"
              maxLength={40}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">State *</label>
            <select
              value={licenseState}
              onChange={(e) => setLicenseState(e.target.value)}
              className={INPUT}
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
          <button type="submit" disabled={licenseLoading} className={SUBMIT}>
            {licenseLoading ? 'Verifying...' : 'Verify License'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLicenseFileUpload} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">License File *</label>
            <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pb-6 pt-5 transition-colors hover:border-gray-400">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex justify-center text-sm text-gray-600">
                  <label
                    htmlFor="license-file-upload"
                    className="relative cursor-pointer rounded-md bg-white font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input
                      id="license-file-upload"
                      name="license-file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.gif"
                      onChange={handleLicenseFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, PNG, JPG, GIF up to 10MB</p>
                {selectedLicenseFile ? (
                  <p className="mt-2 text-sm text-gray-700">Selected: {selectedLicenseFile.name}</p>
                ) : null}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">License Number (Optional)</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className={INPUT}
              placeholder="Enter your license number if known"
              maxLength={40}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">State (Optional)</label>
            <select value={licenseState} onChange={(e) => setLicenseState(e.target.value)} className={INPUT}>
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={licenseLoading || !selectedLicenseFile} className={SUBMIT}>
            {licenseLoading ? 'Uploading...' : 'Upload License'}
          </button>
        </form>
      )}
    </div>
  )
}
