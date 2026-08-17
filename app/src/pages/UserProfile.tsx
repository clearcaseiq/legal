import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { updateProfile, uploadPlaintiffAvatar, deletePlaintiffAvatar } from '../lib/api'
import { User, Save, AlertCircle, CheckCircle, Activity, Upload, Trash2 } from 'lucide-react'
import { getStoredUser } from '../lib/auth'
import { BackButton } from '../features/shared/ui'
import { updateCachedPlaintiffUser, usePlaintiffSessionSummary } from '../hooks/usePlaintiffSessionSummary'
import { formatPhoneInput, validatePhoneField } from '../lib/phone'
import { useLanguage } from '../contexts/LanguageContext'
import { getApiOrigin } from '../lib/runtimeEnv'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string | null
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

function resolveAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null
  if (/^(https?:)?\/\//.test(avatar) || avatar.startsWith('data:')) return avatar
  const origin = getApiOrigin()
  if (!origin) return avatar
  return `${origin}${avatar.startsWith('/') ? '' : '/'}${avatar}`
}

function syncStoredUserAvatar(avatar: string | null | undefined) {
  const user = getStoredUser<Record<string, unknown>>('user')
  if (!user) return
  user.avatar = avatar ?? null
  localStorage.setItem('user', JSON.stringify(user))
  window.dispatchEvent(new Event('clearcaseiq:user-updated'))
}

export default function UserProfile() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data, loading: sessionLoading, error: sessionError } = usePlaintiffSessionSummary(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  })

  useEffect(() => {
    if (data?.user) {
      const userData = data.user
      setProfile(userData)
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || ''
      })
      setLoading(false)
    }
    if (!data?.user && !sessionLoading) {
      setLoading(false)
    }
    if (sessionError) {
      setError('Failed to load profile. Please try again.')
    }
  }, [data?.user, sessionError, sessionLoading])

  const applyUserUpdate = (updated: UserProfile, successMessage: string) => {
    setProfile(updated)
    updateCachedPlaintiffUser(updated)
    syncStoredUserAvatar(updated.avatar)
    setSuccess(successMessage)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const phoneError = validatePhoneField(formData.phone)
    if (phoneError) {
      setError(phoneError)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await updateProfile(formData)
      applyUserUpdate(updated, 'Profile updated successfully!')
      setEditing(false)

      const user = getStoredUser<Record<string, unknown>>('user')
      if (user) {
        user.firstName = updated.firstName
        user.lastName = updated.lastName
        user.phone = updated.phone
        user.avatar = updated.avatar ?? user.avatar ?? null
        localStorage.setItem('user', JSON.stringify(user))
        window.dispatchEvent(new Event('clearcaseiq:user-updated'))
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err)
      setError(err.response?.data?.error || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || ''
      })
    }
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  const handlePhotoFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !profile) return

    const looksLikeImage =
      file.type.startsWith('image/') ||
      !file.type ||
      file.type === 'application/octet-stream'
    const allowedExt = /\.(jpe?g|png|gif|webp)$/i.test(file.name || '')
    if (!looksLikeImage && !allowedExt) {
      setError('Profile photo must be an image (JPEG, PNG, GIF, or WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be 5MB or smaller.')
      return
    }

    try {
      setUploadingPhoto(true)
      setError(null)
      const updated = await uploadPlaintiffAvatar(file)
      applyUserUpdate(
        { ...profile, ...updated, avatar: updated?.avatar ?? null },
        t('common.photoUpdated')
      )
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to upload profile photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!profile?.avatar) return
    try {
      setRemovingPhoto(true)
      setError(null)
      const updated = await deletePlaintiffAvatar()
      applyUserUpdate(
        { ...profile, ...updated, avatar: null },
        t('common.photoRemoved')
      )
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove profile photo.')
    } finally {
      setRemovingPhoto(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600 mb-6">Unable to load your profile.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const avatarUrl = resolveAvatarUrl(profile.avatar)
  const avatarInitial = (profile.firstName || profile.email || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="max-w-[1600px] mx-auto py-8">
      {/* Navigation Header */}
      <div className="mb-6">
        <BackButton to="/dashboard" label="Back to Dashboard" className="mb-4" />
        <div className="flex items-center gap-4">
          <Link
            to="/case-tracker"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Activity className="h-4 w-4 mr-2" />
            Case Tracker
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('common.myProfile')}</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your account information</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </div>
            </div>
          )}

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-28 w-28 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-bold text-white">
                  {avatarInitial}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Profile photo</p>
              <p className="text-xs text-gray-500">JPEG, PNG, GIF, or WebP · max 5MB</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
                className="hidden"
                onChange={handlePhotoFileSelected}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto || removingPhoto}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingPhoto
                    ? t('common.uploadingPhoto')
                    : profile.avatar
                      ? t('common.changePhoto')
                      : t('common.uploadPhoto')}
                </button>
                {profile.avatar && (
                  <button
                    type="button"
                    onClick={() => void handleRemovePhoto()}
                    disabled={uploadingPhoto || removingPhoto}
                    className="inline-flex items-center px-3 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {removingPhoto ? 'Removing...' : t('common.removePhoto')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                ) : (
                  <p className="text-gray-900">{profile.firstName || 'Not provided'}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                ) : (
                  <p className="text-gray-900">{profile.lastName || 'Not provided'}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <p className="text-gray-900 flex items-center">
                  {profile.email}
                  {profile.emailVerified && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {new Date(profile.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
