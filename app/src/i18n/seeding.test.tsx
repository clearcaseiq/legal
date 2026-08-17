import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider, LocalePathSync, useLanguage } from '../contexts/LanguageContext'
import { hasLanguageResources } from '.'
import { isLocalizedPath, localeFromPath } from './routing'

function Probe() {
  const { language, t } = useLanguage()
  return (
    <div>
      <span id="language">{language}</span>
      <span id="label">{t('common.signIn')}</span>
    </div>
  )
}

/** Only what the page's markup reads, as the server sends. */
const SPANISH = { common: { signIn: 'Iniciar sesión' } }

function setActEnvironment(enabled: boolean) {
  const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  scope.IS_REACT_ACT_ENVIRONMENT = enabled
}

describe('server-rendered language', () => {
  it('produces Spanish markup, which is what hydration must match', () => {
    // renderToStaticMarkup is the server path itself: no effects run, so this is
    // the first paint. Before seeding this returned English and the page visibly
    // flipped a moment after load.
    const html = renderToStaticMarkup(
      <LanguageProvider urlLanguage="es" urlMessages={SPANISH}>
        <Probe />
      </LanguageProvider>
    )

    expect(html).toContain('Iniciar sesión')
    expect(html).not.toContain('Sign In')
  })

  it('ignores a stored preference that disagrees with the URL', () => {
    window.localStorage.setItem('i18nextLng', 'en')

    const html = renderToStaticMarkup(
      <LanguageProvider urlLanguage="es" urlMessages={SPANISH}>
        <Probe />
      </LanguageProvider>
    )

    expect(html).toContain('Iniciar sesión')
    window.localStorage.removeItem('i18nextLng')
  })

  it('stays English where no localized URL applies', () => {
    const html = renderToStaticMarkup(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )

    expect(html).toContain('Sign In')
  })

  it('does not mistake a partial seed for the whole dictionary', () => {
    // Otherwise the loader thinks Spanish is ready and every string outside the
    // seeded namespaces stays English for the rest of the session.
    renderToStaticMarkup(
      <LanguageProvider urlLanguage="es" urlMessages={SPANISH}>
        <Probe />
      </LanguageProvider>
    )

    expect(hasLanguageResources('es')).toBe(false)
  })
})

describe('client-side navigation between locales', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    // Without this React warns that `act` is unsupported and does not guarantee
    // effects have flushed, which is exactly what these assertions depend on.
    setActEnvironment(true)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    window.localStorage.removeItem('i18nextLng')
    setActEnvironment(false)
  })

  function renderAt(path: string) {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <LanguageProvider>
            <LocalePathSync />
            <Probe />
          </LanguageProvider>
        </MemoryRouter>
      )
    })
    return container.querySelector('#language')?.textContent
  }

  it('adopts the locale the path declares', () => {
    expect(renderAt('/es/como-funciona')).toBe('es')
  })

  it('leaves unprefixed paths to the reader preference', () => {
    // /press and friends have no Spanish URL, so a reader browsing in Spanish
    // should keep doing so rather than being reset by the absence of a prefix.
    window.localStorage.setItem('i18nextLng', 'es')
    expect(renderAt('/press')).toBe('es')
  })
})

describe('locale from path', () => {
  it('recognises the prefixed locale space', () => {
    expect(localeFromPath('/es')).toBe('es')
    expect(localeFromPath('/es/como-funciona')).toBe('es')
    expect(isLocalizedPath('/es/contacto')).toBe(true)
  })

  it('does not mistake an English path that merely starts with those letters', () => {
    expect(localeFromPath('/estimate')).toBe('en')
    expect(localeFromPath('/essential-documents')).toBe('en')
    expect(isLocalizedPath('/estimate')).toBe(false)
  })

  it('treats the default language as unprefixed', () => {
    expect(localeFromPath('/')).toBe('en')
    expect(localeFromPath('/how-it-works')).toBe('en')
  })
})
