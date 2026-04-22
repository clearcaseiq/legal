import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'

interface LoginLayoutProps {
  title: string
  subtitle: string
  error: string | null
  children: React.ReactNode
  footerContent?: React.ReactNode
  footerDividerText?: string
  showTerms?: boolean
}

export default function LoginLayout({
  title,
  subtitle,
  error,
  children,
  footerContent,
  footerDividerText = 'More options',
  showTerms = true
}: LoginLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center mb-8 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <BrandLogo size="lg" />
        </Link>
        <h1 className="text-center text-3xl sm:text-4xl font-extrabold font-display text-slate-900 mb-2 tracking-tight">
          {title}
        </h1>
        <p className="text-center text-slate-600 mb-6">
          {subtitle}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-12">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {children}

          {footerContent && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-medium">{footerDividerText}</span>
                </div>
              </div>
              <div className="mt-6 text-center space-y-2">
                {footerContent}
              </div>
            </div>
          )}
        </div>

        {showTerms && (
          <p className="mt-8 text-center text-sm text-slate-500">
            By signing in, you agree to our{' '}
            <Link to="/terms-of-service" className="text-brand-700 hover:text-brand-800 underline-offset-2">
              Terms
            </Link>
            {' '}and{' '}
            <Link to="/privacy-policy" className="text-brand-700 hover:text-brand-800 underline-offset-2">
              Privacy Policy
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
