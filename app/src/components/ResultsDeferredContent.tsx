import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronRight, Clock, Copy, Download, LayoutDashboard, Square, Star, Upload } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

type TFunc = (key: string) => string

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

function getResponseBadge(attorney: RankedAttorneyCard, t?: TFunc) {
  if (attorney.responseBadge) return attorney.responseBadge
  const fast = (attorney.responseTimeHours || 24) <= 8
  if (t) return fast ? t('results.common.sameDayReplies') : t('results.common.repliesWithin24h')
  return fast ? 'Same-day replies' : 'Replies within 24h'
}

function formatProtectedMatchScore(attorney: RankedAttorneyCard, index: number) {
  const score = Number(attorney.fit_score)
  if (Number.isFinite(score) && score > 0) {
    return `${score > 1 ? Math.round(score) : Math.round(score * 100)}%`
  }
  return `${94 - index * 3}%`
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

function getAttorneyRecommendationReasons(
  attorney: RankedAttorneyCard,
  context?: {
    assessmentClaimType?: string
    venueState?: string
    venueCounty?: string
  }
) {
  const reasons: string[] = []
  const specialty = context?.assessmentClaimType
    ? formatClaimTypeLabel(context.assessmentClaimType)
    : Array.isArray(attorney.specialties) && attorney.specialties[0]
      ? formatClaimTypeLabel(attorney.specialties[0])
      : ''
  const venue = formatVenueLabel(context?.venueState, context?.venueCounty)
    || attorney.law_firm?.state
    || (Array.isArray(attorney.venues) ? attorney.venues[0] : '')

  if (specialty) reasons.push(`Handles ${specialty} cases`)
  if (venue) reasons.push(`Serves ${venue}`)
  if ((attorney.responseTimeHours || 24) <= 8 || attorney.responseBadge) reasons.push(getResponseBadge(attorney))
  if (attorney.yearsExperience) reasons.push(`${attorney.yearsExperience}+ years of experience`)
  if ((attorney.averageRating || attorney.rating || 0) > 0) reasons.push(`${(attorney.averageRating || attorney.rating || 0).toFixed(1)} average rating`)

  return reasons.length > 0 ? reasons.slice(0, 3) : [getAttorneyWhyMatched(attorney, context)]
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
  const { t } = useLanguage()
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">{t('results.submitted.confirmed')}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mb-3">{t('results.submitted.title')}</h1>
          <p className="text-slate-600 mb-2 leading-relaxed">{t('results.submitted.deliveredSecurely')}</p>
          <p className="text-sm font-medium text-emerald-800">{t('results.submitted.initialResponses')}</p>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-6 mb-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">{t('results.submitted.status')}</h3>
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
          <h3 className="text-base font-semibold text-slate-900 mb-3 tracking-tight">{t('results.submitted.whatHappensNext')}</h3>
          <ul className="text-slate-600 space-y-2 text-[15px] leading-relaxed">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              {t('results.submitted.next1')}
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              {t('results.submitted.next2')}
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              {t('results.submitted.next3')}
            </li>
          </ul>
        </div>

        {attorneyCards.length > 0 && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50/80 p-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-4">{t('results.submitted.rankedPicks')}</h3>
            <div className="space-y-3">
              {attorneyCards.map((attorney, index) => (
                <div key={attorney.id || attorney.attorney_id || attorney.name} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('results.submitted.choice')} {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{attorney?.name ?? t('results.submitted.attorney')}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {[
                      attorney?.law_firm?.name ?? t('results.submitted.lawFirm'),
                      `${Math.round((attorney.fit_score || 0.6) * 100)}% ${t('results.common.fit')}`,
                      getResponseBadge(attorney, t),
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
                  <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{t('results.submitted.whyRecommend')}</p>
                    <ul className="mt-1 space-y-1 text-[11px] text-brand-900">
                      {getAttorneyRecommendationReasons(attorney, {
                        assessmentClaimType,
                        venueCounty,
                        venueState,
                      }).map((reason) => (
                        <li key={reason} className="flex items-start gap-1.5">
                          <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand-600" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {(attorney.verifiedReviewCount || 0) > 0
                        ? `${attorney.verifiedReviewCount} ${t('results.common.verifiedReviews')}`
                        : t('results.submitted.newProfile')}
                    </span>
                    {((attorney.averageRating || attorney.rating || 0) > 0) && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                        <Star className="mr-1 h-3 w-3" />
                        {(attorney.averageRating || attorney.rating || 0).toFixed(1)} {t('results.common.rating')}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <Clock className="mr-1 h-3 w-3" />
                      {getResponseBadge(attorney, t)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-6 mb-8">
          <h3 className="text-base font-semibold text-slate-900 mb-2 tracking-tight">{t('results.submitted.strengthenTitle')}</h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{t('results.submitted.strengthenDesc')}</p>
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
            {t('results.submitted.uploadEvidence')}
          </Link>
        </div>

        {showSavePrompt && (
          <div className="mb-8 rounded-xl border-2 border-brand-200 bg-brand-50 px-6 py-6">
            <h2 className="text-lg font-semibold text-brand-900">{t('results.submitted.saveTitle')}</h2>
            <p className="mt-2 text-brand-800">{t('results.submitted.saveDesc')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={`/register?redirect=/dashboard&assessmentId=${assessmentId}`}
                className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
              >
                {t('results.submitted.createAccount')}
              </Link>
              <Link
                to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`}
                className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100"
              >
                {t('results.submitted.signIn')}
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
            {t('results.submitted.goToDashboard')}
          </Link>
        ) : (
          <p className="text-center text-sm text-gray-500">
            {t('results.submitted.alreadyHaveAccount')}{' '}
            <Link to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`} className="text-brand-600 font-medium">
              {t('results.submitted.signIn')}
            </Link>{' '}
            {t('results.submitted.toSaveCase')}
          </p>
        )}
      </div>

      <div className="px-6 py-5 border-t border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 justify-center text-sm">
        <button type="button" onClick={() => void handleDownloadReportPdf()} className="font-semibold text-brand-800 hover:text-brand-950">
          {t('results.common.downloadPdf')}
        </button>
        <button type="button" onClick={handleCopyShareLink} className="font-semibold text-brand-800 hover:text-brand-950">
          {shareCopied ? t('results.common.linkCopied') : t('results.common.copyLink')}
        </button>
      </div>

      <div className="px-6 sm:px-10 py-6 border-t border-slate-200 bg-slate-50/80">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold text-slate-900">{t('results.submitted.limitationsLabel')}</span>
              {t('results.submitted.limitationsBody')}
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
  solDeadline,
  solRemaining,
  settlementHigh,
  settlementLow,
  venueCounty,
  venueState,
  whatThisMeansBullets,
}: ResultsReportDetailsProps) {
  const { t } = useLanguage()
  const sectionTitle = 'font-display text-lg font-semibold text-slate-900 tracking-tight'
  const sectionWrap = 'border-b border-slate-200 px-6 sm:px-10 py-9 sm:py-10'
  const prose = 'text-[15px] text-slate-700 leading-relaxed'
  const bullets = Array.isArray(whatThisMeansBullets) ? whatThisMeansBullets : []
  const improvementItems = Array.isArray(improveCaseValueItems) ? improveCaseValueItems : []
  const attorneyCards = Array.isArray(rankedAttorneys) ? rankedAttorneys : []
  // Track open state in React rather than relying solely on the `group-open`
  // Tailwind variant, which wasn't toggling the label reliably (#16).
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <details
      className="group mt-8 rounded-none border border-slate-200/90 bg-white shadow-card sm:rounded-2xl overflow-hidden"
      open={reportOpen}
      onToggle={(e) => setReportOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none border-b border-slate-200 bg-slate-50/50 px-6 sm:px-10 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <img
              src="/clearcaseiq-logo-transparent.png?v=1"
              alt="ClearCaseIQ"
              className="h-7 w-auto object-contain"
            />
            <p className="mt-1 text-sm font-semibold text-slate-900">{t('results.report.fullReportTitle')}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t('results.report.fullReportDesc')}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {reportOpen ? t('results.report.hideFullReport') : t('results.report.showFullReport')}
          </span>
        </div>
      </summary>
      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>{t('results.report.executiveSummary')}</h2>
        <ul className={`${prose} space-y-3 list-none pl-0`}>
          {(bullets.length > 0 ? bullets : [
            t('results.report.execBullet1'),
            t('results.report.execBullet2'),
            t('results.report.execBullet3'),
            `${venueState === 'CA' ? 'California' : venueState}: ${settlementLow} - ${settlementHigh}`,
          ]).map((bullet, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>{t('results.report.strengtheningTitle')}</h2>
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
        <p className="text-sm text-slate-600 mb-4">{t('results.report.documentationCompleteness')} <span className="font-semibold text-slate-800">{evidenceCompletionPercent}%</span></p>
        <Link
          to={`/evidence-upload/${assessmentId}`}
          className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 shadow-sm transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          {t('results.report.uploadEvidence')}
        </Link>
      </div>

      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>{t('results.report.attorneyReview')}</h2>
        <p className={`${prose} mb-3`}>
          {t('results.report.attorneyReviewP1')}
        </p>
        <p className={`${prose} mb-2`}>{t('results.report.attorneyReviewP2')}</p>
        <p className="text-sm text-slate-500 mb-6">{t('results.report.attorneyReviewP3')}</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">{t('results.report.typicalPanel')}</h3>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" /> {t('results.report.panelExperience')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              {assessmentClaimType === 'auto'
                ? t('results.report.panelFocusAuto')
                : assessmentClaimType === 'slip_and_fall'
                  ? t('results.report.panelFocusPremises')
                  : assessmentClaimType === 'medmal'
                    ? t('results.report.panelFocusMedmal')
                    : t('results.report.panelFocusGeneral')}{' '}
              {t('results.report.panelFocusSuffix')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" /> {t('results.report.panelLicensed')} {venueState}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" /> {t('results.report.panelTrial')}
            </li>
          </ul>
        </div>
        {attorneyCards.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">{t('results.report.topMatches')}</h3>
            <p className="mb-3 text-xs text-slate-500">{t('results.report.namesRevealed')}</p>
            <div className="space-y-3">
              {attorneyCards.map((attorney, index) => (
                <div key={attorney.id || attorney.attorney_id || attorney.name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('results.report.match')} #{index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatProtectedMatchScore(attorney, index)} {t('results.report.match')}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {[
                      t('results.report.identityProtected'),
                      `${formatProtectedMatchScore(attorney, index)} ${t('results.common.fit')}`,
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
                        ? `${attorney.verifiedReviewCount} ${t('results.common.verifiedReviews')}`
                        : t('results.submitted.newProfile')}
                    </span>
                    {((attorney.averageRating || attorney.rating || 0) > 0) && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                        <Star className="mr-1 h-3 w-3" />
                        {(attorney.averageRating || attorney.rating || 0).toFixed(1)} {t('results.common.rating')}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <Clock className="mr-1 h-3 w-3" />
                      {getResponseBadge(attorney, t)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={sectionWrap}>
        <h2 className={`${sectionTitle} mb-4`}>{t('results.report.filingDeadline')}</h2>
        <p className="text-slate-800 font-medium">{t('results.report.filingRemainingPrefix')} {solRemaining} {t('results.report.filingRemainingSuffix')}</p>
        {solDeadline && <p className="text-xl font-semibold text-slate-900 mt-3 tracking-tight">{t('results.report.notableDate')} {solDeadline}</p>}
        <p className="text-sm text-amber-800/90 mt-3 leading-relaxed">
          {t('results.report.filingWarning')}
        </p>
      </div>

      <div className="px-6 sm:px-10 py-9 sm:py-10 bg-slate-50/50 border-b border-slate-200">
        <h2 className={`${sectionTitle} mb-2`}>{t('results.report.exportSharing')}</h2>
        <p className="text-sm text-slate-600 mb-5 max-w-xl leading-relaxed">
          {t('results.report.exportDesc')}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleDownloadReportPdf()}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-brand-700 rounded-lg hover:bg-brand-800 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('results.common.downloadPdf')}
          </button>
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-brand-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            {shareCopied ? <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> : <Copy className="h-4 w-4 mr-2" />}
            {shareCopied ? t('results.common.linkCopied') : t('results.common.copyLink')}
          </button>
        </div>
      </div>

      {isLoggedIn && (
        <div className="flex justify-center px-6 pb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-brand-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            {t('results.report.goToDashboard')}
          </Link>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-slate-50/80 px-6 sm:px-10 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-2">{t('results.report.importantLimitations')}</p>
              <ul className="space-y-2 list-disc list-outside pl-4 marker:text-slate-400">
                <li>{t('results.report.limit1')}</li>
                <li>{t('results.report.limit2')}</li>
                <li>{t('results.report.limit3')}</li>
                <li>{t('results.report.limit4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </details>
  )
}
