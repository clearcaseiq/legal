import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronRight, Clock, Copy, Download, LayoutDashboard, Square, Star, Upload } from 'lucide-react'

type ImproveCaseValueItem = {
  label: string
  done: boolean
  boost?: string
}

type RankedAttorneyCard = {
  id?: string
  attorney_id?: string
  name: string
  law_firm?: { name?: string; state?: string }
  fit_score?: number
  responseBadge?: string
  responseTimeHours?: number
  reviews_count?: number
  totalReviews?: number
  verifiedReviewCount?: number
  averageRating?: number
  rating?: number
  yearsExperience?: number
  specialties?: string[]
  venues?: string[]
}

function getResponseBadge(attorney: RankedAttorneyCard) {
  return attorney.responseBadge || ((attorney.responseTimeHours || 24) <= 8 ? 'Same-day replies' : 'Replies within 24h')
}

function formatClaimTypeLabel(claimType?: string) {
  if (!claimType) return 'personal injury'
  const labels: Record<string, string> = {
    auto: 'auto accident',
    slip_and_fall: 'slip and fall',
    workplace: 'workplace injury',
    medmal: 'medical malpractice',
    dog_bite: 'dog bite',
    product: 'product liability',
    assault: 'assault',
    toxic: 'toxic exposure',
    wrongful_death: 'wrongful death',
  }
  return labels[claimType] || claimType.replace(/_/g, ' ')
}

function formatVenueLabel(venueState?: string, venueCounty?: string) {
  const normalizedCounty = venueCounty
    ? /county/i.test(venueCounty) ? venueCounty : `${venueCounty} County`
    : ''
  const normalizedState = venueState === 'CA' ? 'CA' : venueState || ''
  return [normalizedCounty, normalizedState].filter(Boolean).join(', ')
}

function getAttorneyPracticePreview(
  attorney: RankedAttorneyCard,
  context?: {
    venueState?: string
    venueCounty?: string
  }
) {
  const specialties = Array.isArray(attorney.specialties) ? attorney.specialties.filter(Boolean) : []
  const venues = Array.isArray(attorney.venues) ? attorney.venues.filter(Boolean) : []
  const localVenue = formatVenueLabel(context?.venueState, context?.venueCounty)
  const location = localVenue || attorney.law_firm?.state || venues[0]
  const pieces = [
    specialties.slice(0, 2).map((value) => formatClaimTypeLabel(value)).join(' + '),
    location ? `${localVenue ? 'Serves' : 'Practices in'} ${location}` : '',
    attorney.yearsExperience ? `${attorney.yearsExperience}+ years experience` : '',
  ].filter(Boolean)

  return pieces.join(' • ')
}

function getAttorneyWhyMatched(
  attorney: RankedAttorneyCard,
  context?: {
    assessmentClaimType?: string
    venueState?: string
    venueCounty?: string
  }
) {
  const specialty = context?.assessmentClaimType
    ? formatClaimTypeLabel(context.assessmentClaimType)
    : Array.isArray(attorney.specialties) && attorney.specialties[0]
      ? formatClaimTypeLabel(attorney.specialties[0])
      : 'similar cases'
  const venue = formatVenueLabel(context?.venueState, context?.venueCounty)
    || attorney.law_firm?.state
    || (Array.isArray(attorney.venues) ? attorney.venues[0] : '')
  return `Why matched: strong for ${specialty} matters${venue ? ` in ${venue}` : ''}.`
}

type ResultsSubmittedViewProps = {
  assessmentId?: string
  assessmentClaimType?: string
  handleDownloadReportPdf: () => void | Promise<void>
  handleCopyShareLink: () => void
  improveCaseValueItems: ImproveCaseValueItem[]
  isLoggedIn: boolean | null
  rankedAttorneys: RankedAttorneyCard[]
  shareCopied: boolean
  showSavePrompt: boolean
  submissionTimeline: Array<{ label: string; done: boolean }>
  venueCounty?: string
  venueState?: string
}

