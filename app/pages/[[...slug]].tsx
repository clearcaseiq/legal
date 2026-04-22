import dynamic from 'next/dynamic'
import Head from 'next/head'

const NextRoot = dynamic(() => import('../src/next-root'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <span>Loading ClearCaseIQ...</span>
      </div>
    </div>
  ),
})

export default function SpaRoutePage() {
  return (
    <>
      <Head>
        <title>ClearCaseIQ | AI-Powered Legal Assessment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <NextRoot />
    </>
  )
}
