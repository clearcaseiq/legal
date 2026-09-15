/**
 * The plaintiff's attorney contact order.
 *
 * The screen asks for one decision — who to approach first — rather than a
 * four-way ranking, because the backend already walks the list one attorney at
 * a time and the remaining places are only ever fallbacks. Once a first choice
 * is picked the cards collapse into a compact order the claimant can still
 * rearrange.
 *
 * Reordering runs on pointer events rather than HTML5 drag-and-drop, which
 * never fires from touch input and so left the gesture the old hint advertised
 * dead on every phone.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, Check, CheckCircle, ChevronDown, GripVertical, Star, X } from 'lucide-react'
import type { ContactOrderAttorney, TFn } from '../lib/attorneyContactOrder'

export interface AttorneyContactOrderProps {
  /** Attorneys in contact order; index 0 is approached first. */
  attorneys: ContactOrderAttorney[]
  removed: { id: string; name: string }[]
  /** False until the claimant has actively picked a first choice. */
  firstChoiceChosen: boolean
  readOnly: boolean
  t: TFn
  onChooseFirst: (id: string) => void
  onReorder: (id: string, targetId: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
  onRestore: (id: string) => void
  onEditFirstChoice: () => void
}

const RANK_LABEL_KEYS = [
  'results.contactOrder.rankFirst',
  'results.contactOrder.rankSecond',
  'results.contactOrder.rankThird',
  'results.contactOrder.rankFourth',
]

function rankLabel(t: TFn, index: number): string {
  return index < RANK_LABEL_KEYS.length
    ? t(RANK_LABEL_KEYS[index])
    : t('results.contactOrder.rankOther', { n: index + 1 })
}

