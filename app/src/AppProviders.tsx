import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { HeuristicsProvider } from './contexts/HeuristicsContext'

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

export default function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <HeuristicsProvider>
                <App />
              </HeuristicsProvider>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
