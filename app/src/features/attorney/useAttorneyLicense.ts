import { useCallback, useEffect, useState } from 'react'
import {
  getAttorneyLicenseStatus,
  lookupStateBarLicense,
  uploadAttorneyLicense,
} from '../../lib/api'

const ALLOWED_LICENSE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
const MAX_LICENSE_BYTES = 10 * 1024 * 1024

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

  const handleLicenseFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
    selectedLicenseFile,
    setLicenseError,
    setLicenseMethod,
    setLicenseNumber,
    setLicenseState,
  }
}
