import { useCallback, useEffect, useState } from 'react'
import {
  acceptCaseShare,
  acceptCoCounselWorkflow,
  acceptLeadReferral,
  createLeadCaseShare,
  createLeadCoCounselWorkflow,
  createLeadReferral,
  declineCaseShare,
  declineCoCounselWorkflow,
  declineLeadReferral,
  downloadLeadFinanceDataroom,
  downloadLeadFinanceUnderwritingPdf,
  getLeadCaseShares,
  getLeadCoCounselWorkflows,
  getLeadFinanceSummary,
  getLeadReferrals,
} from '../lib/api'

const DEFAULT_FINANCE_MODEL = {
  advanceRate: 20,
  feeRate: 3,
  durationMonths: 12,
}

const DEFAULT_CASE_SHARE_FORM = {
  sharedWithEmail: '',
  sharedWithFirmName: '',
  accessLevel: 'view',
  message: '',
}

const DEFAULT_REFERRAL_FORM = {
  receivingEmail: '',
  receivingFirmName: '',
  feeSplitPercent: '',
  projectedRecovery: '',
  notes: '',
}

const DEFAULT_CO_COUNSEL_FORM = {
  coCounselEmail: '',
  coCounselFirmName: '',
  feeSplitPercent: '',
  projectedRecovery: '',
  workflowStatus: 'initiated',
  nextStep: '',
  notes: '',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function useAttorneyFinanceCollaboration(selectedLeadId?: string) {
  const [financeSummary, setFinanceSummary] = useState<any>(null)
  const [financeLoading, setFinanceLoading] = useState(false)
  const [financeModel, setFinanceModel] = useState(DEFAULT_FINANCE_MODEL)
  const [financeMessage, setFinanceMessage] = useState<string | null>(null)

  const [caseShares, setCaseShares] = useState<any[]>([])
  const [caseShareForm, setCaseShareForm] = useState(DEFAULT_CASE_SHARE_FORM)
  const [caseShareMessage, setCaseShareMessage] = useState<string | null>(null)

  const [referrals, setReferrals] = useState<any[]>([])
  const [referralForm, setReferralForm] = useState(DEFAULT_REFERRAL_FORM)
  const [referralMessage, setReferralMessage] = useState<string | null>(null)

  const [coCounselWorkflows, setCoCounselWorkflows] = useState<any[]>([])
  const [coCounselForm, setCoCounselForm] = useState(DEFAULT_CO_COUNSEL_FORM)
  const [coCounselMessage, setCoCounselMessage] = useState<string | null>(null)

  const handleDownloadFinanceDataroom = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      setFinanceMessage(null)
      const blob = await downloadLeadFinanceDataroom(selectedLeadId)
      downloadBlob(blob, `dataroom-${selectedLeadId}.zip`)
    } catch (err: any) {
      setFinanceMessage(err.response?.data?.error || 'Failed to export data room.')
    }
  }, [selectedLeadId])

  const handleDownloadFinanceUnderwritingPdf = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      setFinanceMessage(null)
      const blob = await downloadLeadFinanceUnderwritingPdf(selectedLeadId)
      downloadBlob(blob, `underwriting-${selectedLeadId}.pdf`)
    } catch (err: any) {
      setFinanceMessage(err.response?.data?.error || 'Failed to export underwriting PDF.')
    }
  }, [selectedLeadId])

  const handleCreateCaseShare = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      setCaseShareMessage(null)
      const record = await createLeadCaseShare(selectedLeadId, {
        sharedWithEmail: caseShareForm.sharedWithEmail || undefined,
        sharedWithFirmName: caseShareForm.sharedWithFirmName || undefined,
        accessLevel: caseShareForm.accessLevel as 'view' | 'edit',
        message: caseShareForm.message || undefined,
      })
      setCaseShares((prev) => [record, ...prev])
      setCaseShareForm(DEFAULT_CASE_SHARE_FORM)
      setCaseShareMessage('Case shared.')
    } catch (err: any) {
      setCaseShareMessage(err.response?.data?.error || 'Failed to share case.')
    }
  }, [caseShareForm, selectedLeadId])

  const handleAcceptCaseShare = useCallback(async (shareId: string) => {
    try {
      const updated = await acceptCaseShare(shareId)
      setCaseShares((prev) => prev.map((item) => (item.id === shareId ? updated : item)))
    } catch (err: any) {
      setCaseShareMessage(err.response?.data?.error || 'Failed to accept share.')
    }
  }, [])

  const handleDeclineCaseShare = useCallback(async (shareId: string) => {
    try {
      const updated = await declineCaseShare(shareId)
      setCaseShares((prev) => prev.map((item) => (item.id === shareId ? updated : item)))
    } catch (err: any) {
      setCaseShareMessage(err.response?.data?.error || 'Failed to decline share.')
    }
  }, [])

  const handleCreateReferral = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      setReferralMessage(null)
      const record = await createLeadReferral(selectedLeadId, {
        receivingEmail: referralForm.receivingEmail || undefined,
        receivingFirmName: referralForm.receivingFirmName || undefined,
        feeSplitPercent: referralForm.feeSplitPercent ? Number(referralForm.feeSplitPercent) : undefined,
        projectedRecovery: referralForm.projectedRecovery ? Number(referralForm.projectedRecovery) : undefined,
        notes: referralForm.notes || undefined,
      })
      setReferrals((prev) => [record, ...prev])
      setReferralForm(DEFAULT_REFERRAL_FORM)
      setReferralMessage('Referral created.')
    } catch (err: any) {
      setReferralMessage(err.response?.data?.error || 'Failed to create referral.')
    }
  }, [referralForm, selectedLeadId])

  const handleAcceptReferral = useCallback(async (referralId: string) => {
    try {
      const updated = await acceptLeadReferral(referralId)
      setReferrals((prev) => prev.map((item) => (item.id === referralId ? updated : item)))
    } catch (err: any) {
      setReferralMessage(err.response?.data?.error || 'Failed to accept referral.')
    }
  }, [])

  const handleDeclineReferral = useCallback(async (referralId: string) => {
    try {
      const updated = await declineLeadReferral(referralId)
      setReferrals((prev) => prev.map((item) => (item.id === referralId ? updated : item)))
    } catch (err: any) {
      setReferralMessage(err.response?.data?.error || 'Failed to decline referral.')
    }
  }, [])

  const handleCreateCoCounselWorkflow = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      setCoCounselMessage(null)
      const record = await createLeadCoCounselWorkflow(selectedLeadId, {
        coCounselEmail: coCounselForm.coCounselEmail || undefined,
        coCounselFirmName: coCounselForm.coCounselFirmName || undefined,
        feeSplitPercent: coCounselForm.feeSplitPercent ? Number(coCounselForm.feeSplitPercent) : undefined,
        projectedRecovery: coCounselForm.projectedRecovery ? Number(coCounselForm.projectedRecovery) : undefined,
        workflowStatus: coCounselForm.workflowStatus,
        nextStep: coCounselForm.nextStep || undefined,
        notes: coCounselForm.notes || undefined,
      })
      setCoCounselWorkflows((prev) => [record, ...prev])
      setCoCounselForm(DEFAULT_CO_COUNSEL_FORM)
      setCoCounselMessage('Co-counsel workflow created.')
    } catch (err: any) {
      setCoCounselMessage(err.response?.data?.error || 'Failed to create co-counsel workflow.')
    }
  }, [coCounselForm, selectedLeadId])

  const handleAcceptCoCounsel = useCallback(async (workflowId: string) => {
    try {
      const updated = await acceptCoCounselWorkflow(workflowId)
      setCoCounselWorkflows((prev) => prev.map((item) => (item.id === workflowId ? updated : item)))
    } catch (err: any) {
      setCoCounselMessage(err.response?.data?.error || 'Failed to accept co-counsel.')
    }
  }, [])

  const handleDeclineCoCounsel = useCallback(async (workflowId: string) => {
    try {
      const updated = await declineCoCounselWorkflow(workflowId)
      setCoCounselWorkflows((prev) => prev.map((item) => (item.id === workflowId ? updated : item)))
    } catch (err: any) {
      setCoCounselMessage(err.response?.data?.error || 'Failed to decline co-counsel.')
    }
  }, [])

  useEffect(() => {
    if (!selectedLeadId) {
      setFinanceSummary(null)
      setCaseShares([])
      setReferrals([])
      setCoCounselWorkflows([])
      return
    }

    const loadFinance = async () => {
      try {
        setFinanceLoading(true)
        const data = await getLeadFinanceSummary(selectedLeadId)
        setFinanceSummary(data)
      } catch (err) {
        console.error('Failed to load finance summary:', err)
        setFinanceSummary(null)
      } finally {
        setFinanceLoading(false)
      }
    }

    const loadReferralData = async () => {
      try {
        const [shares, referralItems, coCounselItems] = await Promise.all([
          getLeadCaseShares(selectedLeadId),
          getLeadReferrals(selectedLeadId),
          getLeadCoCounselWorkflows(selectedLeadId),
        ])
        setCaseShares(Array.isArray(shares) ? shares : [])
        setReferrals(Array.isArray(referralItems) ? referralItems : [])
        setCoCounselWorkflows(Array.isArray(coCounselItems) ? coCounselItems : [])
      } catch (err) {
        console.error('Failed to load referral workflow data:', err)
        setCaseShares([])
        setReferrals([])
        setCoCounselWorkflows([])
      }
    }

    void loadFinance()
    void loadReferralData()
  }, [selectedLeadId])

  return {
    caseShareForm,
    caseShareMessage,
    caseShares,
    coCounselForm,
    coCounselMessage,
    coCounselWorkflows,
    financeLoading,
    financeMessage,
    financeModel,
    financeSummary,
    handleAcceptCaseShare,
    handleAcceptCoCounsel,
    handleAcceptReferral,
    handleCreateCaseShare,
    handleCreateCoCounselWorkflow,
    handleCreateReferral,
    handleDeclineCaseShare,
    handleDeclineCoCounsel,
    handleDeclineReferral,
    handleDownloadFinanceDataroom,
    handleDownloadFinanceUnderwritingPdf,
    referralForm,
    referralMessage,
    referrals,
    setCaseShareForm,
    setCoCounselForm,
    setFinanceModel,
    setReferralForm,
  }
}
