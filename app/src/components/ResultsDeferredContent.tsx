import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronRight, Clock, Copy, Download, LayoutDashboard, ShieldCheck, Square, Star, TrendingUp, Upload } from 'lucide-react'
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
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-card">
        {/* Success hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 px-6 py-10 text-center text-white sm:px-10">
          <span className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <span className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-emerald-300/20 blur-2xl" aria-hidden />
          <div className="relative">
            <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
              <CheckCircle className="h-9 w-9 text-white" aria-hidden />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-50/90">{t('results.submitted.confirmed')}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t('results.submitted.title')}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-emerald-50/90">{t('results.submitted.deliveredSecurely')}</p>
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/25">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t('results.submitted.initialResponses')}
            </p>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-10">
          {/* Status stepper */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t('results.submitted.status')}</h3>
            <ol className="mt-4">
              {timeline.map((step, index) => (
                <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span className="absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px bg-slate-200" aria-hidden />
                  )}
                  {step.done ? (
                    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle className="h-4 w-4" aria-hidden />
                    </span>
                  ) : (
                    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-[11px] font-semibold text-slate-500">
                      {index + 1}
                    </span>
                  )}
                  <span className={`pt-0.5 text-sm ${step.done ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{step.label}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* What happens next */}
          <div className="mt-6">
            <h3 className="font-display text-base font-semibold tracking-tight text-slate-900">{t('results.submitted.whatHappensNext')}</h3>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                {t('results.submitted.next1')}
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                {t('results.submitted.next2')}
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                {t('results.submitted.next3')}
              </li>
            </ul>
          </div>

          {/* Save your case — the key next action for guests */}
          {showSavePrompt && (
            <div className="mt-6 rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-brand-900">{t('results.submitted.saveTitle')}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-brand-800/90">{t('results.submitted.saveDesc')}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  to={`/register?redirect=/dashboard&assessmentId=${assessmentId}`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 sm:w-auto"
                >
                  {t('results.submitted.createAccount')}
                </Link>
                <Link
                  to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:w-auto"
                >
                  {t('results.submitted.signIn')}
                </Link>
              </div>
            </div>
          )}

          {attorneyCards.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{t('results.submitted.rankedPicks')}</h3>
              <div className="mt-4 space-y-3">
                {attorneyCards.map((attorney, index) => (
                  <div key={attorney.id || attorney.attorney_id || attorney.name} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
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

          {/* Strengthen your file */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-display text-base font-semibold tracking-tight text-slate-900">{t('results.submitted.strengthenTitle')}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('results.submitted.strengthenDesc')}</p>
            <ul className="mt-4 space-y-2">
              {improvementItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <Square className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  )}
                  <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-900'}>{item.label}</span>
                </li>
              ))}
            </ul>
            <Link
              to={`/evidence-upload/${assessmentId}`}
              className="mt-4 inline-flex items-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('results.submitted.uploadEvidence')}
            </Link>
          </div>

          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-lg font-semibold text-white hover:bg-brand-700"
            >
              <LayoutDashboard className="h-5 w-5" />
              {t('results.submitted.goToDashboard')}
            </Link>
          ) : (
            <p className="mt-6 text-center text-sm text-slate-500">
              {t('results.submitted.alreadyHaveAccount')}{' '}
              <Link to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`} className="font-medium text-brand-600">
                {t('results.submitted.signIn')}
              </Link>{' '}
              {t('results.submitted.toSaveCase')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4 border-t border-slate-200 bg-slate-50/60 px-6 py-4 text-sm">
          <button type="button" onClick={() => void handleDownloadReportPdf()} className="inline-flex items-center gap-1.5 font-semibold text-brand-800 hover:text-brand-950">
            <Download className="h-4 w-4" aria-hidden />
            {t('results.common.downloadPdf')}
          </button>
          <button type="button" onClick={handleCopyShareLink} className="inline-flex items-center gap-1.5 font-semibold text-brand-800 hover:text-brand-950">
            <Copy className="h-4 w-4" aria-hidden />
            {shareCopied ? t('results.common.linkCopied') : t('results.common.copyLink')}
          </button>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-10">
          <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <p className="text-sm leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">{t('results.submitted.limitationsLabel')}</span>
              {t('results.submitted.limitationsBody')}
            </p>
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
