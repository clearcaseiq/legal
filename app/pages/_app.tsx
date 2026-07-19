import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import '../src/index.css'
import PwaInstallPrompt from '../src/components/PwaInstallPrompt'

export default function CaseIQApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#1e3045" />
        <meta name="application-name" content="ClearCaseIQ" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ClearCaseIQ" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <Component {...pageProps} />
      <PwaInstallPrompt />
    </>
  )
}
