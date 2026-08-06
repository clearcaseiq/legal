import { useLanguage } from '../contexts/LanguageContext'

type AttorneyRegisterBenefitsProps = {
  currentStep: number
  completionPercent: number
}

export default function AttorneyRegisterBenefits({ currentStep, completionPercent }: AttorneyRegisterBenefitsProps) {
  const { t } = useLanguage()
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-brand-700">
        {t('attorneyReg.stepPre')} {currentStep} {t('attorneyReg.stepPost')}
      </p>
      <h4 className="mt-1 font-semibold text-gray-900">{t(`attorneyReg.sideStep${currentStep}`)}</h4>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>{completionPercent}% {t('attorneyReg.complete')}</span>
          <span>{t('attorneyReg.finishSetup')}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${completionPercent}%` }} />
        </div>
      </div>
      <div className="mt-5 rounded-lg bg-brand-50 p-4">
        <p className="text-sm font-semibold text-brand-900">{t('attorneyReg.afterVerify')}</p>
        <ul className="mt-3 space-y-2 text-sm text-brand-800">
          <li>✓ {t('attorneyReg.sideBenefit1')}</li>
          <li>✓ {t('attorneyReg.sideBenefit2')}</li>
          <li>✓ {t('attorneyReg.sideBenefit3')}</li>
        </ul>
      </div>
      <div className="mt-5 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('attorneyReg.preview')}</p>
        <p className="mt-2 text-sm font-semibold text-gray-900">{t('attorneyReg.previewNewCases')}</p>
        <div className="mt-3 space-y-2 text-xs text-gray-600">
          <p>{t('attorneyReg.previewCase1')}</p>
          <p>{t('attorneyReg.previewCase2')}</p>
          <p>{t('attorneyReg.previewCase3')}</p>
        </div>
      </div>
    </div>
  )
}
