import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Compass, X } from 'lucide-react'
import api from '../../lib/http'
import { getAttorneyDashboard } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { useFirmAccess } from '../../hooks/useFirmAccess'
import { getStoredRole } from '../../lib/auth'
import { useOptionalAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import {
  OFFER_READY_TARGET,
  OFFER_TOUR,
  TOURS,
  TOURS_BY_SCOPE,
  chromeKey,
  copyKey,
  resolveRoute,
  samePage,
  stepsFor,
  withKeptQuery,
  type TourId,
  type TourScope,
  type TourStep,
} from './tours'

export type TourStatus = 'started' | 'completed' | 'dismissed'
export type TourProgress = Partial<Record<TourId, { status: TourStatus; lastStep: number }>>

type ActiveRun = { tourId: TourId; steps: TourStep[]; index: number; leadId: string | null }

type TourContextValue = {
  progress: TourProgress
  loaded: boolean
  /** Tours offered here, in display order. */
  tourIds: TourId[]
  activeTourId: TourId | null
  startTour: (tourId: TourId) => Promise<void>
  /** Steps this user would see; role-filtered. */
  stepCount: (tourId: TourId) => number
}

const TourContext = createContext<TourContextValue | null>(null)

const RUN_KEY = 'cciq.tour.run'
const OFFER_SNOOZED_KEY = 'cciq.tour.offerSnoozed'
const TARGET_WAIT_MS = 4000
const ACCEPTED_STATUSES = ['contacted', 'consulted', 'retained']

function readRun(scope: TourScope): ActiveRun | null {
  try {
    const raw = sessionStorage.getItem(RUN_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as { tourId: TourId; stepIds: string[]; index: number; leadId: string | null }
    const tour = TOURS[saved.tourId]
    if (!tour || tour.scope !== scope) return null
    const steps = saved.stepIds
      .map((id) => tour.steps.find((s) => s.id === id))
      .filter((s): s is TourStep => Boolean(s))
    return steps.length ? { tourId: saved.tourId, steps, index: Math.min(saved.index, steps.length - 1), leadId: saved.leadId } : null
  } catch {
    return null
  }
}

function writeRun(run: ActiveRun | null) {
  try {
    if (!run) sessionStorage.removeItem(RUN_KEY)
    else
      sessionStorage.setItem(
        RUN_KEY,
        JSON.stringify({ tourId: run.tourId, stepIds: run.steps.map((s) => s.id), index: run.index, leadId: run.leadId }),
      )
  } catch {
    /* private mode: the tour just won't survive a refresh */
  }
}

/** Resolves when `[data-tour=target]` is on the page, or null after the timeout. */
function waitForTarget(target: string, signal: { cancelled: boolean }, timeoutMs = TARGET_WAIT_MS): Promise<Element | null> {
  const selector = `[data-tour="${target}"]`
  // Visible only: the sidebar is in the DOM but display:none on small screens.
  const find = () =>
    Array.from(document.querySelectorAll(selector)).find((el) => el.getClientRects().length > 0) ?? null
  return new Promise((resolve) => {
    const found = find()
    if (found) return resolve(found)
    const observer = new MutationObserver(() => {
      const el = find()
      if (el || signal.cancelled) {
        observer.disconnect()
        window.clearTimeout(timer)
        resolve(signal.cancelled ? null : el)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-tour'] })
    const timer = window.setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeoutMs)
  })
}

function leadIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/attorney-dashboard\/(?:cases|lead)\/([^/]+)\/[^/]+/)
  const reserved = new Set(['active', 'calendar', 'messages', 'documents', 'tasks', 'billing', 'firm', 'intake'])
  return m && !reserved.has(m[1]) ? m[1] : null
}

/**
 * Mounted by the workspace layout, by pages outside it that a tour visits
 * (Firm Settings), and around the claimant portal (`scope="client"`). The run
 * lives in sessionStorage, so each mount picks it up. `offer` is off on those
 * outside pages so the welcome card shows in one place.
 */
export function TourProvider({
  children,
  offer = true,
  scope = 'workspace',
}: {
  children: ReactNode
  offer?: boolean
  scope?: TourScope
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const workspace = useOptionalAttorneyWorkspace()
  const isStaff = scope === 'workspace' && (workspace?.isStaff ?? getStoredRole() === 'staff')
  const isFirmAdmin = workspace?.isFirmAdmin ?? false
  const workspaceLoading = workspace?.loading ?? false
  const { access } = useFirmAccess(scope === 'workspace')
  const offerTourId = OFFER_TOUR[scope]

  const [progress, setProgress] = useState<TourProgress>({})
  const [loaded, setLoaded] = useState(false)
  const [run, setRun] = useState<ActiveRun | null>(() => readRun(scope))
  const [offerOpen, setOfferOpen] = useState(false)
  const [noCaseOpen, setNoCaseOpen] = useState(false)
  const driverRef = useRef<Driver | null>(null)
  const navigatedForRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/v1/tours')
      .then(({ data }) => {
        if (cancelled) return
        const next: TourProgress = {}
        for (const row of data?.tours || []) next[row.tourId as TourId] = { status: row.status, lastStep: row.lastStep }
        setProgress(next)
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])

  const saveProgress = useCallback((tourId: TourId, status: TourStatus, lastStep: number) => {
    setProgress((prev) => ({ ...prev, [tourId]: { status, lastStep } }))
    api.put(`/v1/tours/${tourId}`, { status, lastStep }).catch(() => undefined)
  }, [])

  // First visit: offer this scope's tour once, unless snoozed for this session.
  // Where the tour needs page content (the client's case), wait until it shows.
  useEffect(() => {
    if (!offer || !loaded || workspaceLoading || run) return
    let snoozed = false
    try {
      snoozed = sessionStorage.getItem(OFFER_SNOOZED_KEY) === '1'
    } catch {
      /* ignore */
    }
    if (progress[offerTourId] || snoozed) return
    const readyTarget = OFFER_READY_TARGET[scope]
    if (!readyTarget) {
      setOfferOpen(true)
      return
    }
    const signal = { cancelled: false }
    void waitForTarget(readyTarget, signal, 30_000).then((el) => {
      if (el && !signal.cancelled) setOfferOpen(true)
    })
    return () => {
      signal.cancelled = true
    }
  }, [offer, loaded, workspaceLoading, run, progress, offerTourId, scope])

  const audience = useMemo(
    () => ({
      isStaff,
      isFirmAdmin,
      staffActions: (access?.actions || {}) as Record<string, boolean>,
      staffPermissions: access?.permissions || [],
    }),
    [isStaff, isFirmAdmin, access],
  )

  const updateRun = useCallback((next: ActiveRun | null) => {
    writeRun(next)
    setRun(next)
  }, [])

  const startTour = useCallback(
    async (tourId: TourId) => {
      setOfferOpen(false)
      setNoCaseOpen(false)
      const tour = TOURS[tourId]
      const steps = stepsFor(tour, audience)
      let leadId: string | null = null
      if (tour.needsCase) {
        leadId = leadIdFromPath(location.pathname)
        if (!leadId) {
          try {
            const data: any = await getAttorneyDashboard()
            const lead = (data?.recentLeads || []).find((l: any) => ACCEPTED_STATUSES.includes(l?.status || ''))
            leadId = lead?.id ?? null
          } catch {
            leadId = null
          }
        }
        if (!leadId) {
          setNoCaseOpen(true)
          return
        }
      }
      if (!steps.length) return
      saveProgress(tourId, 'started', 0)
      updateRun({ tourId, steps, index: 0, leadId })
    },
    [audience, location.pathname, saveProgress, updateRun],
  )

  const finish = useCallback(
    (status: 'completed' | 'dismissed') => {
      if (!run) return
      driverRef.current?.destroy()
      driverRef.current = null
      saveProgress(run.tourId, status, run.index)
      updateRun(null)
    },
    [run, saveProgress, updateRun],
  )

  const goTo = useCallback(
    (index: number) => {
      if (!run) return
      if (index >= run.steps.length) return finish('completed')
      if (index < 0) return
      saveProgress(run.tourId, 'started', index)
      updateRun({ ...run, index })
    },
    [run, finish, saveProgress, updateRun],
  )

  // Drive the active step: open its page, wait for its element, highlight it.
  useEffect(() => {
    if (!run) return
    const step = run.steps[run.index]
    const route = resolveRoute(step, run.leadId)
    if (!route) {
      finish('dismissed')
      return
    }
    const stepKey = `${run.tourId}:${run.index}`
    if (!samePage(location.pathname, location.search, route) && navigatedForRef.current !== stepKey) {
      // Once per step: if the page redirects (permissions), fall through to the
      // target wait, which skips the step instead of bouncing forever.
      navigatedForRef.current = stepKey
      driverRef.current?.destroy()
      driverRef.current = null
      navigate(withKeptQuery(route, location.search, TOURS[run.tourId].keepQuery))
      return
    }

    const signal = { cancelled: false }
    void waitForTarget(step.target, signal, step.waitMs).then((element) => {
      if (signal.cancelled) return
      if (!element) {
        // Not on this page for this user (empty state, permission): skip it.
        goTo(run.index + 1)
        return
      }
      driverRef.current?.destroy()
      const isLast = run.index === run.steps.length - 1
      const drv = driver({
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 12,
        popoverClass: 'cciq-tour-popover',
        // Not onDestroyStarted: with it set, our own destroy() between steps
        // only fires the hook and leaves the highlight on screen.
        onDestroyed: (_el, _step, opts) => {
          if (opts.reason === 'escape' || opts.reason === 'overlay') {
            if (!signal.cancelled) finish('dismissed')
          }
        },
      })
      driverRef.current = drv
      drv.highlight({
        element,
        popover: {
          title: t(copyKey(run.tourId, step.id, 'title')),
          description: t(copyKey(run.tourId, step.id, 'body')),
          showButtons: run.index > 0 ? ['next', 'previous', 'close'] : ['next', 'close'],
          showProgress: true,
          progressText: t(chromeKey(run.tourId, 'progress'), { current: run.index + 1, total: run.steps.length }),
          nextBtnText: isLast ? t(chromeKey(run.tourId, 'done')) : t(chromeKey(run.tourId, 'next')),
          prevBtnText: t(chromeKey(run.tourId, 'back')),
          onNextClick: () => goTo(run.index + 1),
          onPrevClick: () => goTo(run.index - 1),
          onCloseClick: () => finish('dismissed'),
        },
      })
    })
    return () => {
      signal.cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, location.pathname, location.search])

  useEffect(
    () => () => {
      driverRef.current?.destroy()
    },
    [],
  )

  const snoozeOffer = () => {
    setOfferOpen(false)
    try {
      sessionStorage.setItem(OFFER_SNOOZED_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<TourContextValue>(
    () => ({
      progress,
      loaded,
      tourIds: TOURS_BY_SCOPE[scope],
      activeTourId: run?.tourId ?? null,
      startTour,
      stepCount: (tourId: TourId) => stepsFor(TOURS[tourId], audience).length,
    }),
    [progress, loaded, scope, run, startTour, audience],
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {offerOpen && !run ? (
        <TourCard
          title={t(chromeKey(offerTourId, 'offer.title'))}
          body={t(chromeKey(offerTourId, 'offer.body'))}
          onClose={snoozeOffer}
          actions={
            <>
              <button
                type="button"
                onClick={() => void startTour(offerTourId)}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {t(chromeKey(offerTourId, 'offer.start'))}
              </button>
              <button
                type="button"
                onClick={snoozeOffer}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t(chromeKey(offerTourId, 'offer.later'))}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfferOpen(false)
                  saveProgress(offerTourId, 'dismissed', 0)
                }}
                className="px-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {t(chromeKey(offerTourId, 'offer.never'))}
              </button>
            </>
          }
        />
      ) : null}
      {noCaseOpen ? (
        <TourCard
          title={t('attorneyTour.noCase.title')}
          body={t('attorneyTour.noCase.body')}
          onClose={() => setNoCaseOpen(false)}
          actions={
            !isStaff ? (
              <button
                type="button"
                onClick={() => {
                  setNoCaseOpen(false)
                  navigate('/attorney-dashboard/leadgen/intake')
                }}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                {t('attorneyTour.noCase.goToIntake')}
              </button>
            ) : null
          }
        />
      ) : null}
    </TourContext.Provider>
  )
}

function TourCard({
  title,
  body,
  actions,
  onClose,
}: {
  title: string
  body: string
  actions: ReactNode
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-labelledby="cciq-tour-card-title"
      className="fixed bottom-6 right-6 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Compass className="h-5 w-5" />
        </span>
        <div className="min-w-0 pr-4">
          <p id="cciq-tour-card-title" className="text-sm font-bold text-slate-900">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

export function useTours(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTours must be used within a TourProvider')
  return ctx
}

/** For components that also render outside a TourProvider. */
export function useOptionalTours(): TourContextValue | null {
  return useContext(TourContext)
}
