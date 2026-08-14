import { Check } from 'lucide-react'
import BrandLogo from './BrandLogo'

/**
 * Two-step progress header shared by the consent flow screens:
 * 1) Review agreements  →  2) Sign your agreements.
 */
export default function ConsentStepHeader({ activeStep }: { activeStep: 1 | 2 }) {
  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-8">
        {/* Step 1 — Review agreements */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeStep === 1 ? (
            <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              1 of 2
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          <span
            className={`text-xs font-semibold sm:text-sm ${
              activeStep === 1 ? 'text-brand-700' : 'text-slate-500'
            }`}
          >
            Review agreements
          </span>
        </div>

        {/* Brand mark */}
        <BrandLogo appName="ClearCaseIQ" size="sm" className="hidden sm:inline-flex" />

        {/* Step 2 — Sign your agreements */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeStep === 2 ? (
            <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              2 of 2
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500">
              2
            </span>
          )}
          <span
            className={`text-xs font-semibold sm:text-sm ${
              activeStep === 2 ? 'text-brand-700' : 'text-slate-500'
            }`}
          >
            Sign your agreements
          </span>
        </div>
      </div>

      {/* Two-segment progress bar */}
      <div className="flex h-1">
        <div className={`flex-1 ${activeStep >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        <div className={`flex-1 ${activeStep >= 2 ? 'bg-brand-500' : 'bg-slate-200'}`} />
      </div>
    </div>
  )
}
