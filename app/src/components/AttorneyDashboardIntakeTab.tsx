import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
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
    files: [] as File[],
  })
  const [smartIntakeConfig, setSmartIntakeConfig] = useState({
    dynamicQuestionnaires: true,
    conditionalLogic: true,
    missingInfoDetection: true,
    autoFollowUps: true,
  })
  const [smartIntakeMessage, setSmartIntakeMessage] = useState<string | null>(null)

  // Provide a downloadable template so attorneys can see the expected columns
  // for a spreadsheet/CSV case import (#121). Generated client-side to avoid a
  // separate static asset that could 404 depending on deployment.
  const downloadSampleImportFile = () => {
    const headers = [
      'client_first_name',
      'client_last_name',
      'email',
      'phone',
      'case_type',
      'incident_date',
      'state',
      'county',
      'description',
      'status',
    ]
    const sampleRows = [
      [
        'Jane',
        'Doe',
        'jane.doe@example.com',
        '(213) 555-0100',
        'auto',
        '2025-03-14',
        'CA',
        'Los Angeles',
        'Rear-ended at a red light; neck and back injuries with ongoing PT.',
        'open',
      ],
      [
        'John',
        'Smith',
        'john.smith@example.com',
        '(415) 555-0182',
        'slip_and_fall',
        '2025-01-08',
        'CA',
        'San Francisco',
        'Slipped on unmarked wet floor at a grocery store; wrist fracture.',
        'open',
      ],
    ]
    const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
    const csv = [headers, ...sampleRows].map((row) => row.map(escape).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample-case-import.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900">Case Import</h4>
            <button
              type="button"
              onClick={downloadSampleImportFile}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download sample file
            </button>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Importing a spreadsheet? Download the sample CSV to see the expected columns and formatting.
          </p>
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
              accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
              className="input"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setImportForm((prev) => ({
                  ...prev,
                  files,
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
                  const data = await importCase({
                    source: importForm.source,
                    includeDocuments: importForm.includeDocuments,
                    includeHistory: importForm.includeHistory,
                    includeTasks: importForm.includeTasks,
                    includeMedical: importForm.includeMedical,
                    notes: importForm.notes,
                    files: importForm.files,
                  })
                  const createdCount = data.createdCount ?? data.assessmentIds?.length ?? 0
                  setImportMessage(
                    createdCount > 0
                      ? `Imported ${createdCount} case${createdCount === 1 ? '' : 's'} from ${importForm.source}.`
                      : 'Import queued. We will hydrate the case once files are processed.',
                  )
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
