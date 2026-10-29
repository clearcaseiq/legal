import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Trash2 } from 'lucide-react'
import api from '../lib/http'
import { clearStoredAuth } from '../lib/auth'
import { useLanguage } from '../contexts/LanguageContext'
import { useToast } from '../contexts/ToastContext'

const OAUTH_PROVIDERS = new Set(['google', 'apple', 'microsoft'])

/** Claimant self-service for the Privacy Policy's right to a copy and right to delete. */
export default function PrivacyDataSection() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const signedInWithProvider = OAUTH_PROVIDERS.has(localStorage.getItem('auth_provider') || '')

  const downloadData = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const { data } = await api.get('/v1/account/export', { responseType: 'blob' })
      const url = URL.createObjectURL(data as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clearcaseiq-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setExportError(t('privacyData.exportError'))
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.post('/v1/account/delete', {
        confirm: confirmText.trim(),
        password: signedInWithProvider ? undefined : password,
      })
      clearStoredAuth()
      showToast({ variant: 'success', title: t('privacyData.deleted') })
      navigate('/', { replace: true })
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || t('privacyData.deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = confirmText.trim() === 'DELETE' && (signedInWithProvider || password.length > 0)

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-medium text-gray-900">{t('privacyData.title')}</h3>
      <p className="mt-1 text-sm text-gray-600">{t('privacyData.intro')}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void downloadData()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? t('privacyData.exporting') : t('privacyData.exportButton')}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          {t('privacyData.deleteButton')}
        </button>
      </div>
      {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={t('privacyData.deleteTitle')}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">{t('privacyData.deleteTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{t('privacyData.deleteBody')}</p>
            <div className="mt-4 space-y-3">
              {!signedInWithProvider && (
                <label className="block text-sm font-medium text-gray-700">
                  {t('privacyData.passwordLabel')}
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              )}
              <label className="block text-sm font-medium text-gray-700">
                {t('privacyData.confirmLabel')}
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  autoComplete="off"
                />
              </label>
            </div>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  setPassword('')
                  setConfirmText('')
                  setDeleteError(null)
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('privacyData.cancel')}
              </button>
              <button
                type="button"
                disabled={!canDelete || deleting}
                onClick={() => void deleteAccount()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? t('privacyData.deleting') : t('privacyData.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
