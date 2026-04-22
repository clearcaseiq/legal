import { AlertCircle, Info } from 'lucide-react'
import InlineEvidenceUpload from './InlineEvidenceUpload'
import Tooltip from './Tooltip'

type DeferredStep = 'incident' | 'injuries' | 'damages' | 'review'
type ConsentKey = 'tos' | 'privacy' | 'ml_use' | 'hipaa'
type ConsentDefinition = {
  key: ConsentKey
  prefix: string
  href: string
  label: string
  required: boolean
}

type IntakeWizardDeferredStepsProps = {
  currentStep: DeferredStep
  assessmentId: string | null
  consentRead: Record<string, boolean>
  errors: Record<string, string>
  feedbackMessage?: string | null
  formData: any
  intakeProgress: { percent: number }
  pendingEvidenceFiles: Record<string, any[]>
  readinessDetails: {
    strengths: string[]
    missing: string[]
    topImprove?: string | null
  }
  defaultIncidentTimeline: Array<{ label: string; order: number; approxDate?: string; isCustom?: boolean }>
  updateFormData: (updates: any) => void
  updateIncidentTimeline: (timeline: any[]) => void
  updateLiability: (updates: Record<string, any>) => void
  updateInjuryField: (field: string, value: any) => void
  updateTreatmentField: (field: string, value: any) => void
  handleEvidenceFiles: (category: string, files: any[]) => void
  clearCategoryFiles: (category: string) => void
  removeEvidenceFile: (category: string, index: number) => void
  setCurrentStep: (step: 'incident') => void
  setPreviewFile: (file: { url: string; name: string } | null) => void
}