function AttorneyIdentity({ attorney, t, compact }: { attorney: ContactOrderAttorney; t: TFn; compact?: boolean }) {
  const size = compact ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm'
  return (
    <>
      <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 font-semibold text-slate-600`}>
        {attorney.photoUrl
          ? <img src={attorney.photoUrl} alt="" draggable={false} className="h-full w-full object-cover" />
          : attorney.initials || 'A'}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 font-semibold text-slate-900">
          <span className="truncate">{attorney.name}</span>
          {attorney.verifiedReviewCount > 0 && <CheckCircle className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />}
        </span>
        <span className="block truncate text-sm text-slate-600">
          {attorney.firmName ?? t('results.calc.lawFirmFallback')}
        </span>
      </span>
    </>
  )
}

function RatingLine({ attorney, t }: { attorney: ContactOrderAttorney; t: TFn }) {
  if (attorney.rating === null) {
    return (
      <p className="flex items-center gap-1.5 text-sm">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {t('results.calc.ratingNew')}
        </span>
        <span className="text-xs text-slate-400">{t('results.calc.ratingNewHint')}</span>
      </p>
    )
  }
  return (
    <p className="flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-semibold text-slate-700">{attorney.rating.toFixed(1)}</span>
      <span className="text-slate-500">{t('results.calc.verifiedReviewCount', { count: attorney.verifiedReviewCount })}</span>
    </p>
  )
}

/**
 * Everything the claimant can see about one attorney, inline.
 *
 * There is no public per-attorney profile page to send them to, and the only
 * per-attorney URL that exists — `/book/:slug` — is a scheduling page that would
 * invite someone to book a meeting with an attorney who has not agreed to take
 * the case. So the detail opens in place, and the decision is never interrupted.
 *
 * Rows are omitted rather than defaulted: an attorney with no bar number on
 * record shows no licence line, instead of a plausible-looking blank.
 */
function AttorneyDetails({ attorney, t }: { attorney: ContactOrderAttorney; t: TFn }) {
  const rows: { label: string; value: string }[] = [
    attorney.credential ? { label: t('results.contactOrder.detailLicensed'), value: attorney.credential } : null,
    attorney.practice ? { label: t('results.contactOrder.detailPractice'), value: attorney.practice } : null,
    attorney.servedVenue ? { label: t('results.contactOrder.detailServes'), value: attorney.servedVenue } : null,
    attorney.yearsExperience > 0
      ? { label: t('results.contactOrder.detailExperience'), value: t('results.calc.yearsExperience', { years: attorney.yearsExperience }) }
      : null,
    attorney.languages.length > 0
      ? { label: t('results.contactOrder.detailLanguages'), value: attorney.languages.join(', ') }
      : null,
    attorney.responseSignal ? { label: t('results.contactOrder.detailResponse'), value: attorney.responseSignal } : null,
    attorney.rating !== null
      ? {
          label: t('results.contactOrder.detailReviews'),
          value: `${attorney.rating.toFixed(1)} ${t('results.calc.verifiedReviewCount', { count: attorney.verifiedReviewCount })}`,
        }
      : null,
    attorney.firmLocation ? { label: t('results.contactOrder.detailFirm'), value: attorney.firmLocation } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <details className="group mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
        {t('results.contactOrder.aboutAttorney')}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      {attorney.reasons.length > 0 && (
        <>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('results.contactOrder.whyMatch')}
          </p>
          <ul className="mt-1 grid gap-1.5">
            {attorney.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-1.5 text-sm text-slate-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {rows.length > 0 ? (
        <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="text-sm text-slate-800">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{t('results.contactOrder.detailsUnavailable')}</p>
      )}
    </details>
  )
}

/** The handful of facts that actually differ between one attorney and the next. */
function Differentiators({ attorney, t }: { attorney: ContactOrderAttorney; t: TFn }) {
  const facts = [
    attorney.practice,
    attorney.servedVenue ? `${t('results.calc.serves')} ${attorney.servedVenue}` : null,
    attorney.yearsExperience > 0 ? t('results.calc.yearsExperience', { years: attorney.yearsExperience }) : null,
    attorney.languages.length > 0 ? t('results.calc.speaksLanguages', { languages: attorney.languages.slice(0, 3).join(', ') }) : null,
    attorney.responseSignal,
  ].filter(Boolean) as string[]

  if (facts.length === 0) return null
  return <p className="text-sm text-slate-600">{facts.join(' · ')}</p>
}

export function AttorneyContactOrder({
  attorneys,
  removed,
  firstChoiceChosen,
  readOnly,
  t,
  onChooseFirst,
  onReorder,
  onMove,
  onRemove,
  onRestore,
  onEditFirstChoice,
}: AttorneyContactOrderProps) {
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // "Contact order updated" — so a reorder that happened under the finger is
  // visibly acknowledged rather than left to the claimant to verify by reading.
  const orderKey = attorneys.map((attorney) => attorney.id).join('|')
  const previousOrderKey = useRef(orderKey)
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  useEffect(() => {
    if (previousOrderKey.current === orderKey) return
    previousOrderKey.current = orderKey
    setOrderConfirmed(true)
    const timer = setTimeout(() => setOrderConfirmed(false), 2600)
    return () => clearTimeout(timer)
  }, [orderKey])

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (readOnly || attorneys.length < 2) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id, pointerId: event.pointerId }
    setDraggingId(id)
  }

  // Reorder live as the pointer passes over a neighbour, so the list under the
  // finger always reflects what releasing would commit.
  const continueDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    for (const attorney of attorneys) {
      if (attorney.id === drag.id) continue
      const rect = rowRefs.current.get(attorney.id)?.getBoundingClientRect()
      if (rect && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        onReorder(drag.id, attorney.id)
        break
      }
    }
  }

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (event.currentTarget.hasPointerCapture?.(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId)
    }
    dragRef.current = null
    setDraggingId(null)
  }

  const single = attorneys.length === 1

  if (!firstChoiceChosen && !readOnly && !single) {
    return (
      <div>
        <header className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">{t('results.contactOrder.title')}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('results.contactOrder.intro')}</p>
          <p className="mt-2 text-xs text-slate-500">{t('results.contactOrder.orderingNote')}</p>
        </header>
        <ul className="space-y-3">
          {attorneys.map((attorney) => (
            <li key={attorney.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <AttorneyIdentity attorney={attorney} t={t} />
              </div>
              <div className="mt-2 space-y-1">
                <RatingLine attorney={attorney} t={t} />
                <Differentiators attorney={attorney} t={t} />
              </div>
              <AttorneyDetails attorney={attorney} t={t} />
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => onChooseFirst(attorney.id)}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {t('results.contactOrder.selectFirst')}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(attorney.id)}
                  className="text-sm font-semibold text-slate-500 hover:text-rose-700 sm:ml-auto"
                >
                  {t('results.calc.remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <RemovedList removed={removed} readOnly={readOnly} t={t} onRestore={onRestore} />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          {single ? t('results.calc.contactThisAttorney') : t('results.contactOrder.yourOrder')}
        </h3>
        {!single && <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('results.contactOrder.intro')}</p>}
      </header>

      <ul className="space-y-2">
        {attorneys.map((attorney, index) => (
          <li
            key={attorney.id}
            ref={(node) => {
              if (node) rowRefs.current.set(attorney.id, node)
              else rowRefs.current.delete(attorney.id)
            }}
            className={`rounded-2xl border px-3 py-3 transition sm:px-4 ${draggingId === attorney.id ? 'opacity-60' : ''} ${
              index === 0 ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-200' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {!readOnly && !single && (
                <button
                  type="button"
                  aria-label={t('results.contactOrder.dragHandleLabel', { name: attorney.name })}
                  style={{ touchAction: 'none' }}
                  onPointerDown={(event) => beginDrag(event, attorney.id)}
                  onPointerMove={continueDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp') { event.preventDefault(); onMove(attorney.id, -1) }
                    if (event.key === 'ArrowDown') { event.preventDefault(); onMove(attorney.id, 1) }
                  }}
                  className="shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                >
                  <GripVertical className="h-5 w-5" aria-hidden />
                </button>
              )}
              <span className="flex shrink-0 flex-col items-center">
                <span className={`text-2xl font-bold leading-none ${index === 0 ? 'text-brand-700' : 'text-slate-400'}`}>
                  {index + 1}
                </span>
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AttorneyIdentity attorney={attorney} t={t} compact />
              </div>
              {!readOnly && !single && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMove(attorney.id, -1)}
                    disabled={index === 0}
                    aria-label={t('results.calc.moveUp')}
                    title={t('results.calc.moveUp')}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4 rotate-180" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(attorney.id, 1)}
                    disabled={index === attorneys.length - 1}
                    aria-label={t('results.calc.moveDown')}
                    title={t('results.calc.moveDown')}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(attorney.id)}
                    aria-label={t('results.calc.remove')}
                    title={t('results.calc.remove')}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>
            <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${index === 0 ? 'text-brand-700' : 'text-slate-500'}`}>
              {rankLabel(t, index)}
              {index === 0 && !single && !readOnly && (
                <button
                  type="button"
                  onClick={onEditFirstChoice}
                  className="ml-2 font-semibold normal-case tracking-normal text-brand-700 underline underline-offset-2 hover:text-brand-800"
                >
                  {t('results.contactOrder.changeFirstChoice')}
                </button>
              )}
            </p>
            <AttorneyDetails attorney={attorney} t={t} />
          </li>
        ))}
      </ul>

      {!readOnly && attorneys.length > 1 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {t('results.contactOrder.dragBackups')}
        </p>
      )}

      <p aria-live="polite" className="mt-2 h-5 text-xs font-semibold text-emerald-700">
        {orderConfirmed && (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t('results.contactOrder.orderUpdated')}
          </span>
        )}
      </p>

      {attorneys.length > 1 && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-600">{t('results.contactOrder.summaryLead')}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold text-slate-800">
            {attorneys.map((attorney, index) => (
              <span key={attorney.id} className="inline-flex items-center gap-1.5">
                {index > 0 && <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
                {attorney.name}
              </span>
            ))}
          </p>
        </div>
      )}

      <RemovedList removed={removed} readOnly={readOnly} t={t} onRestore={onRestore} />
    </div>
  )
}

function RemovedList({
  removed,
  readOnly,
  t,
  onRestore,
}: {
  removed: { id: string; name: string }[]
  readOnly: boolean
  t: TFn
  onRestore: (id: string) => void
}) {
  if (removed.length === 0) return null
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('results.calc.removedHeader')}</p>
      <ul className="mt-1 space-y-1">
        {removed.map((attorney) => (
          <li key={attorney.id} className="flex items-center justify-between gap-3 text-xs text-slate-600">
            <span className="truncate">{attorney.name}</span>
            <button
              type="button"
              onClick={() => onRestore(attorney.id)}
              disabled={readOnly}
              className="shrink-0 font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-40"
            >
              {t('results.calc.addBack')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
