import type { AppProps } from 'next/app'
import '../src/index.css'

export default function CaseIQApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
