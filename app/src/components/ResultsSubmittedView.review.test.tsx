/**
 * The post-submission attorney review list.
 *
 * It used to render the claimant's saved picks crossed with a live directory
 * search, and label the first row "reviewing" purely because it was first.
 * That is a different set of attorneys from the ones holding an offer, so the
 * screen could name firms that were never approached and omit the one that
 * accepted. These tests pin the list to the server's introductions.
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ResultsSubmittedView } from './ResultsDeferredContent'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Assert on keys, so a copy change cannot quietly turn a test green.
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))

let container: HTMLDivElement
let root: Root | null = null

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

const PICKS = [
  { id: 'pick-1', name: 'Saved Pick One', law_firm: { name: 'Pick One LLP' } },
  { id: 'pick-2', name: 'Saved Pick Two', law_firm: { name: 'Pick Two LLP' } },
]

async function mount(props: Record<string, unknown>) {
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <MemoryRouter>
        <ResultsSubmittedView
          assessmentId="asm-1"
          handleDownloadReportPdf={() => {}}
          handleCopyShareLink={() => {}}
          improveCaseValueItems={[]}
          isLoggedIn
          rankedAttorneys={PICKS as any}
          shareCopied={false}
          showSavePrompt={false}
          submissionTimeline={[]}
          {...props}
        />
      </MemoryRouter>,
    )
  })
}

/** The review list is the only ordered list on the screen. */
function reviewRowText() {
  const list = container.querySelector('ol')
  return Array.from(list?.querySelectorAll('li') ?? []).map((li) => li.textContent ?? '')
}

it('lists the attorneys who hold an offer, not the claimant saved picks', async () => {
  await mount({
    attorneyReview: [
      { id: 'i1', status: 'PENDING', name: 'Routed Counsel', firmName: 'Routed LLP' },
    ],
  })

  const rows = reviewRowText()
  expect(rows).toHaveLength(1)
  expect(rows[0]).toContain('Routed Counsel')
  expect(rows[0]).toContain('Routed LLP')
  expect(container.textContent).not.toContain('Saved Pick One')
})

it('falls back to the saved picks while no offer has gone out yet', async () => {
  // The window between submitting and the routing engine creating
  // introductions. An empty list here would read as "nobody was contacted".
  await mount({ attorneyReview: [] })

  const rows = reviewRowText()
  expect(rows).toHaveLength(2)
  expect(rows[0]).toContain('Saved Pick One')
})

it('marks the attorney who accepted, and stands the others down', async () => {
  await mount({
    attorneyReview: [
      { id: 'i1', status: 'DECLINED', name: 'Passed Counsel', firmName: 'Passed LLP' },
      { id: 'i2', status: 'ACCEPTED', name: 'Accepting Counsel', firmName: 'Accepting LLP' },
      { id: 'i3', status: 'PENDING', name: 'Untouched Counsel', firmName: 'Untouched LLP' },
    ],
    attorneyMatched: { id: 'a2', name: 'Accepting Counsel', firmName: 'Accepting LLP' },
  })

  const [passed, accepted, pending] = reviewRowText()
  expect(passed).toContain('results.submitted.statusPassed')
  expect(accepted).toContain('results.submitted.statusAccepted')
  // Not "waiting for response": the engine retires competing offers on accept,
  // so promising a reply from this one would be a promise nothing can keep.
  expect(pending).toContain('results.submitted.statusNoLongerNeeded')
  expect(pending).not.toContain('results.submitted.statusWaiting')
})

it('does not promise to auto-advance once an attorney has accepted', async () => {
  await mount({
    attorneyReview: [{ id: 'i1', status: 'ACCEPTED', name: 'Accepting Counsel' }],
    attorneyMatched: { id: 'a1', name: 'Accepting Counsel' },
  })

  expect(container.textContent).not.toContain('results.submitted.autoAdvanceNote')
})

it('advances the what-happens-next stepper past attorney review on accept', async () => {
  await mount({ attorneyReview: [{ id: 'i1', status: 'PENDING', name: 'Routed Counsel' }] })
  // Exactly one step is "Now" at a time, so counting is enough to say which.
  expect(container.textContent?.match(/results\.submitted\.stepNow/g)).toHaveLength(1)
  expect(container.textContent).toContain('results.submitted.stepComingNext')

  await act(() => root?.unmount())
  root = null
  container.remove()
  container = document.createElement('div')
  document.body.appendChild(container)

  await mount({
    attorneyReview: [{ id: 'i1', status: 'ACCEPTED', name: 'Routed Counsel' }],
    attorneyMatched: { id: 'a1', name: 'Routed Counsel' },
  })
  // "You decide" is now the live step, and nothing is left "coming next".
  expect(container.textContent).not.toContain('results.submitted.stepComingNext')
})
