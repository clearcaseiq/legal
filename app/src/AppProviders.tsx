import type { ReactNode } from 'react'
import type { LanguageCode } from './i18n'
import { BrowserRouter } from 'react-router-dom'
import { StaticRouter } from 'react-router-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { LanguageProvider, LocalePathSync } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { HeuristicsProvider } from './contexts/HeuristicsContext'
import { ServerRenderedProvider } from './contexts/ServerRenderContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh without hammering the API: refetch on tab focus / reconnect,
      // retry transient failures once, and treat data as briefly stale.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 10_000,
      retry: 1,
    },
  },
})

type AppProvidersProps = {
  /** Set on routes rendered by the server so children can defer browser state. */
  serverRendered?: boolean
  /** Request path, required by the server router since there is no history. */
  location?: string
  /** Language fixed by the URL, for routes with a localized path. */
  language?: LanguageCode
  /** Dictionary slices for `language`, needed before the first render. */
  messages?: Record<string, unknown>
}

function Router({ location, children }: { location?: string; children: ReactNode }) {
  if (typeof window === 'undefined') {
    return <StaticRouter location={location ?? '/'}>{children}</StaticRouter>
  }
  return <BrowserRouter>{children}</BrowserRouter>
}

export default function AppProviders({
  serverRendered = false,
  location,
  language,
  messages,
}: AppProvidersProps) {
  return (
    <ServerRenderedProvider value={serverRendered}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider
          deferStoredLanguage={serverRendered}
          urlLanguage={language}
          urlMessages={messages}
        >
          <Router location={location}>
            <LocalePathSync />
            <ThemeProvider>
              <ToastProvider>
                <HeuristicsProvider>
                  <App />
                </HeuristicsProvider>
              </ToastProvider>
            </ThemeProvider>
          </Router>
        </LanguageProvider>
      </QueryClientProvider>
    </ServerRenderedProvider>
  )
}
