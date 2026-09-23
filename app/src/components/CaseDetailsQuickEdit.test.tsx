/**
 * The server merges a PATCH at the top level only, so whatever this editor
 * sends for `incident` replaces the stored incident outright. Both modes have
 * to carry the untouched incident fields through or the edit erases them.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en-US' }),
}))

const updateAssessment = vi.fn()
const lookupZipCounties = vi.fn()
vi.mock('../lib/api', () => ({ updateAssessment: (...args: unknown[]) => updateAssessment(...args) }))
vi.mock('../lib/api-plaintiff', () => ({ lookupZipCounties: (...args: unknown[]) => lookupZipCounties(...args) }))

import CaseDetailsQuickEdit from './CaseDetailsQuickEdit'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const FACTS = {
  incident: { date: '2026-08-01', narrative: '', location: '', parties: ['other driver'] },
  venue: { state: '' },
}

let container: HTMLDivElement
let root: Root | null = null

function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function buttonWithText(text: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text)!
}

async function render(mode: 'narrative' | 'location', onSaved = vi.fn(), onClose = vi.fn()) {
  await act(async () => {
    root!.render(
      <CaseDetailsQuickEdit mode={mode} assessmentId="a1" facts={FACTS} onClose={onClose} onSaved={onSaved} />,
    )
  })
  return { onSaved, onClose }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  updateAssessment.mockReset().mockResolvedValue({ ok: true })
  lookupZipCounties.mockReset()
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  container.remove()
})

describe('CaseDetailsQuickEdit', () => {
  it('saves the description without dropping the rest of the incident', async () => {
    const { onSaved, onClose } = await render('narrative')
    await act(async () => typeInto(container.querySelector('textarea')!, 'Rear-ended at a red light on Main St.'))
    await act(async () => buttonWithText('plaintiffDashboard.quickEdit.save').click())

    const patch = {
      incident: { ...FACTS.incident, narrative: 'Rear-ended at a red light on Main St.' },
    }
    expect(updateAssessment).toHaveBeenCalledWith('a1', patch)
    expect(onSaved).toHaveBeenCalledWith(patch)
    expect(onClose).toHaveBeenCalled()
  })

  it('refuses a description too short to be useful', async () => {
    await render('narrative')
    await act(async () => typeInto(container.querySelector('textarea')!, 'car hit me'))
    await act(async () => buttonWithText('plaintiffDashboard.quickEdit.save').click())

    expect(updateAssessment).not.toHaveBeenCalled()
    expect(container.textContent).toContain('plaintiffDashboard.quickEdit.narrativeTooShort')
  })

  it('fills state and county from the ZIP and saves both venue and incident location', async () => {
    lookupZipCounties.mockResolvedValue({ zip: '94520', state: 'CA', counties: [{ state: 'CA', county: 'Contra Costa' }] })
    const { onSaved } = await render('location')
    await act(async () => typeInto(container.querySelector('#quick-edit-zip') as HTMLInputElement, '94520'))

    expect((container.querySelector('#quick-edit-state') as HTMLSelectElement).value).toBe('CA')
    expect((container.querySelector('#quick-edit-county') as HTMLSelectElement).value).toBe('Contra Costa')

    await act(async () => buttonWithText('plaintiffDashboard.quickEdit.save').click())
    const patch = {
      venue: { state: 'CA', county: 'Contra Costa' },
      incident: { ...FACTS.incident, location: 'Contra Costa, CA' },
    }
    expect(updateAssessment).toHaveBeenCalledWith('a1', patch)
    expect(onSaved).toHaveBeenCalledWith(patch)
  })

  it('keeps the dialog open with an error when the save fails', async () => {
    updateAssessment.mockRejectedValue(new Error('500'))
    const { onSaved, onClose } = await render('narrative')
    await act(async () => typeInto(container.querySelector('textarea')!, 'Rear-ended at a red light on Main St.'))
    await act(async () => buttonWithText('plaintiffDashboard.quickEdit.save').click())

    expect(container.textContent).toContain('plaintiffDashboard.quickEdit.saveError')
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
