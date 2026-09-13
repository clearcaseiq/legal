/**
 * The screen a claimant lands on from a document-request text.
 *
 * Picking files did nothing: the handler read `e.target.files` inside a state
 * updater, which React runs after the handler returns, by which point the line
 * resetting the input had emptied that live list. The staged count stayed at
 * zero and Send stayed disabled, so there was no way to send anything from a
 * phone at all. jsdom does not model a file input that closely, so the helper
 * below supplies the part of the contract that matters: the list belongs to the
 * element, and clearing `value` empties it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { getRequestMock, uploadMock } = vi.hoisted(() => ({
  getRequestMock: vi.fn(),
  uploadMock: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  getDocumentPortalRequest: getRequestMock,
  uploadDocumentPortalFile: uploadMock,
}))

vi.mock('react-router-dom', () => ({ useParams: () => ({ token: 'tok-1' }) }))

import DocumentPortal from './DocumentPortal'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const REQUEST = {
  mode: 'claimant',
  status: 'pending',
  attorneyName: 'Sarah Johnson, Esq.',
  firmName: 'Johnson Legal Group',
  recipientName: null,
  recipientRole: null,
  customMessage: null,
  requestedDocs: [{ key: 'medical_records', label: 'Medical records' }],
  uploads: [],
}

let container: HTMLDivElement
let root: Root | null = null

beforeEach(() => {
  getRequestMock.mockReset().mockResolvedValue(REQUEST)
  uploadMock.mockReset().mockResolvedValue({ duplicate: false, status: 'partial' })
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

async function render() {
  await act(async () => {
    root = createRoot(container)
    root.render(<DocumentPortal />)
  })
}

const fileInput = () => container.querySelector('input[type="file"]') as HTMLInputElement

function photo(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' })
}

/**
 * Choose files the way a browser reports them: `files` reads off the element,
 * and setting `value` to empty clears the selection.
 */
async function choose(input: HTMLInputElement, files: File[]) {
  let selected = files
  Object.defineProperty(input, 'files', { configurable: true, get: () => selected })
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => (selected.length ? `C:\\fakepath\\${selected[0].name}` : ''),
    set: (next: string) => {
      if (next === '') selected = []
    },
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function sendButton() {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Send'),
  ) as HTMLButtonElement | undefined
}

describe('sending documents from a request text', () => {
  it('stages the files the claimant picked', async () => {
    await render()

    await choose(fileInput(), [photo('xray.jpg'), photo('bill.jpg')])

    expect(container.textContent).toContain('2 files selected')
    expect(container.textContent).toContain('xray.jpg')
    expect(container.textContent).toContain('bill.jpg')
  })

  it('enables Send once something is staged', async () => {
    await render()
    expect(sendButton()?.disabled).toBe(true)

    await choose(fileInput(), [photo('xray.jpg')])

    expect(sendButton()?.disabled).toBe(false)
    expect(sendButton()?.textContent).toContain('Send 1 file')
  })

  it('keeps files from a second trip to the picker, for one page per document', async () => {
    await render()

    await choose(fileInput(), [photo('xray.jpg')])
    await choose(fileInput(), [photo('bill.jpg')])

    expect(container.textContent).toContain('2 files selected')
  })

  it('uploads every staged file when Send is pressed', async () => {
    await render()
    await choose(fileInput(), [photo('xray.jpg'), photo('bill.jpg')])

    await act(async () => {
      sendButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(uploadMock.mock.calls.map((c) => c[1].name)).toEqual(['xray.jpg', 'bill.jpg'])
  })

  it('lets the claimant drop one before sending', async () => {
    await render()
    await choose(fileInput(), [photo('xray.jpg'), photo('bill.jpg')])

    const remove = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Remove',
    ) as HTMLButtonElement
    await act(async () => {
      remove.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('1 file selected')
    expect(container.textContent).not.toContain('xray.jpg')
  })
})