export function ResultsSubmittedView({
  assessmentId,
  assessmentClaimType,
  handleDownloadReportPdf,
  handleCopyShareLink,
  improveCaseValueItems,
  isLoggedIn,
  rankedAttorneys,
  shareCopied,
  showSavePrompt,
  submissionTimeline,
  venueCounty,
  venueState,
}: ResultsSubmittedViewProps) {
  const attorneyCards = Array.isArray(rankedAttorneys) ? rankedAttorneys : []
  const improvementItems = Array.isArray(improveCaseValueItems) ? improveCaseValueItems : []
  const timeline = Array.isArray(submissionTimeline) ? submissionTimeline : []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-card overflow-hidden">
      <div className="px-6 sm:px-10 py-10 border-b border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 mb-5">
            <CheckCircle className="h-9 w-9 text-emerald-600" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Submission confirmed</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mb-3">Your matter was sent for attorney review</h1>
          <p className="text-slate-600 mb-2 leading-relaxed">Your summary was delivered securely to counsel who handle similar cases.</p>
          <p className="text-sm font-medium text-emerald-800">Initial responses are often received within one business day.</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-6 mb-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">Status</h3>
          <ol className="space-y-3">
            {timeline.map((step, index) => (
              <li key={index} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                    {index + 1}
                  </span>
                )}
                <span className={step.done ? 'text-gray-700' : 'text-gray-600'}>{step.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mb-8 text-left">
          <h3 className="text-base font-semibold text-slate-900 mb-3 tracking-tight">What happens next</h3>
          <ul className="text-slate-600 space-y-2 text-[15px] leading-relaxed">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              Attorneys review your case summary
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              Interested attorneys respond
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              You choose whether to speak with them
            </li>
          </ul>
        </div>

        {attorneyCards.length > 0 && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50/80 p-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">Your ranked attorney picks</h3>
            <div className="space-y-3">
              {attorneyCards.map((attorney, index) => (
                <div key={attorney.id || attorney.attorney_id || attorney.name} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Choice {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{attorney?.name ?? 'Attorney'}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {[
                      attorney?.law_firm?.name ?? 'Law Firm',
                      `${Math.round((attorney.fit_score || 0.6) * 100)}% fit`,
                      getResponseBadge(attorney),
                    ].filter(Boolean).join(' • ')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getAttorneyPracticePreview(attorney, {
                      venueCounty,
                      venueState,
                    }) || getAttorneyWhyMatched(attorney, {
                      assessmentClaimType,
                      venueCounty,
                      venueState,
                    })}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {getAttorneyWhyMatched(attorney, {
                      assessmentClaimType,
                      venueCounty,
                      venueState,
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {(attorney.verifiedReviewCount || 0) > 0
                        ? `${attorney.verifiedReviewCount} verified reviews`
                        : 'New profile'}
                    </span>
                    {((attorney.averageRating || attorney.rating || 0) > 0) && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                        <Star className="mr-1 h-3 w-3" />
                        {(attorney.averageRating || attorney.rating || 0).toFixed(1)} rating
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <Clock className="mr-1 h-3 w-3" />
                      {getResponseBadge(attorney)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-6 mb-8">
          <h3 className="text-base font-semibold text-slate-900 mb-2 tracking-tight">Strengthen your file while you wait</h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">Additional documentation can improve how your matter is assessed.</p>
          <ul className="space-y-2 mb-4">
            {improvementItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                {item.done ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <span className={item.done ? 'text-gray-600 line-through' : 'text-gray-900'}>{item.label}</span>
              </li>
            ))}
          </ul>
          <Link
            to={`/evidence-upload/${assessmentId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Evidence
          </Link>
        </div>

        {showSavePrompt && (
          <div className="mb-8 rounded-xl border-2 border-brand-200 bg-brand-50 px-6 py-6">
            <h2 className="text-lg font-semibold text-brand-900">Save your case and track attorney responses</h2>
            <p className="mt-2 text-brand-800">Create a free account to track your case and upload more evidence.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={`/register?redirect=/dashboard&assessmentId=${assessmentId}`}
                className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
              >
                Create account
              </Link>
              <Link
                to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`}
                className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        {isLoggedIn ? (
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-4 text-lg font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700"
          >
            <LayoutDashboard className="h-5 w-5" />
            Go to My Case Dashboard
          </Link>
        ) : (
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`} className="text-brand-600 font-medium">
              Sign in
            </Link>{' '}
            to save your case.
          </p>
        )}
      </div>

      <div className="px-6 py-5 border-t border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 justify-center text-sm">
        <button type="button" onClick={() => void handleDownloadReportPdf()} className="font-semibold text-brand-800 hover:text-brand-950">
          Download PDF
        </button>
        <button type="button" onClick={handleCopyShareLink} className="font-semibold text-brand-800 hover:text-brand-950">
          {shareCopied ? 'Link copied' : 'Copy link'}
        </button>
      </div>

      <div className="px-6 sm:px-10 py-6 border-t border-slate-200 bg-slate-50/80">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">Limitations: </span>
              This analysis is informational only and not legal advice. Consult qualified counsel before making decisions.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

type ResultsReportDetailsProps = {
  assessmentId: string
  assessmentClaimType?: string
  evidenceCompletionPercent: number
  handleCopyShareLink: () => void
  handleDownloadReportPdf: () => void | Promise<void>
  improveCaseValueItems: ImproveCaseValueItem[]
  isLoggedIn: boolean | null
  rankedAttorneys: RankedAttorneyCard[]
  shareCopied: boolean
  showSavePrompt: boolean
  solDeadline: string | null
  solRemaining: string
  settlementHigh: string
  settlementLow: string
  venueCounty?: string
  venueState: string
  whatThisMeansBullets: string[]
}

export function ResultsReportDetails({
  assessmentId,
  assessmentClaimType,
  evidenceCompletionPercent,
  handleCopyShareLink,
  handleDownloadReportPdf,
  improveCaseValueItems,
  isLoggedIn,
  rankedAttorneys,
  shareCopied,
  showSavePrompt,
  solDeadline,
  solRemaining,
  settlementHigh,
  settlementLow,
  venueCounty,
  venueState,
  whatThisMeansBullets,
}: ResultsReportDetailsProps) {
  const sectionTitle = 'font-display text-lg font-semibold text-slate-900 tracking-tight'
  const sectionWrap = 'border-b border-slate-200 px-6 sm:px-10 py-9 sm:py-10'
  const prose = 'text-[15px] text-slate-700 leading-relaxed'
  const bullets = Array.isArray(whatThisMeansBullets) ? whatThisMeansBullets : []
  const improvementItems = Array.isArray(improveCaseValueItems) ? improveCaseValueItems : []
  const attorneyCards = Array.isArray(rankedAttorneys) ? rankedAttorneys : []

  return (
    <div className="mt-8 rounded-none border border-slate-200/90 bg-white shadow-card sm:rounded-2xl overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 sm:px-10 py-4">
        <p className="text-xs font-bold text-brand-800">ClearCaseIQ</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Supplemental sections</p>
      </div>
      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>Executive summary</h2>
        <ul className={`${prose} space-y-3 list-none pl-0`}>
          {(bullets.length > 0 ? bullets : [
            'The incident narrative suggests facts that may support liability against another party.',
            'Injury and treatment information may support a damages claim.',
            'Medical documentation, where present, strengthens the file.',
            `Comparable matters in ${venueState === 'CA' ? 'California' : venueState} have often settled in the range of ${settlementLow} - ${settlementHigh}.`,
          ]).map((bullet, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>Strengthening your file</h2>
        <ul className="space-y-3 mb-4">
          {improvementItems.map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              {item.done ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Square className="h-5 w-5 text-slate-300 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className={item.done ? 'text-slate-600 line-through' : 'text-slate-900 font-medium'}>{item.label}</span>
                {item.boost && <span className="block text-sm text-brand-700 mt-0.5">{item.boost}</span>}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600 mb-4">Documentation completeness: <span className="font-semibold text-slate-800">{evidenceCompletionPercent}%</span></p>
        <Link
          to={`/evidence-upload/${assessmentId}`}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 shadow-sm transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload evidence
        </Link>
      </div>

      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>Attorney review</h2>
        <p className={`${prose} mb-3`}>
          If you choose to proceed, we prepare your matter summary for review and facilitate matching with counsel who handle similar cases.
        </p>
        <p className={`${prose} mb-2`}>Initial responses are often received within one business day.</p>
        <p className="text-sm text-slate-500 mb-6">No obligation to retain any particular attorney.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">Typical panel qualifications</h3>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" /> Substantial experience in personal injury matters
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              {assessmentClaimType === 'auto'
                ? 'Auto negligence'
                : assessmentClaimType === 'slip_and_fall'
                  ? 'Premises liability'
                  : assessmentClaimType === 'medmal'
                    ? 'Medical malpractice'
                    : 'Personal injury'}{' '}
              litigation focus
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" /> Licensed in {venueState}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" /> Trial and negotiation experience
            </li>
          </ul>
        </div>
        {attorneyCards.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">Preview of your current top matches</h3>
            <div className="space-y-3">
              {attorneyCards.map((attorney, index) => (
                <div key={attorney.id || attorney.attorney_id || attorney.name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Choice {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{attorney?.name ?? 'Attorney'}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {[
                      attorney?.law_firm?.name ?? 'Law Firm',
                      `${Math.round((attorney.fit_score || 0.6) * 100)}% fit`,
                    ].filter(Boolean).join(' • ')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getAttorneyPracticePreview(attorney, {
                      venueCounty,
                      venueState,
                    }) || getAttorneyWhyMatched(attorney, {
                      assessmentClaimType,
                      venueCounty,
                      venueState,
                    })}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {getAttorneyWhyMatched(attorney, {
                      assessmentClaimType,
                      venueCounty,
                      venueState,
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {(attorney.verifiedReviewCount || 0) > 0
                        ? `${attorney.verifiedReviewCount} verified reviews`
                        : 'New profile'}
                    </span>
                    {((attorney.averageRating || attorney.rating || 0) > 0) && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                        <Star className="mr-1 h-3 w-3" />
                        {(attorney.averageRating || attorney.rating || 0).toFixed(1)} rating
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <Clock className="mr-1 h-3 w-3" />
                      {getResponseBadge(attorney)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>Filing deadline reminder</h2>
        <p className="text-slate-800 font-medium">Approximately {solRemaining} remaining to file a claim, depending on court rules and tolling.</p>
        {solDeadline && <p className="text-xl font-semibold text-slate-900 mt-3 tracking-tight">Notable date: {solDeadline}</p>}
        <p className="text-sm text-amber-800/90 mt-3 leading-relaxed">
          Missing a limitations period can bar recovery. Confirm deadlines with counsel in your jurisdiction.
        </p>
      </div>

      <div className="px-6 sm:px-10 py-9 sm:py-10 bg-slate-50/50 border-b border-slate-200">
        <h2 className={`${sectionTitle} mb-2`}>Export & sharing</h2>
        <p className="text-sm text-slate-600 mb-5 max-w-xl leading-relaxed">
          Download a PDF suitable for your records or forward to counsel. The share link is read-only for recipients.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleDownloadReportPdf()}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-brand-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            {shareCopied ? <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> : <Copy className="h-4 w-4 mr-2" />}
            {shareCopied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      </div>

      {showSavePrompt && (
        <div className="mx-6 sm:mx-10 my-8 rounded-xl border border-brand-200/80 bg-brand-50/60 px-6 py-6">
          <h2 className="font-display text-lg font-semibold text-brand-950">Save this report</h2>
          <p className="mt-2 text-sm text-brand-900/90 leading-relaxed">
            Create an account to return to this matter, track updates, and upload additional records securely.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={`/register?redirect=/dashboard&assessmentId=${assessmentId}`}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 shadow-sm"
            >
              Create account
            </Link>
            <Link
              to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`}
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-brand-800 bg-white border border-brand-200 rounded-lg hover:bg-brand-50/80"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <div className="flex justify-center px-6 pb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-brand-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            Go to dashboard
          </Link>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-slate-50/80 px-6 sm:px-10 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-2">Important limitations</p>
              <ul className="space-y-2 list-disc list-outside pl-4 marker:text-slate-400">
                <li>This report is for informational purposes only and does not constitute legal advice or a lawyer-client relationship.</li>
                <li>Estimates and benchmarks are derived from models and comparable data; actual outcomes depend on facts, law, forum, and parties involved.</li>
                <li>Consult a qualified attorney licensed in your jurisdiction before relying on this analysis for any decision.</li>
                <li>Past results do not guarantee future outcomes.</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
