import { useCallback, useEffect, useState } from 'react'
import {
  getAttorneyLicenseStatus,
  lookupStateBarLicense,
  uploadAttorneyLicense,
} from '../../lib/api'

const ALLOWED_LICENSE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
const MAX_LICENSE_BYTES = 10 * 1024 * 1024

/**
 * What the server made of an uploaded licence document.
 *
 * `null` from the server means no bar number could be read off it, which is a
 * different outcome from a number that was read and did not verify — the first
 * needs the attorney to type the number, the second needs them to correct it.
 */
export interface LicenseDocumentCheck {
  licenseNumber: string
  state: string
  verified: boolean
  status: string | null
  recordName: string | null
  nameMatch: 'match' | 'mismatch' | 'unknown'
}

/**
 * Bar-license verification, separate from the profile itself.
 *
 * Verification writes to the attorney record, not through `PUT /profile`, so it
 * has its own load and its own error surface. `onVerified` lets the profile
 * reload once a lookup or upload lands, since verification changes fields the
 * profile displays.
 */
export function useAttorneyLicense(onVerified?: () => void | Promise<void>) {
  const [licenseStatus, setLicenseStatus] = useState<any>(null)
  const [licenseMethod, setLicenseMethod] = useState<'state_bar_lookup' | 'manual_upload'>('state_bar_lookup')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [selectedLicenseFile, setSelectedLicenseFile] = useState<File | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(false)
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [licenseSuccess, setLicenseSuccess] = useState(false)
  const [licenseDocumentCheck, setLicenseDocumentCheck] = useState<LicenseDocumentCheck | null>(null)

  const loadLicenseStatus = useCallback(async () => {
    try {
      const status = await getAttorneyLicenseStatus()
      setLicenseStatus(status)
      if (status?.licenseNumber) setLicenseNumber(status.licenseNumber)
      if (status?.licenseState) setLicenseState(status.licenseState)
    } catch (err) {
      console.error('Failed to load license status:', err)
    }
  }, [])

  useEffect(() => {
    void loadLicenseStatus()
  }, [loadLicenseStatus])

  useEffect(() => {
    if (!licenseSuccess) return
    const timer = setTimeout(() => setLicenseSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [licenseSuccess])

  const handleStateBarLookup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!licenseNumber || !licenseState) {
        setLicenseError('Please enter both license number and state')
        return
      }
      setLicenseLoading(true)
      setLicenseError(null)
      setLicenseSuccess(false)
      try {
        const response = await lookupStateBarLicense(licenseNumber, licenseState)
        setLicenseSuccess(true)
        setLicenseStatus(response.profile)
        await loadLicenseStatus()
        await onVerified?.()
      } catch (err: any) {
        setLicenseError(
          err.response?.data?.error ||
            (err.message?.includes('fetch')
              ? 'Could not reach the ClearCaseIQ API. Please confirm the API server is running and try again.'
              : 'Failed to verify license via state bar lookup'),
        )
      } finally {
        setLicenseLoading(false)
      }
    },
    [licenseNumber, licenseState, loadLicenseStatus, onVerified],
  )

  const handleLicenseFileUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedLicenseFile) {
        setLicenseError('Please select a license file to upload')
        return
      }
      setLicenseLoading(true)
      setLicenseError(null)
      setLicenseSuccess(false)
      try {
        const formData = new FormData()
        formData.append('licenseFile', selectedLicenseFile)
        if (licenseNumber) formData.append('licenseNumber', licenseNumber)
        if (licenseState) formData.append('licenseState', licenseState)
        formData.append('verificationMethod', 'manual_upload')

        const response = await uploadAttorneyLicense(formData)
        setLicenseSuccess(true)
        setLicenseStatus(response.profile)
        setSelectedLicenseFile(null)
        // What the server made of the document, so the confirmation can report
        // the real outcome rather than promising a review.
        setLicenseDocumentCheck(response.documentCheck ?? null)

        // A bar number typed alongside the document is still checkable, and
        // checking it is the only thing here that can verify anything: nothing
        // reads the uploaded file. Leaving it unchecked meant an attorney who
        // chose Manual Upload and supplied a valid number stayed unverified
        // waiting on a review of a document no process looks at.
        //
        // Runs after the upload, not before: the upload writes
        // `licenseVerificationMethod: 'manual_upload'`, so the reverse order
        // would attribute a licence the lookup verified to the document.
        if (licenseNumber && licenseState) {
          try {
            await lookupStateBarLicense(licenseNumber, licenseState)
          } catch (err: any) {
            // The file did upload, so this is not an upload failure. Surfacing
            // the lookup's own message alongside the success notice says what
            // actually happened: document stored, number not verified.
            setLicenseError(err.response?.data?.error || null)
          }
        }

        await loadLicenseStatus()
        await onVerified?.()
      } catch (err: any) {
        setLicenseError(err.response?.data?.error || 'Failed to upload license file')
      } finally {
        setLicenseLoading(false)
      }
    },
    [licenseNumber, licenseState, loadLicenseStatus, onVerified, selectedLicenseFile],
  )

  /**
   * Accept a file from wherever it came from.
   *
   * Split out from the change handler so a dropped file goes through the same
   * type and size checks as a picked one, rather than the drop path growing its
   * own copy of them.
   */
  const selectLicenseFile = useCallback((file: File | null | undefined) => {
    if (!file) return
    if (!ALLOWED_LICENSE_TYPES.includes(file.type)) {
      setLicenseError('Please upload a PDF or image file (JPEG, PNG, GIF)')
      return
    }
    if (file.size > MAX_LICENSE_BYTES) {
      setLicenseError('File size must be less than 10MB')
      return
    }
    setSelectedLicenseFile(file)
    setLicenseError(null)
  }, [])

  const handleLicenseFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      selectLicenseFile(e.target.files?.[0])
    },
    [selectLicenseFile],
  )

  return {
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
    licenseDocumentCheck,
    selectLicenseFile,
    selectedLicenseFile,
    setLicenseError,
    setLicenseMethod,
    setLicenseNumber,
    setLicenseState,
  }
}
