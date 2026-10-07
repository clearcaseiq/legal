import { it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import PageFurtherReading from './PageFurtherReading'
import { PageLinksProvider, type PublicPageLink } from '../lib/pageLinks'

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container?.remove()
  container = null
})

function mount(path: string, links: PublicPageLink[]) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <PageLinksProvider value={{ path, links }}>
        <MemoryRouter>
          <PageFurtherReading path={path} />
        </MemoryRouter>
      </PageLinksProvider>,
    )
  })
  return container
}

it('renders internal links in-site and outbound links with their rel', () => {
  const el = mount('/car-accident', [
    { id: 'a', url: '/slip-and-fall', anchor: 'Slip and fall guide', kind: 'internal', rel: 'follow' },
    { id: 'b', url: 'https://partner.example/a', anchor: 'Partner article', kind: 'outbound', rel: 'sponsored' },
    { id: 'c', url: 'https://cite.example/b', anchor: 'Citation', kind: 'outbound', rel: 'nofollow' },
  ])

  const anchors = Array.from(el.querySelectorAll('a'))
  const internal = anchors.find((a) => a.textContent === 'Slip and fall guide')!
  expect(internal.getAttribute('href')).toBe('/slip-and-fall')
  expect(internal.getAttribute('target')).toBeNull()
  expect(internal.getAttribute('rel')).toBeNull()

  const sponsored = anchors.find((a) => a.textContent?.includes('Partner article'))!
  expect(sponsored.getAttribute('rel')).toBe('sponsored noopener noreferrer')
  expect(sponsored.getAttribute('target')).toBe('_blank')

  const nofollow = anchors.find((a) => a.textContent?.includes('Citation'))!
  expect(nofollow.getAttribute('rel')).toBe('nofollow noopener noreferrer')
})

it('renders nothing when the page has no links', () => {
  const el = mount('/car-accident', [])
  expect(el.innerHTML).toBe('')
})
