import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  downloadDemandLetterDocx,
  draftDemandLetter,
  getAttorneyDecisionBenchmark,
  getAttorneyDecisionProfile,
  getAttorneyDecisionSummary,
  getDemandLetter,
  listDemandLetters,
  regenerateLeadAnalysis,
  saveAttorneyDecisionProfile,
} from '../lib/api'

type SetPageError = (message: string) => void

export function useAttorneyDecisionSupport(
  selectedLeadId?: string,
  updateLeadInState?: (leadId: string, updates: Record<string, unknown>) => void,
  setSelectedLead?: Dispatch<SetStateAction<any>>,
  setPageError?: SetPageError,
) {
  const [decisionProfileLoading, setDecisionProfileLoading] = useState(false)
  const [decisionBenchmark, setDecisionBenchmark] = useState<any>(null)
  const [decisionSummary, setDecisionSummary] = useState<any>(null)
  const [negotiationStyle, setNegotiationStyle] = useState('')
  const [riskTolerance, setRiskTolerance] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [demandDraftLoading, setDemandDraftLoading] = useState(false)
  const [demandDraftMessage, setDemandDraftMessage] = useState<string | null>(null)
  const [demandDraftContent, setDemandDraftContent] = useState<string | null>(null)
  const [demandDraftId, setDemandDraftId] = useState<string | null>(null)

  const handleSaveDecisionProfile = useCallback(async () => {
    try {
      setDecisionProfileLoading(true)
      const profile = await saveAttorneyDecisionProfile({
        negotiationStyle: negotiationStyle || undefined,
        riskTolerance: riskTolerance || undefined,
      })
      const benchmark = await getAttorneyDecisionBenchmark()
      setDecisionBenchmark(benchmark)
      setNegotiationStyle(profile?.negotiationStyle || negotiationStyle)
      setRiskTolerance(profile?.riskTolerance || riskTolerance)
    } catch (err) {
      console.error('Failed to save decision profile:', err)
    } finally {
      setDecisionProfileLoading(false)
    }
  }, [negotiationStyle, riskTolerance])

  const handleRegenerateAnalysis = useCallback(async (leadId?: string, assessmentId?: string) => {
    if (!assessmentId || !leadId) return
    try {
      setAnalysisLoading(true)
      const response = await regenerateLeadAnalysis(assessmentId)
      const analysisPayload = response?.data || response
      updateLeadInState?.(leadId, {})
      setSelectedLead?.((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          assessment: {
            ...prev.assessment,
            chatgptAnalysis: JSON.stringify(analysisPayload),
          },
        }
      })
    } catch (err: any) {
      console.error('Failed to regenerate analysis:', err)
      setPageError?.(err.response?.data?.error || 'Failed to regenerate analysis')
    } finally {
      setAnalysisLoading(false)
    }
  }, [setPageError, setSelectedLead, updateLeadInState])

  const handleViewLatestDraft = useCallback(async (assessmentId?: string) => {
    if (!assessmentId) return
    try {
      setDemandDraftLoading(true)
      setDemandDraftMessage(null)
      setDemandDraftContent(null)
      const drafts = await listDemandLetters(assessmentId)
      const latest = Array.isArray(drafts) ? drafts[0] : null
      if (!latest?.demand_id) {
        const created = await draftDemandLetter(assessmentId)
        if (created?.content) {
          setDemandDraftContent(created.content)
          setDemandDraftMessage('Draft created')
          if (created?.demand_id) setDemandDraftId(created.demand_id)
          return
        }
        setDemandDraftMessage('No draft found')
        return
      }
      setDemandDraftId(latest.demand_id)
      const detail = await getDemandLetter(latest.demand_id)
      const content = detail?.content?.trim()
      if (!content || ['n/a', 'na', 'not available', 'not available.'].includes(content.toLowerCase())) {
        const regenerated = await draftDemandLetter(assessmentId)
        if (regenerated?.content) {
          setDemandDraftContent(regenerated.content)
          setDemandDraftMessage('Draft regenerated')
          if (regenerated?.demand_id) setDemandDraftId(regenerated.demand_id)
          return
        }
        setDemandDraftMessage('Draft content unavailable')
        return
      }
      setDemandDraftContent(detail.content)
    } catch (err: any) {
      console.error('Failed to load demand letter:', err)
      setDemandDraftMessage(err.response?.data?.error || 'Failed to load demand letter')
    } finally {
      setDemandDraftLoading(false)
    }
  }, [])

  const handleDraftDemandLetter = useCallback(async (assessmentId?: string) => {
    if (!assessmentId) return
    try {
      setDemandDraftLoading(true)
      setDemandDraftMessage(null)
      setDemandDraftContent(null)
      const draft = await draftDemandLetter(assessmentId)
      if (draft?.content) {
        setDemandDraftContent(draft.content)
        setDemandDraftMessage('Draft saved')
        if (draft?.demand_id) setDemandDraftId(draft.demand_id)
      } else {
        setDemandDraftMessage('Draft saved, loading content…')
        await handleViewLatestDraft(assessmentId)
      }
    } catch (err: any) {
      console.error('Failed to draft demand letter:', err)
      setDemandDraftMessage(err.response?.data?.error || 'Failed to draft demand letter')
    } finally {
      setDemandDraftLoading(false)
    }
  }, [handleViewLatestDraft])

  const handleDownloadDemandDocx = useCallback(async () => {
    if (!demandDraftId) return
    try {
      setDemandDraftLoading(true)
      const blob = await downloadDemandLetterDocx(demandDraftId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `demand-letter-${demandDraftId}.docx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Failed to download demand letter:', err)
      setDemandDraftMessage(err.response?.data?.error || 'Failed to download demand letter')
    } finally {
      setDemandDraftLoading(false)
    }
  }, [demandDraftId])

  useEffect(() => {
    if (!selectedLeadId) return
    const loadDecisionProfile = async () => {
      try {
        setDecisionProfileLoading(true)
        const profile = await getAttorneyDecisionProfile()
        setNegotiationStyle(profile?.negotiationStyle || '')
        setRiskTolerance(profile?.riskTolerance || '')
      } catch (err) {
        console.error('Failed to load decision profile:', err)
      } finally {
        setDecisionProfileLoading(false)
      }
    }
    const loadDecisionBenchmark = async () => {
      try {
        const data = await getAttorneyDecisionBenchmark()
        setDecisionBenchmark(data)
      } catch (err) {
        console.error('Failed to load decision benchmarks:', err)
        setDecisionBenchmark(null)
      }
    }
    const loadDecisionSummary = async () => {
      try {
        const data = await getAttorneyDecisionSummary()
        setDecisionSummary(data)
      } catch (err) {
        console.error('Failed to load decision summary:', err)
        setDecisionSummary(null)
      }
    }
    void loadDecisionProfile()
    void loadDecisionBenchmark()
    void loadDecisionSummary()
  }, [selectedLeadId])

  return {
    analysisLoading,
    decisionBenchmark,
    decisionProfileLoading,
    decisionSummary,
    demandDraftContent,
    demandDraftId,
    demandDraftLoading,
    demandDraftMessage,
    handleDownloadDemandDocx,
    handleDraftDemandLetter,
    handleRegenerateAnalysis,
    handleSaveDecisionProfile,
    handleViewLatestDraft,
    negotiationStyle,
    riskTolerance,
    setNegotiationStyle,
    setRiskTolerance,
  }
}
