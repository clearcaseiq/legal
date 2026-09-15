/**
 * The licence upload control on the Practice tab.
 *
 * "Upload a file" did nothing. The label carried `htmlFor` pointing at the very
 * input it wrapped, so a click was forwarded to the input, bubbled back out
 * through the label, and was forwarded again; the browser breaks that cycle by
 * dropping the file dialog. The box also advertised drag and drop with no drop
 * handler, so the browser kept the drop and navigated away from the page.
 *
 * Neither had any coverage, which is why a control that never opened shipped.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import AttorneyLicenseCard from './AttorneyLicenseCard'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

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

function renderCard(overrides: Record<string, unknown> = {}) {
  const props = {
    handleLicenseFileChange: vi.fn(),
    handleLicenseFileUpload: vi.fn(),
    handleStateBarLookup: vi.fn(),
    licenseError: null,
    licenseLoading: false,
    licenseMethod: 'manual_upload',
    licenseNumber: '',
    licenseState: '',
    licenseStatus: { hasLicense: false, licenseVerified: false },
    licenseSuccess: false,
    selectLicenseFile: vi.fn(),
    selectedLicenseFile: null,
    setLicenseError: vi.fn(),
    setLicenseMethod: vi.fn(),
    setLicenseNumber: vi.fn(),
    setLicenseState: vi.fn(),
    ...overrides,
  }

  act(() => {
    root = createRoot(container)
    root.render(<AttorneyLicenseCard {...(props as any)} />)
  })
  return props
}

function uploadButton() {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Upload a file'),
  )
}

function fileInput() {
  return container.querySelector<HTMLInputElement>('input[type="file"]')
}

/** The dashed box that claims to accept drops. */
function dropZone() {
  return container.querySelector<HTMLElement>('.border-dashed')
}

function fileList(file: File) {
  return { files: [file], items: [], types: ['Files'] } as unknown as DataTransfer
}

describe('AttorneyLicenseCard upload control', () => {
  it('opens the file picker when "Upload a file" is clicked', () => {
    renderCard()
    const input = fileInput()!
    const clicked = vi.spyOn(input, 'click')

    act(() => {
      uploadButton()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(clicked).toHaveBeenCalledTimes(1)
  })

  it('opens the picker from anywhere in the box, not just the words', () => {
    renderCard()
    const input = fileInput()!
    const clicked = vi.spyOn(input, 'click')
    // The format hint sits well away from the link text; a click on it has to
    // reach the same handler.
    const hint = Array.from(container.querySelectorAll('span')).find((s) =>
      s.textContent?.startsWith('PDF, PNG'),
    )!

    act(() => {
      hint.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(clicked).toHaveBeenCalledTimes(1)
  })

  it('fills the dashed box with the click target', () => {
    renderCard()
    expect(dropZone()!.contains(uploadButton()!)).toBe(true)
    expect(uploadButton()!.className).toContain('w-full')
  })

  it('keeps the file input outside the button, which cannot contain a control', () => {
    renderCard()
    expect(uploadButton()!.contains(fileInput()!)).toBe(false)
  })

  it('does not wrap the file input in a label pointing at it, which suppressed the dialog', () => {
    renderCard()
    const input = fileInput()!
    const label = input.closest('label')

    // Either not inside a label at all, or inside one that does not target it.
    expect(label?.getAttribute('for') ?? null).not.toBe(input.id)
  })

  it('accepts a dropped file', () => {
    const props = renderCard()
    const file = new File(['x'], 'bar-card.pdf', { type: 'application/pdf' })

    act(() => {
      const drop = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(drop, 'dataTransfer', { value: fileList(file) })
      dropZone()!.dispatchEvent(drop)
    })

    expect(props.selectLicenseFile).toHaveBeenCalledWith(file)
  })

  it('cancels the drop event, so the browser does not navigate to the file instead', () => {
    renderCard()
    const file = new File(['x'], 'bar-card.pdf', { type: 'application/pdf' })
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: fileList(file) })

    act(() => {
      dropZone()!.dispatchEvent(drop)
    })

    expect(drop.defaultPrevented).toBe(true)
  })

  it('cancels dragover too, without which the drop never fires', () => {
    renderCard()
    const dragOver = new Event('dragover', { bubbles: true, cancelable: true })

    act(() => {
      dropZone()!.dispatchEvent(dragOver)
    })

    expect(dragOver.defaultPrevented).toBe(true)
  })

  it('shows the chosen file so the attorney knows the picker worked', () => {
    renderCard({ selectedLicenseFile: { name: 'bar-card.pdf' } })
    expect(container.textContent).toContain('bar-card.pdf')
  })

  it('keeps the submit button disabled until a file is chosen', () => {
    renderCard()
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(submit?.disabled).toBe(true)
  })

  it('does not render the upload control while the bar-lookup method is selected', () => {
    renderCard({ licenseMethod: 'state_bar_lookup' })
    expect(uploadButton()).toBeUndefined()
  })
})
