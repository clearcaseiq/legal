import { useCallback, useEffect, useState } from 'react'
import {
  getAttorneyLicenseStatus,
  getMyAttorneyProfile,
  lookupStateBarLicense,
  updateAttorneyProfile,
  uploadAttorneyLicense,
} from '../lib/api'

type SetPageError = (message: string | null) => void

export function useAttorneyProfileLicense(setPageError: SetPageError) {
  const [profile, setProfile] = useState<any | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [licenseStatus, setLicenseStatus] = useState<any>(null)
  const [licenseMethod, setLicenseMethod] = useState<'state_bar_lookup' | 'manual_upload'>('state_bar_lookup')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [selectedLicenseFile, setSelectedLicenseFile] = useState<File | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(false)
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [licenseSuccess, setLicenseSuccess] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true)
      const profileData = await getMyAttorneyProfile()
      setProfile({
        ...profileData,
        responseTimeHours: profileData?.responseTimeHours ?? profileData?.attorney?.responseTimeHours ?? 24,
      })
    } catch (err: any) {
      console.error('Failed to load profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const loadLicenseStatus = useCallback(async () => {
    try {
      const status = await getAttorneyLicenseStatus()
      setLicenseStatus(status)
      if (status.licenseNumber) {
        setLicenseNumber(status.licenseNumber)
      }
      if (status.licenseState) {
        setLicenseState(status.licenseState)
      }
    } catch (err: any) {
      console.error('Failed to load license status:', err)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
    void loadLicenseStatus()
  }, [loadLicenseStatus, loadProfile])

  const handleStateBarLookup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLicenseLoading(true)
    setLicenseError(null)
    setLicenseSuccess(false)

    if (!licenseNumber || !licenseState) {
      setLicenseError('Please enter both license number and state')
      setLicenseLoading(false)
      return
    }

    try {
      const response = await lookupStateBarLicense(licenseNumber, licenseState)
      setLicenseSuccess(true)
      setLicenseStatus(response.profile)
      await loadLicenseStatus()
      await loadProfile()
      setTimeout(() => setLicenseSuccess(false), 3000)
    } catch (err: any) {
      setLicenseError(err.response?.data?.error || 'Failed to verify license via state bar lookup')
    } finally {
      setLicenseLoading(false)
    }
  }, [licenseNumber, licenseState, loadLicenseStatus, loadProfile])

  const handleLicenseFileUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLicenseLoading(true)
    setLicenseError(null)
    setLicenseSuccess(false)

    if (!selectedLicenseFile) {
      setLicenseError('Please select a license file to upload')
      setLicenseLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('licenseFile', selectedLicenseFile)
      if (licenseNumber) {
        formData.append('licenseNumber', licenseNumber)
      }
      if (licenseState) {
        formData.append('licenseState', licenseState)
      }
      formData.append('verificationMethod', 'manual_upload')

      const response = await uploadAttorneyLicense(formData)
      setLicenseSuccess(true)
      setLicenseStatus(response.profile)
      setSelectedLicenseFile(null)
      await loadLicenseStatus()
      await loadProfile()
      setTimeout(() => setLicenseSuccess(false), 3000)
    } catch (err: any) {
      setLicenseError(err.response?.data?.error || 'Failed to upload license file')
    } finally {
      setLicenseLoading(false)
    }
  }, [licenseNumber, licenseState, loadLicenseStatus, loadProfile, selectedLicenseFile])

  const handleLicenseFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setLicenseError('Please upload a PDF or image file (JPEG, PNG, GIF)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setLicenseError('File size must be less than 10MB')
        return
      }
      setSelectedLicenseFile(file)
      setLicenseError(null)
    }
  }, [])

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return

    try {
      setProfileLoading(true)
      setPageError(null)

      const specialties = profile.specialties ? JSON.parse(profile.specialties) : []
      const languages = profile.languages ? JSON.parse(profile.languages) : []
      const firmLocations = profile.firmLocations ? JSON.parse(profile.firmLocations) : null
      const jurisdictions = profile.jurisdictions ? JSON.parse(profile.jurisdictions) : null
      const excludedCaseTypes = profile.excludedCaseTypes ? JSON.parse(profile.excludedCaseTypes) : null

      let intakeHours = null
      if (profile.intakeHours) {
        if (profile.intakeHours === '24/7') {
          intakeHours = '24/7'
        } else {
          try {
            intakeHours = JSON.parse(profile.intakeHours)
          } catch {
            intakeHours = profile.intakeHours
          }
        }
      }

      const updateData = {
        bio: profile.bio || null,
        photoUrl: profile.photoUrl || null,
        specialties,
        languages,
        responseTimeHours: Number(profile.responseTimeHours ?? profile.attorney?.responseTimeHours ?? 24),
        yearsExperience: profile.yearsExperience || 0,
        firmName: profile.firmName || null,
        firmLocations,
        jurisdictions,
        minInjurySeverity: profile.minInjurySeverity !== null && profile.minInjurySeverity !== undefined ? profile.minInjurySeverity : null,
        excludedCaseTypes,
        minDamagesRange: profile.minDamagesRange !== null && profile.minDamagesRange !== undefined ? profile.minDamagesRange : null,
        maxDamagesRange: profile.maxDamagesRange !== null && profile.maxDamagesRange !== undefined ? profile.maxDamagesRange : null,
        maxCasesPerWeek: profile.maxCasesPerWeek !== null && profile.maxCasesPerWeek !== undefined ? profile.maxCasesPerWeek : null,
        maxCasesPerMonth: profile.maxCasesPerMonth !== null && profile.maxCasesPerMonth !== undefined ? profile.maxCasesPerMonth : null,
        intakeHours,
        pricingModel: profile.pricingModel || null,
        paymentModel: profile.paymentModel || null,
        subscriptionTier: profile.subscriptionTier || null,
      }

      console.log('Saving profile data:', updateData)
      await updateAttorneyProfile(updateData)
      setPageError(null)
      setEditing(false)
      await loadProfile()

      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50'
      successMsg.textContent = 'Profile saved successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => {
        document.body.removeChild(successMsg)
      }, 3000)
    } catch (err: any) {
      console.error('Failed to save profile:', err)
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save profile changes'
      setPageError(errorMessage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setProfileLoading(false)
    }
  }, [loadProfile, profile, setPageError])

  return {
    editing,
    handleLicenseFileChange,
    handleLicenseFileUpload,
    handleSaveProfile,
    handleStateBarLookup,
    licenseError,
    licenseLoading,
    licenseMethod,
    licenseNumber,
    licenseState,
    licenseStatus,
    licenseSuccess,
    profile,
    profileLoading,
    selectedLicenseFile,
    setEditing,
    setLicenseError,
    setLicenseMethod,
    setLicenseNumber,
    setLicenseState,
    setProfile,
  }
}
