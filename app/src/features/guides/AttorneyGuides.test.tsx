import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import AttorneyGuidesIndex from './AttorneyGuidesIndex'
import AttorneyGuideArticle from './AttorneyGuideArticle'
import { attorneyGuides } from '../../data/attorneyGuides'
import {
  ATTORNEY_GUIDES_OVERVIEW_CAPTIONS_URL,
  ATTORNEY_GUIDES_OVERVIEW_POSTER_URL,
  ATTORNEY_GUIDES_OVERVIEW_VIDEO_URL,
  type GuideMode,
} from './guideLinks'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true } as Response)))
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container?.remove()
  container = null
  vi.unstubAllGlobals()
})

async function mount(node: ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(<MemoryRouter>{node}</MemoryRouter>)
  })
  return container
}

function hrefs(el: HTMLElement) {
  return Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'))
}

describe('AttorneyGuidesIndex', () => {
  it.each<[GuideMode, string]>([
    ['app', '/attorney-dashboard/guides/'],
    ['public', '/attorney-guides/'],
  ])('lists every guide in %s mode', async (mode, prefix) => {
    const el = await mount(<AttorneyGuidesIndex mode={mode} />)
    for (const guide of attorneyGuides) {
      expect(el.textContent).toContain(guide.title)
      expect(hrefs(el)).toContain(`${prefix}${guide.slug}`)
    }
  })

  it('shows the overview video only in app mode', async () => {
    const el = await mount(<AttorneyGuidesIndex mode="app" />)
    const video = el.querySelector('video')
    expect(video?.getAttribute('src')).toBe(ATTORNEY_GUIDES_OVERVIEW_VIDEO_URL)
    expect(video?.getAttribute('poster')).toBe(ATTORNEY_GUIDES_OVERVIEW_POSTER_URL)
    expect(video?.querySelector('track')?.getAttribute('src')).toBe(ATTORNEY_GUIDES_OVERVIEW_CAPTIONS_URL)
    expect(el.textContent).not.toContain('Attorney sign in')
  })

  it('shows the sign-in prompt and no video in public mode', async () => {
    const el = await mount(<AttorneyGuidesIndex mode="public" />)
    expect(el.querySelector('video')).toBeNull()
    expect(el.textContent).toContain('Attorney sign in')
    expect(hrefs(el)).toContain('/attorney-login')
  })
})

describe('AttorneyGuideArticle', () => {
  const index = 1
  const guide = attorneyGuides[index]
  const previous = attorneyGuides[index - 1]
  const next = attorneyGuides[index + 1]
  const firstLink = guide.sections.find((section) => section.appLink)!.appLink!

  it('renders "Open this screen" buttons and app prev/next links in app mode', async () => {
    const el = await mount(<AttorneyGuideArticle mode="app" slug={guide.slug} />)
    expect(el.querySelector('h1')?.textContent).toBe(guide.title)
    for (const section of guide.sections) expect(el.textContent).toContain(section.heading)

    const openLink = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes(`Open this screen: ${firstLink.label}`),
    )
    expect(openLink?.getAttribute('href')).toBe(firstLink.to)
    expect(el.textContent).not.toContain('Sign in to open it')

    expect(hrefs(el)).toContain(`/attorney-dashboard/guides/${previous.slug}`)
    expect(hrefs(el)).toContain(`/attorney-dashboard/guides/${next.slug}`)
    expect(el.textContent).toContain('Previous guide')
    expect(el.textContent).toContain('Next guide')
  })

  it('shows screen names with a sign-in prompt and public prev/next links in public mode', async () => {
    const el = await mount(<AttorneyGuideArticle mode="public" slug={guide.slug} />)
    expect(el.textContent).not.toContain('Open this screen')
    expect(el.textContent).toContain(`In the app: ${firstLink.label}`)
    expect(el.textContent).toContain('Sign in to open it')
    expect(hrefs(el)).not.toContain(firstLink.to)
    expect(hrefs(el)).toContain('/attorney-login')

    expect(hrefs(el)).toContain(`/attorney-guides/${previous.slug}`)
    expect(hrefs(el)).toContain(`/attorney-guides/${next.slug}`)
  })

  it('omits the previous link on the first guide', async () => {
    const el = await mount(<AttorneyGuideArticle mode="public" slug={attorneyGuides[0].slug} />)
    expect(el.textContent).not.toContain('Previous guide')
    expect(el.textContent).toContain('Next guide')
  })
})
