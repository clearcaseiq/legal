import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cloneCaseTemplate, createManualIntake, importCase, saveSmartIntakeConfig } from '../lib/api'

type AttorneyDashboardIntakeTabProps = {
  onGoToLeads: () => void
}

export default function AttorneyDashboardIntakeTab({
  onGoToLeads,
}: AttorneyDashboardIntakeTabProps) {
  const navigate = useNavigate()
  const [intakeTemplate, setIntakeTemplate] = useState('PI')
  const [intakeMessage, setIntakeMessage] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importForm, setImportForm] = useState({
    source: 'clio',
    includeDocuments: true,
    includeHistory: true,
    includeTasks: true,
    includeMedical: true,
    notes: '',
    files: [] as { name: string; size?: number }[],
  })
  const [smartIntakeConfig, setSmartIntakeConfig] = useState({
    dynamicQuestionnaires: true,
    conditionalLogic: true,
    missingInfoDetection: true,
    autoFollowUps: true,
  })
  const [smartIntakeMessage, setSmartIntakeMessage] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Imports</h3>
        <div className="text-xs text-gray-500">Create, import, and configure intake flows.</div>
      </div>

      <div className="rounded-md border border-gray-200 p-4 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Creation</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <button
              onClick={onGoToLeads}
              className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              From Routed Lead
            </button>
            <button
              onClick={async () => {
                try {
                  setIntakeMessage('Creating draft case...')
                  const data = await createManualIntake({ template: intakeTemplate })
                  setIntakeMessage('Draft case created. Opening intake...')
                  navigate(`/edit-assessment/${data.assessmentId}`)
                } catch (err: any) {
                  setIntakeMessage(err.response?.data?.error || 'Failed to create draft case')
                }
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Create New Case (Manual)
            </button>
            <div className="flex items-center gap-2">
              <select
                value={intakeTemplate}
                onChange={(e) => setIntakeTemplate(e.target.value)}
                className="input"
              >
                <option value="PI">PI</option>
                <option value="MVA">MVA</option>
                <option value="Premises">Premises</option>
                <option value="MedMal">MedMal</option>
              </select>
              <button
                onClick={async () => {
                  try {
                    setIntakeMessage(`Cloning ${intakeTemplate} template...`)
                    const data = await cloneCaseTemplate({ template: intakeTemplate })
                    navigate(`/edit-assessment/${data.assessmentId}`)
                  } catch (err: any) {
                    setIntakeMessage(err.response?.data?.error || 'Failed to clone template')
                  }
                }}
                className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
              >
                Clone Template
              </button>
            </div>
          </div>
          {intakeMessage && <div className="mt-2 text-xs text-gray-500">{intakeMessage}</div>}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Case Import</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <select
              value={importForm.source}
              onChange={(e) => setImportForm((prev) => ({ ...prev, source: e.target.value }))}
              className="input"
            >
              <option value="clio">Clio</option>
              <option value="filevine">Filevine</option>
              <option value="needles">Needles</option>
              <option value="litify">Litify</option>
              <option value="spreadsheet">Spreadsheet/CSV</option>
            </select>
            <input
              type="file"
              multiple
              className="input"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setImportForm((prev) => ({
                  ...prev,
                  files: files.map((file) => ({ name: file.name, size: file.size })),
                }))
              }}
            />
            <input
              value={importForm.notes}
              onChange={(e) => setImportForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="input md:col-span-3"
              placeholder="Import notes or special handling"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importForm.includeDocuments}
                onChange={(e) => setImportForm((prev) => ({ ...prev, includeDocuments: e.target.checked }))}
              />
              Document ingestion (PDFs, Word, images, emails)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importForm.includeHistory}
                onChange={(e) => setImportForm((prev) => ({ ...prev, includeHistory: e.target.checked }))}
              />
              Historical offers & negotiation import
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importForm.includeTasks}
                onChange={(e) => setImportForm((prev) => ({ ...prev, includeTasks: e.target.checked }))}
              />
              Deadline, task, and note rehydration
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importForm.includeMedical}
                onChange={(e) => setImportForm((prev) => ({ ...prev, includeMedical: e.target.checked }))}
              />
              Medical bills & lien extraction
            </label>
          </div>
          <div className="mt-3">
            <button
              onClick={async () => {
                try {
                  setImportMessage('Submitting import request...')
                  await importCase({
                    source: importForm.source,
                    includeDocuments: importForm.includeDocuments,
                    includeHistory: importForm.includeHistory,
                    includeTasks: importForm.includeTasks,
                    includeMedical: importForm.includeMedical,
                    notes: importForm.notes,
                    files: importForm.files,
                  })
                  setImportMessage('Import queued. We will hydrate the case once files are processed.')
                } catch (err: any) {
                  setImportMessage(err.response?.data?.error || 'Failed to import case')
                }
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Start Import
            </button>
          </div>
          {importMessage && <div className="mt-2 text-xs text-gray-500">{importMessage}</div>}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Smart Intake Engine</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={smartIntakeConfig.dynamicQuestionnaires}
                onChange={(e) =>
                  setSmartIntakeConfig((prev) => ({ ...prev, dynamicQuestionnaires: e.target.checked }))
                }
              />
              Dynamic questionnaires
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={smartIntakeConfig.conditionalLogic}
                onChange={(e) =>
                  setSmartIntakeConfig((prev) => ({ ...prev, conditionalLogic: e.target.checked }))
                }
              />
              Conditional logic
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={smartIntakeConfig.missingInfoDetection}
                onChange={(e) =>
                  setSmartIntakeConfig((prev) => ({ ...prev, missingInfoDetection: e.target.checked }))
                }
              />
              Missing-info detection
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={smartIntakeConfig.autoFollowUps}
                onChange={(e) =>
                  setSmartIntakeConfig((prev) => ({ ...prev, autoFollowUps: e.target.checked }))
                }
              />
              Auto-follow-up prompts
            </label>
          </div>
          <div className="mt-3">
            <button
              onClick={async () => {
                try {
                  await saveSmartIntakeConfig(smartIntakeConfig)
                  setSmartIntakeMessage('Smart intake preferences saved.')
                } catch (err: any) {
                  setSmartIntakeMessage(err.response?.data?.error || 'Failed to save smart intake settings')
                }
              }}
              className="px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              Save Smart Intake Settings
            </button>
          </div>
          {smartIntakeMessage && <div className="mt-2 text-xs text-gray-500">{smartIntakeMessage}</div>}
        </div>
      </div>
    </div>
  )
}
