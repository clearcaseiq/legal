import type { AppProps } from 'next/app'
import Head from 'next/head'
import { fontVariablesCss } from '../src/lib/fonts'
import '../src/index.css'

export default function CaseIQApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#1e3045" />
        <meta name="format-detection" content="telephone=no" />
        <style dangerouslySetInnerHTML={{ __html: fontVariablesCss }} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