function ReadinessCard({
  intakeProgress,
  feedbackMessage,
  reviewMode = false,
}: {
  intakeProgress: { percent: number }
  feedbackMessage?: string | null
  reviewMode?: boolean
}) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
        <span>Case readiness</span>
        <span>{intakeProgress.percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${intakeProgress.percent}%` }}
        />
      </div>
      {reviewMode ? (
        <div className="mt-2 text-xs text-gray-500">
          {intakeProgress.percent >= 60
            ? 'You are close to settlement review readiness.'
            : 'A few more details can strengthen your case profile.'}
        </div>
      ) : feedbackMessage ? (
        <div className="mt-2 text-xs text-brand-700">{feedbackMessage}</div>
      ) : null}
    </div>
  )
}

export default function IntakeWizardDeferredSteps({
  currentStep,
  assessmentId,
  consentRead,
  errors,
  feedbackMessage,
  formData,
  intakeProgress,
  pendingEvidenceFiles,
  readinessDetails,
  defaultIncidentTimeline,
  updateFormData,
  updateIncidentTimeline,
  updateLiability,
  updateInjuryField,
  updateTreatmentField,
  handleEvidenceFiles,
  clearCategoryFiles,
  removeEvidenceFile,
  setCurrentStep,
  setPreviewFile,
}: IntakeWizardDeferredStepsProps) {
  const consentDefinitions: ConsentDefinition[] = [
    { key: 'tos', prefix: 'I accept the', href: '/terms-of-service?return=/assess&step=review', label: 'Terms of Service', required: true },
    { key: 'privacy', prefix: 'I accept the', href: '/privacy-policy?return=/assess&step=review', label: 'Privacy Policy', required: true },
    { key: 'ml_use', prefix: 'I consent to', href: '/ai-ml-consent?return=/assess&step=review', label: 'AI/ML processing of my data for case analysis', required: true },
    { key: 'hipaa', prefix: 'I consent to', href: '/hipaa-authorization?return=/assess&step=review', label: 'HIPAA disclosure for medical records', required: false },
  ]

  switch (currentStep) {
    case 'incident':
      return (
        <div className="space-y-6">
          <ReadinessCard intakeProgress={intakeProgress} feedbackMessage={feedbackMessage} />

          <div className="rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Timeline (visual, no dates)</h4>
              <span className="text-xs text-gray-500">Order events first, refine dates later</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Why we ask: placing events in order improves recall accuracy and strengthens your case.
            </p>
            {(() => {
              const eventOptions = [
                'Accident',
                'First symptoms',
                'First medical visit',
                'Time off work',
                'ER visit',
                'X-ray',
                'Physical therapy',
                'Surgery',
                'Follow-up visit',
                'Returned to work',
              ]
              const timeline = Array.isArray(formData.incident?.timeline)
                ? formData.incident?.timeline
                : defaultIncidentTimeline
              return (
                <div className="space-y-2 text-sm">
                  {timeline
                    .slice()
                    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                    .map((event: any) => {
                      const isCustom = event.isCustom ?? !eventOptions.includes(event.label)
                      const eventOrder = event.order
                      return (
                        <div
                          key={event.order}
                          className="flex flex-col md:flex-row md:items-center gap-2 border border-gray-100 rounded-md px-3 py-2"
                        >
                          <div className="flex-1 flex flex-col gap-2">
                            <select
                              value={isCustom ? 'Custom' : event.label}
                              onChange={(e) => {
                                const value = e.target.value
                                const nextLabel = value === 'Custom' ? '' : value
                                const next = timeline.map((item: any) =>
                                  item.order === eventOrder
                                    ? { ...item, label: nextLabel, isCustom: value === 'Custom' }
                                    : item,
                                )
                                updateIncidentTimeline(next)
                              }}
                              className="input text-sm"
                            >
                              {eventOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                              <option value="Custom">Custom</option>
                            </select>
                            {isCustom && (
                              <input
                                type="text"
                                value={event.label}
                                onChange={(e) => {
                                  const next = timeline.map((item: any) =>
                                    item.order === eventOrder ? { ...item, label: e.target.value } : item,
                                  )
                                  updateIncidentTimeline(next)
                                }}
                                className="input text-sm"
                                placeholder="Custom event"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={event.order}
                              onChange={(e) => {
                                const next = timeline.map((item: any) =>
                                  item.order === eventOrder ? { ...item, order: Number(e.target.value) } : item,
                                )
                                updateIncidentTimeline(next)
                              }}
                              className="input text-xs"
                            >
                              {timeline.map((_: any, idx: number) => (
                                <option key={idx + 1} value={idx + 1}>
                                  {idx + 1}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = timeline.filter((item: any) => item.order !== eventOrder)
                                const resequenced = filtered.map((item: any, idx: number) => ({
                                  ...item,
                                  order: idx + 1,
                                }))
                                updateIncidentTimeline(resequenced)
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                              aria-label="Remove event"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...timeline, { label: '', order: timeline.length + 1, isCustom: true }]
                      updateIncidentTimeline(next)
                    }}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    + Add another event
                  </button>
                </div>
              )
            })()}
          </div>

          <div className="rounded-md border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Liability confidence</h4>
              <span className="text-xs text-gray-500">Not sure → Completely certain</span>
            </div>
            <label className="block text-sm text-gray-700">
              How confident are you the other party was at fault?
            </label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900 tabular-nums min-w-[3rem]">
                {Math.round((Number(formData.liability?.confidence || 0) / 10) * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="10"
                value={Number(formData.liability?.confidence || 0)}
                onChange={(e) => updateLiability({ confidence: Number(e.target.value) })}
                className="flex-1"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Not sure</span>
              <span>Completely certain</span>
            </div>
            <p className="text-xs text-gray-500">
              Why we ask: your confidence helps flag weak-liability cases early and supports attorney review.
            </p>
          </div>

          <div className="rounded-md border border-gray-200 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Defense risk flags (optional)</h4>
            <p className="text-xs text-gray-500">
              Insurance companies often ask this — answering now helps us protect your case.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { key: 'usedPhone', label: 'Were you using your phone?' },
                { key: 'alcoholInvolved', label: 'Any alcohol involved?' },
                { key: 'witnesses', label: 'Any witnesses?' },
                { key: 'policeReport', label: 'Police report filed?' },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{item.label}</label>
                  <select
                    value={formData.liability?.[item.key] || ''}
                    onChange={(e) => updateLiability({ [item.key]: e.target.value })}
                    className="select"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Insurance companies often ask this — answering now helps us protect your case.
                  </p>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anything else we should know? (Optional)
              </label>
              <textarea
                value={formData.liability?.defenseNotes || ''}
                onChange={(e) => updateLiability({ defenseNotes: e.target.value })}
                className="textarea"
                rows={3}
                placeholder="Optional context to explain any answers above..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Incident Date (Required)</label>
            <input
              type="date"
              value={formData.incident?.date || ''}
              onChange={(e) => updateFormData({ incident: { ...formData.incident, date: e.target.value } })}
              className={`input ${errors.incidentDate ? 'border-red-500' : ''}`}
            />
            {errors.incidentDate && <p className="mt-1 text-sm text-red-600">{errors.incidentDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What happened? (Required)</label>
            <textarea
              value={formData.incident?.narrative || ''}
              onChange={(e) => updateFormData({ incident: { ...formData.incident, narrative: e.target.value } })}
              className={`textarea ${errors.narrative ? 'border-red-500' : ''}`}
              rows={6}
              placeholder="Please describe what happened in detail..."
            />
            {errors.narrative && <p className="mt-1 text-sm text-red-600">{errors.narrative}</p>}
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-medium">What happens if you skip this?</span>{' '}
              Cases missing a clear incident story often settle for about 15% less.
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <span>Accepted files</span>
              <Tooltip content="Incident photos, police/incident reports, witness statements, and any scene documentation.">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-500 cursor-help">
                  <Info className="h-3.5 w-3.5" />
                </span>
              </Tooltip>
            </div>
            <InlineEvidenceUpload
              assessmentId={assessmentId || undefined}
              category="police_report"
              subcategory="incident_photos"
              description="Upload incident photos and any related documents (e.g., police report, incident report, witness statements)."
              compact={true}
              onFilesUploaded={(files) => handleEvidenceFiles('police_report', files)}
            />
          </div>
        </div>
      )

    case 'injuries':
      return (
        <div className="space-y-6">
          <ReadinessCard intakeProgress={intakeProgress} feedbackMessage={feedbackMessage} />

          <div className="rounded-md border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Upload first (recommended)</h4>
              <span className="text-xs text-gray-500">Bills • Records • Photos</span>
            </div>
            <p className="text-xs text-gray-500">
              Upload any bills, records, or photos now. We’ll ask clarifying questions after processing.
            </p>
            <div className="border-t pt-4 space-y-4">
              <InlineEvidenceUpload
                assessmentId={assessmentId || undefined}
                category="medical_records"
                subcategory="medical_bills"
                title="Medical records"
                description="Medical bills, records, and treatment documentation"
                compact={true}
                onFilesUploaded={(files) => handleEvidenceFiles('medical_records', files)}
              />
              <InlineEvidenceUpload
                assessmentId={assessmentId || undefined}
                category="photos"
                subcategory="injury_photos"
                title="Injury photos"
                description="Photos of injuries and visible damage"
                compact={true}
                onFilesUploaded={(files) => handleEvidenceFiles('photos', files)}
              />
              <InlineEvidenceUpload
                assessmentId={assessmentId || undefined}
                category="bills"
                subcategory="medical_bill"
                title="Bills and receipts"
                description="Receipts, out-of-pocket expenses, and invoices"
                compact={true}
                onFilesUploaded={(files) => handleEvidenceFiles('bills', files)}
              />
            </div>
          </div>

          {(() => {
            const medicalRecords = pendingEvidenceFiles.medical_records || []
            const bills = pendingEvidenceFiles.bills || []
            const photos = pendingEvidenceFiles.photos || []
            const medicalUploadCount = medicalRecords.length + bills.length
            const hasProcessedMedical = [...medicalRecords, ...bills].some(
              (file: any) => file.processingStatus === 'completed',
            )

            if (medicalUploadCount === 0 && photos.length === 0) return null

            return (
              <div className="rounded-md border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Follow-up questions (optional)</h4>
                  <span className="text-xs text-gray-500">
                    {medicalUploadCount} medical docs • {photos.length} photos
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Based on your uploads{hasProcessedMedical ? '' : ' (processing may take a moment)'}.
                </p>
                {medicalUploadCount > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Do these records cover all treatment so far?
                      </label>
                      <select
                        value={formData.treatment?.[0]?.recordsComplete || ''}
                        onChange={(e) => updateTreatmentField('recordsComplete', e.target.value)}
                        className="select"
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="unsure">Not sure</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Any surgery documented?</label>
                      <select
                        value={formData.treatment?.[0]?.surgeryDocumented || ''}
                        onChange={(e) => updateTreatmentField('surgeryDocumented', e.target.value)}
                        className="select"
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="unsure">Not sure</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Ongoing treatment right now?</label>
                      <select
                        value={formData.treatment?.[0]?.ongoingTreatment || ''}
                        onChange={(e) => updateTreatmentField('ongoingTreatment', e.target.value)}
                        className="select"
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="unsure">Not sure</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Approx. number of providers in these records
                      </label>
                      <select
                        value={formData.treatment?.[0]?.providerCount || ''}
                        onChange={(e) => updateTreatmentField('providerCount', e.target.value)}
                        className="select"
                      >
                        <option value="">Select</option>
                        <option value="1">1</option>
                        <option value="2-3">2–3</option>
                        <option value="4-6">4–6</option>
                        <option value="7+">7+</option>
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anything missing you want us to request? (Optional)
                  </label>
                  <textarea
                    value={formData.treatment?.[0]?.missingRecordsNotes || ''}
                    onChange={(e) => updateTreatmentField('missingRecordsNotes', e.target.value)}
                    className="textarea"
                    rows={3}
                    placeholder="e.g., imaging results, ER records, physical therapy notes..."
                  />
                </div>
              </div>
            )
          })()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Injuries (Required)</label>
            <textarea
              value={typeof formData.injuries?.[0]?.description === 'string' ? formData.injuries[0].description : ''}
              onChange={(e) => updateFormData({ injuries: [{ description: e.target.value }] })}
              className={`textarea ${errors.injuries ? 'border-red-500' : ''}`}
              rows={4}
              placeholder="Describe any injuries you sustained..."
            />
            {errors.injuries && <p className="mt-1 text-sm text-red-600">{errors.injuries}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Why we ask: describing injuries helps us match your case to the right attorney and estimate value.
            </p>
          </div>

          <div className="rounded-md border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Pain & Impact</h4>
              <span className="text-xs text-gray-500">No impact → Life-changing</span>
            </div>
            {[
              ['painWorst', 'How bad was your pain at its worst?'],
              ['dailyImpact', 'How much did this affect your daily life?'],
              ['currentLimitations', 'How limited are you right now?'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs text-gray-600 mb-2">{label}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={Number(formData.injuries?.[0]?.[field] || 0)}
                  onChange={(e) => updateInjuryField(field, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['sleepDisruption', 'Sleep disruption'],
                ['anxietyStress', 'Anxiety / stress'],
                ['abilityToWork', 'Ability to work'],
                ['hobbiesImpact', 'Ability to enjoy hobbies'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs text-gray-600 mb-2">{label}</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Number(formData.injuries?.[0]?.[field] || 0)}
                    onChange={(e) => updateInjuryField(field, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              Not sure? You can leave these sliders at zero and update later.
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Treatment (optional)</label>
            <textarea
              value={typeof formData.treatment?.[0]?.description === 'string' ? formData.treatment[0].description : ''}
              onChange={(e) => updateFormData({ treatment: [{ description: e.target.value }] })}
              className="textarea"
              rows={4}
              placeholder="Any additional treatment details you want us to know..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Why we ask: insurance companies often challenge gaps in treatment — documenting this helps protect your case.
            </p>
          </div>
        </div>
      )

    case 'damages':
      return (
        <div className="space-y-6">
          <ReadinessCard intakeProgress={intakeProgress} feedbackMessage={feedbackMessage} />

          <div className="text-center">
            <p className="text-gray-600">
              This section is optional. You can add financial information later.
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <span className="font-medium">What happens if you skip this?</span>{' '}
            Cases missing financial impact details often settle for about 12% less.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ['med_charges', 'Medical Bills ($)', 'documented medical costs directly support case value.'],
              ['med_paid', 'Medical Bills Paid ($)', 'insurers often compare charges vs. paid amounts.'],
              ['wage_loss', 'Lost Wages ($)', 'wage loss can materially increase damages.'],
              ['services', 'Other Services ($)', 'out-of-pocket services (rides, care) add to damages.'],
            ].map(([field, label, help]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.damages?.[field] || ''}
                  onChange={(e) =>
                    updateFormData({
                      damages: { ...formData.damages, [field]: parseFloat(e.target.value) || undefined },
                    })
                  }
                  className="input"
                  placeholder="0.00"
                />
                <p className="mt-2 text-xs text-gray-500">Why we ask: {help}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'review':
      return (
        <div className="space-y-6">
          <ReadinessCard intakeProgress={intakeProgress} reviewMode />

          <div className="rounded-md border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Case Readiness Score</h3>
              <span className="text-sm text-gray-600">Your case is {intakeProgress.percent}% documented</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${intakeProgress.percent}%` }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-2">What’s strong</div>
                {readinessDetails.strengths.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {readinessDetails.strengths.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">Still getting started.</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-2">What’s missing</div>
                {readinessDetails.missing.length > 0 ? (
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {readinessDetails.missing.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">Nothing major missing.</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-2">What would improve it most</div>
                <div className="text-gray-600">
                  {readinessDetails.topImprove
                    ? `Add ${readinessDetails.topImprove.toLowerCase()}.`
                    : 'You’re in great shape—keep uploading new evidence as it arrives.'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Claim Type:</span> {formData.claimType}
              </div>
              <div>
                <span className="font-medium">State:</span> {formData.venue?.state}
                {formData.venue?.county && <span>, {formData.venue.county}</span>}
              </div>
              <div>
                <span className="font-medium">Incident Date:</span>{' '}
                {formData.incident?.date || (formData.incident?.timeline?.length ? 'Timeline provided' : 'Not provided')}
              </div>
              {formData.incident?.location && (
                <div>
                  <span className="font-medium">Location:</span> {formData.incident.location}
                </div>
              )}
              <div>
                <span className="font-medium">Description:</span> {formData.incident?.narrative}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600 space-y-3">
            <div className="font-medium text-gray-900">What Happens Next</div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">What attorneys look at</div>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                <li>Clear liability story and fault confidence</li>
                <li>Injury impact with treatment timeline</li>
                <li>Damages supported by bills, photos, and records</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">What insurers challenge</div>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                <li>Gaps in treatment or missing providers</li>
                <li>Unclear incident details or conflicting facts</li>
                <li>Missing documentation of expenses or lost work</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                What plaintiffs often regret not documenting early
              </div>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                <li>Photos of injuries and scene conditions</li>
                <li>Daily pain/impact notes and missed work</li>
                <li>Initial medical visits and referrals</li>
              </ul>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
            <div className="font-medium text-gray-900 mb-2">What happens next</div>
            <ul className="list-disc list-inside space-y-1">
              <li>We package your case for attorney review.</li>
              <li>You’ll be notified if more details improve value.</li>
              <li>Nothing is shared without your approval.</li>
            </ul>
          </div>

          {Object.keys(pendingEvidenceFiles).length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Evidence Files to Upload (
                  {Object.values(pendingEvidenceFiles).reduce((total, files) => total + files.length, 0)} files)
                </h3>
                <button
                  onClick={() => setCurrentStep('incident')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Add More Files
                </button>
              </div>
              <div className="space-y-4">
                {Object.entries(pendingEvidenceFiles).map(([category, files]) =>
                  files.length > 0 ? (
                    <div key={category} className="border border-blue-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          {category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())} ({files.length})
                        </h4>
                        <button
                          onClick={() => clearCategoryFiles(category)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={file.id || index}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded"
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-100" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.originalName}</p>
                                <p className="text-xs text-gray-500">
                                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {file.fileUrl && (
                                <Tooltip content="View file">
                                  <button
                                    onClick={() => {
                                      if (file.mimetype?.startsWith('image/')) {
                                        setPreviewFile({ url: file.fileUrl, name: file.originalName })
                                      } else {
                                        window.open(file.fileUrl, '_blank')
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    aria-label="View file"
                                  >
                                    View
                                  </button>
                                </Tooltip>
                              )}
                              <Tooltip content="Remove file">
                                <button
                                  onClick={() => removeEvidenceFile(category, index)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  aria-label="Remove file"
                                >
                                  Remove
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
              <p className="text-xs text-gray-600 mt-3 bg-blue-100 p-2 rounded">
                <strong>Note:</strong> These files will be uploaded and automatically processed after you submit your assessment.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Consent & Agreements</h3>
            <div className="space-y-3">
              {consentDefinitions.map(({ key, prefix, href, label, required }) => (
                <div key={key}>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.consents?.[key] || false}
                      onChange={(e) =>
                        updateFormData({
                          consents: { ...formData.consents, [key]: e.target.checked },
                        })
                      }
                      disabled={!consentRead[key]}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className={`ml-2 text-sm ${errors[key] ? 'text-red-600' : 'text-gray-700'}`}>
                      {prefix}{' '}
                      <a href={href} className="text-brand-600 hover:text-brand-800 underline">
                        {label}
                      </a>{' '}
                      ({required ? 'Required' : 'optional'})
                    </span>
                  </label>
                  {errors[key] && <p className="ml-6 text-sm text-red-600">{errors[key]}</p>}
                </div>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}
