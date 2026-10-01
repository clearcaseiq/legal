import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle, Loader2, Lock, Trash2, Upload } from 'lucide-react'
import { BackButton } from '../features/shared/ui'
import { US_STATES } from '../lib/constants'
import { validatePhoneField } from '../lib/phone'
import PhoneInput from '../components/PhoneInput'
import { resolveUploadedPhotoUrl } from '../lib/avatar'
import {
  createFirmTemplate,
  getFirmIntakeSettings,
  getFirmTemplates,
  removeFirmLogo,
  updateFirm,
  updateFirmIntakeSettings,
  uploadFirmLogo,
  uploadFirmTemplateFile,
  type FirmTemplate,
  type WelcomePacketContents,
} from '../lib/api'
import { invalidateFirmDashboardSummary, useFirmDashboardSummary } from '../hooks/useFirmDashboardSummary'

interface FirmForm {
  name: string
  primaryEmail: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  zip: string
}

const EMPTY_FORM: FirmForm = {
  name: '',
  primaryEmail: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  zip: '',
}

export default function FirmSettings() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useFirmDashboardSummary()

  const [form, setForm] = useState<FirmForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [autoSendRetainer, setAutoSendRetainer] = useState(false)
  const [intakeSaving, setIntakeSaving] = useState(false)
  const [intakeMsg, setIntakeMsg] = useState<string | null>(null)
  const [packet, setPacket] = useState<WelcomePacketContents>({ retainer: true, hipaa: true, templateIds: [] })
  const [packetTemplates, setPacketTemplates] = useState<FirmTemplate[]>([])
  const [packetSaving, setPacketSaving] = useState(false)
  const [autoSendWelcome, setAutoSendWelcome] = useState(true)
  const [packetMsg, setPacketMsg] = useState<string | null>(null)
  const packetUploadRef = useRef<HTMLInputElement>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const firm = data?.firm
  const canEdit = useMemo(() => {
    const permissions: string[] = data?.workspace?.permissions || []
    const role: string = data?.workspace?.currentRole || ''
    return role === 'firm_admin' || permissions.includes('manage_users')
  }, [data])

  // Prefill the form once firm data is available.
  useEffect(() => {
    if (!firm) return
    setForm({
      name: firm.name || '',
      primaryEmail: firm.primaryEmail || '',
      phone: firm.phone || '',
      website: firm.website || '',
      address: firm.address || '',
      city: firm.city || '',
      state: firm.state || '',
      zip: firm.zip || '',
    })
  }, [firm])

  useEffect(() => {
    if (!firm) return
    getFirmIntakeSettings()
      .then((s) => {
        setAutoSendRetainer(Boolean(s.autoSendRetainerOnAcquire))
        setAutoSendWelcome(s.autoSendWelcomePacketOnAcquire !== false)
        if (s.welcomePacket) setPacket(s.welcomePacket)
      })
      .catch(() => setAutoSendRetainer(false))
    getFirmTemplates()
      .then((res) => setPacketTemplates(res.templates || []))
      .catch(() => setPacketTemplates([]))
  }, [firm])

  // Only templates that can actually be sent for signature: a PDF, or body text
  // that is rendered to one.
  const sendableTemplates = useMemo(
    () => packetTemplates.filter((t) => t.isActive && (t.isPdf || Boolean(t.body?.trim()))),
    [packetTemplates],
  )

  const savePacket = async (next: WelcomePacketContents, message = 'Welcome packet saved.') => {
    const previous = packet
    setPacket(next)
    setPacketMsg(null)
    setPacketSaving(true)
    try {
      const res = await updateFirmIntakeSettings({ welcomePacket: next })
      setPacket(res.welcomePacket)
      setPacketMsg(message)
    } catch (err: any) {
      setPacket(previous)
      setPacketMsg(err?.response?.data?.error || 'Failed to save the welcome packet.')
    } finally {
      setPacketSaving(false)
    }
  }

  const toggleTemplate = (id: string) => {
    const has = packet.templateIds.includes(id)
    void savePacket({
      ...packet,
      templateIds: has ? packet.templateIds.filter((t) => t !== id) : [...packet.templateIds, id],
    })
  }

  const uploadPacketDocument = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setPacketMsg('Upload a PDF so it can be sent for e-signature.')
      return
    }
    setPacketMsg(null)
    setPacketSaving(true)
    try {
      const name = file.name.replace(/\.pdf$/i, '').trim() || 'Welcome packet document'
      const created = await createFirmTemplate({ name, category: 'onboarding' })
      const withFile = await uploadFirmTemplateFile(created.id, file)
      setPacketTemplates((prev) => [...prev, withFile])
      await savePacket(
        { ...packet, templateIds: [...packet.templateIds, withFile.id] },
        `Added "${withFile.name}" to the welcome packet and to Templates.`,
      )
    } catch (err: any) {
      setPacketMsg(err?.response?.data?.error || 'Failed to upload the document.')
    } finally {
      setPacketSaving(false)
    }
  }

  const packetCount =
    (packet.retainer ? 1 : 0) +
    (packet.hipaa ? 1 : 0) +
    packet.templateIds.filter((id) => sendableTemplates.some((t) => t.id === id)).length

  const updateField = (key: keyof FirmForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveSuccess(false)
  }

  const logoUrl = resolveUploadedPhotoUrl(firm?.logoUrl)

  // The logo saves on its own rather than with the form below: an upload is a
  // single deliberate action, and holding the file until "Save Changes" would
  // leave the preview showing something that is not stored yet.
  const runLogoChange = async (action: () => Promise<unknown>) => {
    setLogoError(null)
    setLogoBusy(true)
    try {
      await action()
      invalidateFirmDashboardSummary()
      await refresh(true)
    } catch (err: any) {
      setLogoError(err?.response?.data?.error || err?.message || 'Failed to update the firm logo.')
    } finally {
      setLogoBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)

    if (!form.name.trim()) {
      setSaveError('Firm name is required.')
      return
    }
    if (form.primaryEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryEmail.trim())) {
      setSaveError('Please enter a valid email address.')
      return
    }
    const phoneError = validatePhoneField(form.phone)
    if (phoneError) {
      setSaveError(phoneError)
      return
    }

    try {
      setSaving(true)
      await updateFirm({
        name: form.name.trim(),
        primaryEmail: form.primaryEmail.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
      })
      invalidateFirmDashboardSummary()
      await refresh(true)
      setSaveSuccess(true)
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Failed to save firm settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !firm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading firm settings...</p>
        </div>
      </div>
    )
  }

  if (!firm) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center">
            <Building2 className="h-5 w-5 text-amber-600 mr-2" />
            <h3 className="text-lg font-medium text-amber-900">Firm settings are not available yet</h3>
          </div>
          <p className="mt-2 text-sm text-amber-800">
            {error === 'No law firm associated with this attorney'
              ? 'This attorney account is not linked to a law firm, so firm settings are unavailable.'
              : 'We could not load your firm details. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/attorney-dashboard')}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Back to Attorney Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <BackButton onClick={() => navigate('/firm-dashboard')} label="Back to Firm Dashboard" />
      </div>

      <div className="flex items-center space-x-4 mb-8">
        <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-brand-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Firm Settings</h1>
          <p className="text-sm text-gray-600">Manage your firm’s public profile and contact details.</p>
        </div>
      </div>

      {!canEdit && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Lock className="h-5 w-5 text-slate-500 mt-0.5" />
          <p className="text-sm text-slate-600">
            You have read-only access to firm settings. Ask a firm admin to make changes.
          </p>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">Firm logo</h3>
        <p className="mt-1 text-sm text-gray-600">
          Shown on your firm’s public profile and in the attorney marketplace listing.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${firm.name} logo`}
              className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  // Reset first so picking the same file twice still fires onChange.
                  e.target.value = ''
                  if (file) void runLogoChange(() => uploadFirmLogo(file))
                }}
              />
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUrl ? 'Replace logo' : 'Upload logo'}
              </button>
              {firm.logoUrl && (
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => void runLogoChange(removeFirmLogo)}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500">JPEG, PNG, GIF, WebP, or SVG, up to 5MB.</p>
        {logoError ? <p className="mt-2 text-xs text-red-600">{logoError}</p> : null}
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">Intake automation</h3>
        <p className="mt-1 text-sm text-gray-600">
          After a case is purchased, automatically send the contingency-fee retainer for e-signature (Dropbox Sign /
          your connected provider). When off, attorneys get a “Send retainer to client” task instead.
        </p>
        <label className="mt-4 flex items-start gap-3 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={autoSendRetainer}
            disabled={!canEdit || intakeSaving}
            onChange={async (e) => {
              const next = e.target.checked
              setAutoSendRetainer(next)
              setIntakeMsg(null)
              setIntakeSaving(true)
              try {
                const res = await updateFirmIntakeSettings({ autoSendRetainerOnAcquire: next })
                setAutoSendRetainer(Boolean(res.autoSendRetainerOnAcquire))
                setIntakeMsg('Intake setting saved.')
              } catch (err: any) {
                setAutoSendRetainer(!next)
                setIntakeMsg(err?.response?.data?.error || 'Failed to save intake setting.')
              } finally {
                setIntakeSaving(false)
              }
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="font-semibold">Auto-send retainer on acquire</span>
            <span className="block text-xs text-gray-500">Requires a connected e-signature provider and client email.</span>
          </span>
        </label>
        {intakeMsg ? <p className="mt-2 text-xs text-slate-600">{intakeMsg}</p> : null}

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Welcome packet</h4>
              <p className="mt-1 text-xs text-gray-600">
                Choose the documents emailed to the client for e-signature. Every new case gets a “Send client welcome
                packet” task listing these documents.
              </p>
            </div>
            {canEdit && (
              <>
                <input
                  ref={packetUploadRef}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void uploadPacketDocument(file)
                  }}
                />
                <button
                  type="button"
                  disabled={packetSaving}
                  onClick={() => packetUploadRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {packetSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload document
                </button>
              </>
            )}
          </div>

          <label className="mt-4 flex items-start gap-3 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={autoSendWelcome}
              disabled={!canEdit || packetSaving}
              onChange={async (e) => {
                const next = e.target.checked
                setAutoSendWelcome(next)
                setPacketMsg(null)
                setPacketSaving(true)
                try {
                  const res = await updateFirmIntakeSettings({ autoSendWelcomePacketOnAcquire: next })
                  setAutoSendWelcome(res.autoSendWelcomePacketOnAcquire !== false)
                  setPacketMsg('Welcome packet setting saved.')
                } catch (err: any) {
                  setAutoSendWelcome(!next)
                  setPacketMsg(err?.response?.data?.error || 'Failed to save the welcome packet setting.')
                } finally {
                  setPacketSaving(false)
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="font-semibold">Send the welcome packet when a case is purchased</span>
              <span className="block text-xs text-gray-500">
                The client gets the signing link by email, text and on their dashboard. If it can’t be sent (no client
                email or signature tool), the task stays open for your team.
              </span>
            </span>
          </label>

          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {[
              { key: 'retainer' as const, label: 'Retainer agreement', hint: 'Built-in contingency-fee agreement' },
              { key: 'hipaa' as const, label: 'HIPAA authorization', hint: 'Built-in; requires a HIPAA-capable signature tool' },
            ].map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-3 px-4 py-3 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={packet[item.key]}
                    disabled={!canEdit || packetSaving}
                    onChange={(e) => void savePacket({ ...packet, [item.key]: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="block text-xs text-gray-500">{item.hint}</span>
                  </span>
                </label>
              </li>
            ))}
            {sendableTemplates.map((t) => (
              <li key={t.id}>
                <label className="flex items-start gap-3 px-4 py-3 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={packet.templateIds.includes(t.id)}
                    disabled={!canEdit || packetSaving}
                    onChange={() => toggleTemplate(t.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{t.name}</span>
                    <span className="block text-xs text-gray-500">
                      From Templates{t.isPdf ? ' · PDF' : ' · text template'}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {sendableTemplates.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Add documents from Firm Dashboard → Templates, or upload a PDF here.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {packetCount === 0
              ? 'No documents selected — the welcome packet task will not be created.'
              : `${packetCount} document${packetCount === 1 ? '' : 's'} in the packet.`}
          </p>
          {packetMsg ? <p className="mt-1 text-xs text-slate-600">{packetMsg}</p> : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {saveError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{saveError}</div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Firm settings saved.
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Firm Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Enter firm name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
              <input
                type="email"
                value={form.primaryEmail}
                onChange={(e) => updateField('primaryEmail', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="contact@firm.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <PhoneInput
                value={form.phone}
                onChange={(phone) => updateField('phone', phone)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="https://www.firm.com"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="123 Main St, Suite 400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">—</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => updateField('zip', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
