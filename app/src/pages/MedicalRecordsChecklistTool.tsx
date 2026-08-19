import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, FileText } from 'lucide-react'
import SeoCiteEmbed from '../components/SeoCiteEmbed'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import {
  CHECKLIST_CATEGORIES,
  MEDICAL_RECORDS_CHECKLIST,
} from '../lib/medicalRecordsChecklist'
import { downloadMedicalRecordsChecklistPdf } from '../lib/reportPdfExports'

export default function MedicalRecordsChecklistTool() {
  const [searchParams] = useSearchParams()
  const embed = searchParams.get('embed') === '1'
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const checkedCount = useMemo(
    () => MEDICAL_RECORDS_CHECKLIST.filter((item) => checked[item.id]).length,
    [checked],
  )

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const download = () => {
    void downloadMedicalRecordsChecklistPdf({
      checkedIds: Object.keys(checked).filter((id) => checked[id]),
      items: MEDICAL_RECORDS_CHECKLIST,
      categories: CHECKLIST_CATEGORIES,
    })
  }

  return (
    <div className={`mx-auto max-w-3xl space-y-8 ${embed ? 'py-4' : 'py-8'}`}>
      {!embed && (
        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Document readiness</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Medical records & evidence checklist
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Track the documents insurers and attorneys usually ask for after an accident. Download a PDF checklist, then
            upload what you have in a free ClearCaseIQ assessment.
          </p>
          <p className="text-sm text-slate-500">Educational only — not legal advice. ClearCaseIQ is not a law firm.</p>
        </header>
      )}

      {embed && (
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">Injury document checklist</h1>
          <p className="text-sm text-slate-600">Check what you have · download a PDF</p>
        </header>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          <FileText className="mr-1.5 inline h-4 w-4 text-brand-600" aria-hidden />
          {checkedCount} of {MEDICAL_RECORDS_CHECKLIST.length} items checked
        </p>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download PDF
        </button>
      </div>

      <div className="space-y-6">
        {CHECKLIST_CATEGORIES.map((category) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{category.label}</h2>
            <ul className="space-y-2">
              {MEDICAL_RECORDS_CHECKLIST.filter((item) => item.category === category.id).map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-200 dark:border-slate-800 dark:bg-slate-900/60">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[item.id])}
                      onChange={() => toggle(item.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{item.label}</span>
                      <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{item.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!embed && (
        <>
          <div className="flex flex-wrap gap-3">
            <Link
              to={START_ASSESSMENT_HREF}
              className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Start free assessment
            </Link>
            <Link
              to="/medical-records"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Medical records guide
            </Link>
          </div>
          <SeoCiteEmbed
            title="Medical Records & Evidence Checklist"
            path="/tools/medical-records-checklist"
            embedToolPath="/tools/medical-records-checklist"
          />
        </>
      )}

      {embed && (
        <p className="text-center text-xs text-slate-500">
          Powered by{' '}
          <a href="https://www.clearcaseiq.com" target="_blank" rel="noreferrer" className="font-semibold text-brand-700">
            ClearCaseIQ
          </a>
        </p>
      )}
    </div>
  )
}
