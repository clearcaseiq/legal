import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Bot, Check, CheckCircle2, Clock, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'

/**
 * A silent, auto-advancing walkthrough of the attorney experience.
 *
 * This exists instead of a screen recording. A recording of a product this young
 * goes stale the moment a screen changes, has to be re-cut for every copy edit,
 * and costs a page-load budget we would rather spend elsewhere. Rebuilding the
 * five frames in markup keeps the walkthrough in sync with the product by being
 * edited alongside it, stays sharp on any display, and reads to a screen reader.
 *
 * The frames are deliberately stylised representations rather than pixel copies
 * of the real screens: they carry the shape of the workflow without implying a
 * fidelity that would be a maintenance trap.
 */

const TICK_MS = 50

type TourStep = {
  id: string
  title: string
  caption: string
  durationMs: number
  screen: ReactNode
}

function ScreenShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 truncate text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
    </div>
  )
}

/** Greeked body copy — a paragraph shape without inventing text nobody wrote. */
function TextLines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-2">
      {widths.map((width, index) => (
        <div key={index} className="h-2 rounded-full bg-slate-200" style={{ width }} />
      ))}
    </div>
  )
}

function MatchInboxScreen() {
  const matches = [
    { title: 'Auto accident · rear-end collision', venue: 'Los Angeles County, CA', score: 87, fresh: true },
    { title: 'Slip & fall · commercial premises', venue: 'Orange County, CA', score: 74, fresh: false },
    { title: 'Auto accident · multi-vehicle', venue: 'San Diego County, CA', score: 69, fresh: false },
  ]

  return (
    <ScreenShell label="New Matches">
      <div className="space-y-2.5">
        {matches.map((match) => (
          <div
            key={match.title}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              match.fresh ? 'border-brand-200 bg-brand-50/50 shadow-sm' : 'border-slate-200 bg-white opacity-60'
            }`}
          >
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${
                match.fresh ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className="text-base font-extrabold leading-none">{match.score}</span>
              <span className="text-[8px] font-semibold uppercase tracking-wide">score</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-slate-900">{match.title}</p>
                {match.fresh && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    New
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{match.venue}</p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500 sm:flex">
              <Clock className="h-3.5 w-3.5" />
              3h 42m left
            </div>
          </div>
        ))}
        <p className="pt-1 text-xs text-slate-500">
          Matched to your practice area and venue. Opening a match costs nothing.
        </p>
      </div>
    </ScreenShell>
  )
}

function AssessmentScreen() {
  const viability = [
    { label: 'Liability', value: 92 },
    { label: 'Causation', value: 84 },
    { label: 'Damages', value: 78 },
  ]
  const evidence = [
    { label: 'Medical records', ready: true },
    { label: 'Police report', ready: true },
    { label: 'Injury photos', ready: true },
    { label: 'Wage loss', ready: false },
  ]

  return (
    <ScreenShell label="Case assessment · Snapshot">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          {['Snapshot', 'Scene', 'Medical', 'Insurance', 'Evidence'].map((tab, index) => (
            <span
              key={tab}
              className={`rounded-md px-2.5 py-1 ${
                index === 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estimated settlement</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">$180k – $240k</p>
            <p className="mt-0.5 text-[11px] text-slate-500">76% confidence · not a guarantee</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Viability</p>
            <div className="mt-2 space-y-1.5">
              {viability.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] font-medium text-slate-600">{row.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-brand-500" style={{ width: `${row.value}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[11px] font-bold text-slate-700">{row.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Evidence on file</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {evidence.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                  item.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {item.ready ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {item.label}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">
            Treatment: 6 providers · 255-day gap flagged · carrier limit $250k
          </p>
        </div>
      </div>
    </ScreenShell>
  )
}

function DecisionScreen({ caseFee }: { caseFee: string | null }) {
  return (
    <ScreenShell label="Accept or decline">
      <div className="flex h-full flex-col justify-center gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Auto accident · rear-end collision</p>
          <p className="mt-0.5 text-xs text-slate-500">Los Angeles County, CA · responds in 3h 42m</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-bold text-white">
              Accept case{caseFee ? ` · ${caseFee}` : ''}
            </div>
            <div className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-600">
              Decline
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          {[
            'Nothing is charged when a case is offered to you or when you decline',
            'The same flat fee on every case, whatever it turns out to be worth',
            'Never a percentage of the recovery',
          ].map((line) => (
            <p key={line} className="flex gap-2 text-xs leading-5 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {line}
            </p>
          ))}
        </div>
      </div>
    </ScreenShell>
  )
}

function RoseScreen() {
  const tasks = [
    { label: 'Request records from Cedars-Sinai Physical Therapy', role: 'Paralegal', approved: false },
    { label: "Confirm the client's UM/UIM and MedPay coverage", role: 'Case manager', approved: false },
    { label: 'Document the reason for the 255-day treatment gap', role: 'Paralegal', approved: true },
  ]

  return (
    <ScreenShell label="Rose · AI Case Manager">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <p className="text-xs leading-5 text-brand-900">
            Rose reviewed <span className="font-bold">34 active cases</span> and raised 3 items on this file.
          </p>
        </div>

        {tasks.map((task) => (
          <div key={task.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-5 text-slate-900">{task.label}</p>
                <p className="mt-1 text-[11px] text-slate-500">Assigned to {task.role}</p>
              </div>
              {task.approved ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <Check className="h-3 w-3" />
                  Approved
                </span>
              ) : (
                <span className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white">
                  Approve
                </span>
              )}
            </div>
          </div>
        ))}

        <p className="text-[11px] leading-5 text-slate-500">
          Rose finds the work and drafts it. A person approves it before it goes anywhere.
        </p>
      </div>
    </ScreenShell>
  )
}

function DemandScreen() {
  return (
    <ScreenShell label="Demand letter">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
            <Sparkles className="h-3 w-3" />
            Drafted by Rose
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            Awaiting your review
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-900">
            Demand for settlement
          </p>
          <div className="mt-3 space-y-3">
            <TextLines widths={['100%', '92%', '96%']} />
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-slate-700">
                Special damages: $48,320 · Policy limit: $250,000
              </p>
            </div>
            <TextLines widths={['98%', '88%', '70%']} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600">
            Edit draft
          </div>
          <div className="rounded-lg bg-brand-600 px-3 py-2 text-center text-xs font-bold text-white">
            Approve &amp; finalize
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}

export default function AttorneyProductTour({ caseFee = null }: { caseFee?: string | null }) {
  const steps = useMemo<TourStep[]>(
    () => [
      {
        id: 'match',
        title: 'A matched case arrives',
        caption:
          'Cases reach you already filtered to your practice area and venue, each with a response window. Opening one costs nothing.',
        durationMs: 5500,
        screen: <MatchInboxScreen />,
      },
      {
        id: 'assess',
        title: 'Read the assessment',
        caption:
          'Viability, an estimated settlement range, the treatment picture, policy limits, and what evidence is actually on file — before you commit.',
        durationMs: 7000,
        screen: <AssessmentScreen />,
      },
      {
        id: 'decide',
        title: 'Accept or decline',
        caption:
          'Decline as many as you like at no cost. One flat fee applies when you accept, identical on every case.',
        durationMs: 6000,
        screen: <DecisionScreen caseFee={caseFee} />,
      },
      {
        id: 'rose',
        title: 'Rose works the file',
        caption:
          'Your AI case manager reviews every active case and raises the next action, always held for a person to approve.',
        durationMs: 7000,
        screen: <RoseScreen />,
      },
      {
        id: 'demand',
        title: 'The demand is already drafted',
        caption:
          'When a case becomes demand-ready, you open a first draft instead of a blank page. Nothing is finalized until you read it.',
        durationMs: 6500,
        screen: <DemandScreen />,
      },
    ],
    [caseFee]
  )

  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [inView, setInView] = useState(false)
  const elapsedRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Someone who asked the browser to reduce motion gets a still they advance
  // themselves, not a carousel that moves under them.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (query.matches) setPlaying(false)
  }, [])

  // Nothing animates until the tour is actually on screen, so a visitor who
  // never scrolls this far doesn't arrive mid-sequence.
  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    elapsedRef.current = 0
    setProgress(0)
  }, [index])

  useEffect(() => {
    if (!playing || !inView) return
    const duration = steps[index].durationMs
    const timer = window.setInterval(() => {
      elapsedRef.current += TICK_MS
      setProgress(Math.min(100, (elapsedRef.current / duration) * 100))
      if (elapsedRef.current >= duration) setIndex((current) => (current + 1) % steps.length)
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [playing, inView, index, steps])

  const goTo = (next: number) => {
    elapsedRef.current = 0
    setProgress(0)
    setIndex(next)
  }

  const active = steps[index]

  return (
    <div ref={containerRef} className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">See how it works</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          From a new match to a drafted demand
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Five steps, start to finish. It plays on its own. Jump to any step.
        </p>

        <ol className="mt-6 space-y-1.5">
          {steps.map((step, stepIndex) => {
            const isActive = stepIndex === index
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => goTo(stepIndex)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`w-full rounded-xl px-3.5 py-3 text-left transition ${
                    isActive ? 'bg-white shadow-sm ring-1 ring-brand-200' : 'hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        isActive ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {stepIndex + 1}
                    </span>
                    <span className={`text-sm font-bold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                      {step.title}
                    </span>
                  </div>
                  {isActive && (
                    <>
                      <p className="mt-2 pl-10 text-sm leading-6 text-slate-600">{step.caption}</p>
                      <span className="mt-2.5 ml-10 block h-1 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className="block h-full rounded-full bg-brand-500"
                          style={{ width: `${progress}%`, transition: `width ${TICK_MS}ms linear` }}
                        />
                      </span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            aria-label={playing ? 'Pause the walkthrough' : 'Play the walkthrough'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => goTo(0)}
            aria-label="Restart the walkthrough"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Restart
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm sm:p-4">
        {/* Fixed height so advancing a step never shifts the page under the reader. */}
        <div className="h-[30rem] sm:h-[26rem]" aria-live="polite">
          {active.screen}
        </div>
      </div>
    </div>
  )
}
