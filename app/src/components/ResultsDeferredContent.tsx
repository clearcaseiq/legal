import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle, ChevronRight, Clock, Copy, Download, FileText, Info, LayoutDashboard, ShieldCheck, Square, Star, TrendingUp, Upload, User, Users, X } from 'lucide-react'
import BrandLogo from './BrandLogo'
import { useLanguage } from '../contexts/LanguageContext'
import { formatClaimType } from '../lib/claimTypes'
import { formatAttorneyLicensure } from '../lib/attorneyLicensure'
import { savePendingRegistration } from '../lib/pendingRegistration'

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
  bar_number?: string | null
  bar_state?: string | null
  law_firm?: { name?: string; city?: string; state?: string }
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

// Lower-cased because these labels are read mid-sentence ("strong for … matters").
function formatClaimTypeLabel(claimType?: string) {
  return formatClaimType(claimType).toLowerCase()
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
  referenceCode?: string | null
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
  /** Contact collected on the choose-attorney screen — prefill Create Account. */
  contactPrefill?: { firstName?: string; email?: string; phone?: string }
}

export function ResultsSubmittedView({
  assessmentId,
  referenceCode,
  handleDownloadReportPdf,
  handleCopyShareLink,
  isLoggedIn,
  rankedAttorneys,
  shareCopied,
  contactPrefill,
}: ResultsSubmittedViewProps) {
  const { t } = useLanguage()
  const [refCopied, setRefCopied] = useState(false)
  const stashContactForSignup = () => {
    if (assessmentId) {
      try {
        localStorage.setItem('pending_assessment_id', assessmentId)
      } catch {
        /* ignore */
      }
    }
    if (contactPrefill) {
      savePendingRegistration({
        firstName: contactPrefill.firstName,
        email: contactPrefill.email,
        phone: contactPrefill.phone,
      })
    }
  }
  const copyReference = () => {
    if (!referenceCode) return
    try {
      void navigator.clipboard?.writeText(referenceCode)
      setRefCopied(true)
      window.setTimeout(() => setRefCopied(false), 1600)
    } catch { /* clipboard unavailable — the code is still shown */ }
  }
  const attorneyCards = Array.isArray(rankedAttorneys) ? rankedAttorneys : []
  const ordinal = (n: number) => {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
  }
  const initials = (name?: string) =>
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || '—'
  const sharedItems = ['sharedSummary', 'sharedContact', 'sharedBasics']
  const notSharedItems = ['notSharedRecords', 'notSharedBills', 'notSharedTreatment']
  const trackFeatures = ['trackFeatResponses', 'trackFeatStatus', 'trackFeatMessages', 'trackFeatUpload']
  const reportHref = assessmentId ? `/results/${assessmentId}?view=report` : '/dashboard'

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 overflow-safe px-0 py-6 sm:px-6 lg:px-8">
      {/* Success hero */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-white p-6 shadow-card sm:p-7">
        <span className="pointer-events-none absolute left-5 top-4 h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        <span className="pointer-events-none absolute left-16 top-8 h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden />
        <span className="pointer-events-none absolute left-10 top-14 h-1 w-1 rounded-full bg-emerald-300" aria-hidden />
        <span className="pointer-events-none absolute right-24 top-6 h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
        <div className="relative flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100">
            <CheckCircle className="h-8 w-8" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight text-emerald-900 sm:text-2xl">{t('results.submitted.sentTitle')}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-800/90">{t('results.submitted.sentSubtitle')}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t('results.submitted.typicalResponse')}
            </p>
          </div>
          <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 sm:flex" aria-hidden>
            <ShieldCheck className="h-8 w-8" />
          </span>
        </div>
      </div>

      {/* Case reference */}
      {referenceCode && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
          <p className="min-w-0 truncate text-sm text-slate-700">
            {t('results.submitted.caseReferenceInline')}{' '}
            <span className="font-mono text-sm font-bold tracking-wide text-slate-900">{referenceCode}</span>
          </p>
          <button
            type="button"
            onClick={copyReference}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {refCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {refCopied ? t('results.submitted.copied') : t('results.submitted.copy')}
          </button>
        </div>
      )}

      {/* What happens next */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('results.submitted.whatHappensNext')}</h3>
        <div className="mt-4 flex items-start justify-between gap-1">
          <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-xs font-semibold text-slate-900">{t('results.submitted.stepCaseSent')}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">{t('results.submitted.stepComplete')}</p>
          </div>
          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
          <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-xs font-semibold text-slate-900">{t('results.submitted.stepAttorneyReview')}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">{t('results.submitted.stepNow')}</p>
          </div>
          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
          <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <User className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-xs font-semibold text-slate-500">{t('results.submitted.stepYouDecide')}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('results.submitted.stepComingNext')}</p>
          </div>
        </div>
      </div>

      {/* Your attorney review */}
      {attorneyCards.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('results.submitted.attorneyReviewTitle')}</h3>
            <Link to={reportHref} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
              <Info className="h-3.5 w-3.5" aria-hidden />
              {t('results.submitted.howItWorks')}
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50/70 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t('results.submitted.caseSubmittedLabel')}</p>
              <p className="text-xs text-slate-500">{t('results.submitted.todayLabel')}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">{t('results.submitted.stepComplete')}</span>
          </div>

          <ol className="mt-3 divide-y divide-slate-100">
            {attorneyCards.map((attorney, index) => {
              const reviewing = index === 0
              return (
                <li key={attorney.id || attorney.attorney_id || attorney.name} className="flex items-start gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {initials(attorney.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{attorney?.name ?? t('results.submitted.attorney')}</p>
                    <p className="truncate text-xs text-slate-500">{attorney?.law_firm?.name ?? t('results.submitted.lawFirm')}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {ordinal(index + 1)} {t('results.submitted.choiceWord')}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    {reviewing ? (
                      <>
                        <p className="inline-flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                          <Clock className="h-3 w-3" aria-hidden />
                          {t('results.submitted.statusReviewing')}
                        </p>
                        <p className="text-[11px] text-slate-500">{t('results.submitted.statusWaiting')}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-brand-600">{t('results.submitted.notifyWhenHear')}</p>
                      </>
                    ) : (
                      <>
                        <p className="inline-flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <Clock className="h-3 w-3" aria-hidden />
                          {t('results.submitted.statusNextIfNeeded')}
                        </p>
                        <p className="text-[11px] text-slate-500">{t('results.submitted.contactedIfNoResponse')}</p>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            {t('results.submitted.autoAdvanceNote')}
          </p>
        </div>
      )}

      {/* What we shared / not shared */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('results.submitted.whatWeSharedTitle')}</h4>
            <ul className="mt-3 space-y-2">
              {sharedItems.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  {t(`results.submitted.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('results.submitted.notSharedTitle')}</h4>
            <ul className="mt-3 space-y-2">
              {notSharedItems.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm text-slate-500">
                  <X className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  {t(`results.submitted.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <p className="text-xs leading-snug text-slate-600">
            {t('results.submitted.authorizeLater')}{' '}
            <Link to="/privacy" className="font-semibold text-brand-600 hover:text-brand-700">{t('results.submitted.learnPrivacy')}</Link>
          </p>
        </div>
      </div>

      {/* Track your case (guest) or dashboard (logged in) */}
      {isLoggedIn ? (
        <Link
          to="/dashboard"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 text-base font-semibold text-white shadow-card hover:bg-brand-700"
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden />
          {t('results.submitted.goToDashboard')}
        </Link>
      ) : (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <LayoutDashboard className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-brand-900">{t('results.submitted.trackTitle')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-brand-800/90">{t('results.submitted.trackDesc')}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {trackFeatures.map((key) => (
              <p key={key} className="flex items-center gap-2 text-sm text-brand-900">
                <CheckCircle className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                {t(`results.submitted.${key}`)}
              </p>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              to={`/register?redirect=/dashboard&assessmentId=${assessmentId}`}
              onClick={stashContactForSignup}
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 sm:w-auto"
            >
              {t('results.submitted.createFreeAccount')}
            </Link>
            <Link
              to={`/login?redirect=/dashboard&assessmentId=${assessmentId}`}
              onClick={stashContactForSignup}
              className="inline-flex w-full items-center justify-center rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:w-auto"
            >
              {t('results.submitted.signIn')}
            </Link>
          </div>
          <p className="mt-3 text-xs text-brand-800/70">{t('results.submitted.trackFootnote')}</p>
        </div>
      )}

      {/* View your case report */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">{t('results.submitted.reportTitle')}</h3>
            <p className="mt-0.5 text-sm text-slate-600">{t('results.submitted.reportDesc')}</p>
          </div>
        </div>
        <Link
          to={reportHref}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t('results.submitted.viewReportBtn')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {/* Secondary actions */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <button type="button" onClick={() => void handleDownloadReportPdf()} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-900">
          <Download className="h-4 w-4" aria-hidden />
          {t('results.common.downloadPdf')}
        </button>
        <button type="button" onClick={handleCopyShareLink} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-900">
          <Copy className="h-4 w-4" aria-hidden />
          {shareCopied ? t('results.common.linkCopied') : t('results.common.copyLink')}
        </button>
      </div>

      {/* Limitations disclaimer */}
      <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">{t('results.submitted.limitationsLabel')}</span>
          {t('results.submitted.limitationsBody')}
        </p>
      </div>
    </div>
  )
}

type ResultsReportDetailsProps = {
  assessmentId: string
  assessmentClaimType?: string
  caseSubmittedForReview?: boolean
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
  caseSubmittedForReview = false,
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
            <BrandLogo appName={t('common.appName')} size="md" />
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
          {t(caseSubmittedForReview ? 'results.report.attorneyReviewSubmittedP1' : 'results.report.attorneyReviewP1')}
        </p>
        <p className={`${prose} mb-2`}>
          {t(caseSubmittedForReview ? 'results.report.attorneyReviewSubmittedP2' : 'results.report.attorneyReviewP2')}
        </p>
        <p className="text-sm text-slate-500 mb-6">
          {t(caseSubmittedForReview ? 'results.report.attorneyReviewSubmittedP3' : 'results.report.attorneyReviewP3')}
        </p>
        {!caseSubmittedForReview && (
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
        )}
        {attorneyCards.length > 0 && (
          <div className={`${caseSubmittedForReview ? '' : 'mt-5 '}rounded-xl border border-slate-200 bg-white px-5 py-5`}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
              {t(caseSubmittedForReview ? 'results.report.topMatchesSubmitted' : 'results.report.topMatches')}
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              {t(caseSubmittedForReview ? 'results.report.namesRevealedSubmitted' : 'results.report.namesRevealed')}
            </p>
            <div className="space-y-3">
              {attorneyCards.map((attorney, index) => (
                <div key={attorney.id || attorney.attorney_id || attorney.name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {caseSubmittedForReview
                      ? `${t('results.submitted.choice')} ${index + 1}`
                      : `${t('results.report.match')} #${index + 1}`}
                  </p>
                  {caseSubmittedForReview ? (
                    <>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {attorney?.name ?? t('results.submitted.attorney')}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {[
                          attorney?.law_firm?.name ?? t('results.submitted.lawFirm'),
                          `${formatProtectedMatchScore(attorney, index)} ${t('results.common.fit')}`,
                          getResponseBadge(attorney, t),
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatProtectedMatchScore(attorney, index)} {t('results.report.match')}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {[
                          t('results.report.identityProtected'),
                          `${formatProtectedMatchScore(attorney, index)} ${t('results.common.fit')}`,
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </>
                  )}
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
            {caseSubmittedForReview && (
              <Link
                to="/dashboard"
                className="mt-4 inline-flex items-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('results.report.goToDashboard')}
              </Link>
            )}
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
        // Extra horizontal/vertical padding so the CTA isn't flush against the
        // page edge on the Case Snapshot report (CP-517).
        <div className="flex justify-center px-6 pb-10 pt-2 sm:px-10">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-brand-800 shadow-sm hover:bg-slate-50"
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
