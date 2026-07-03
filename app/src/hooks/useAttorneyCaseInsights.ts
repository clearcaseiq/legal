import { useCallback, useEffect, useState } from 'react'
import {
  createLeadInsurance,
  createLeadLien,
  getLeadCasePreparation,
  getLeadEvidenceFiles,
  getLeadInsurance,
  getLeadLiens,
  getLeadInsuranceSuggestion,
  getLeadMedicalChronology,
  getLeadMedicalChronologySummary,
  getLeadSettlementBenchmarks,
  type MedicalChronologySummary,
  requestLeadDecPage,
  updateLeadInsurance,
} from '../lib/api'

const DEFAULT_INSURANCE_FORM = {
  carrierName: '',
  policyNumber: '',
  policyLimit: '',
  adjusterName: '',
  adjusterEmail: '',
  adjusterPhone: '',
  notes: '',
  insuredParty: '',
  coverageType: '',
  claimNumber: '',
  claimStatus: 'not_opened',
}

const DEFAULT_LIEN_FORM = {
  name: '',
  type: '',
  amount: '',
  status: 'open',
  notes: '',
}

export function useAttorneyCaseInsights(selectedLeadId?: string, isPostAcceptance = false) {
  const [leadEvidenceFiles, setLeadEvidenceFiles] = useState<any[]>([])
  const [medicalChronology, setMedicalChronology] = useState<any[]>([])
  const [medicalChronologySummary, setMedicalChronologySummary] = useState<MedicalChronologySummary | null>(null)
  const [casePreparation, setCasePreparation] = useState<any>(null)
  const [settlementBenchmarks, setSettlementBenchmarks] = useState<any>(null)
  const [insuranceItems, setInsuranceItems] = useState<any[]>([])
  const [lienItems, setLienItems] = useState<any[]>([])
  const [insuranceForm, setInsuranceForm] = useState(DEFAULT_INSURANCE_FORM)
  const [insuranceSuggestion, setInsuranceSuggestion] = useState<any>(null)
  const [lienForm, setLienForm] = useState(DEFAULT_LIEN_FORM)

  const handleAddInsurance = useCallback(async () => {
    if (!selectedLeadId || !insuranceForm.carrierName.trim()) return
    try {
      const record = await createLeadInsurance(selectedLeadId, {
        ...insuranceForm,
        policyLimit: insuranceForm.policyLimit || undefined,
        insuredParty: insuranceForm.insuredParty || undefined,
        coverageType: insuranceForm.coverageType || undefined,
        claimNumber: insuranceForm.claimNumber || undefined,
      })
      setInsuranceItems((prev) => [record, ...prev])
      setInsuranceForm(DEFAULT_INSURANCE_FORM)
    } catch (err) {
      console.error('Failed to add insurance:', err)
    }
  }, [insuranceForm, selectedLeadId])

  // Inline edits to an existing insurance record (e.g. recording a claim number
  // or moving the claim to "open"); merges the server response back into state.
  const handleUpdateInsurance = useCallback(async (insuranceId: string, patch: Record<string, any>) => {
    if (!selectedLeadId) return
    try {
      const record = await updateLeadInsurance(selectedLeadId, insuranceId, patch)
      setInsuranceItems((prev) => prev.map((item) => (item.id === insuranceId ? record : item)))
    } catch (err) {
      console.error('Failed to update insurance:', err)
    }
  }, [selectedLeadId])

  const handleRequestDecPage = useCallback(async (insuranceId: string) => {
    if (!selectedLeadId) return
    try {
      const result = await requestLeadDecPage(selectedLeadId, insuranceId)
      if (result?.insurance) {
        setInsuranceItems((prev) => prev.map((item) => (item.id === insuranceId ? result.insurance : item)))
      }
    } catch (err) {
      console.error('Failed to request Dec Page:', err)
    }
  }, [selectedLeadId])

  // Merge the intake-derived suggestion into the add-insurance form so the
  // attorney can review and save it rather than re-typing the client's answers.
  const applyInsuranceSuggestion = useCallback(() => {
    const s = insuranceSuggestion?.suggestion
    if (!s) return
    setInsuranceForm((prev: typeof DEFAULT_INSURANCE_FORM) => ({
      ...prev,
      ...(s.carrierName ? { carrierName: s.carrierName } : {}),
      ...(s.policyLimit != null ? { policyLimit: String(s.policyLimit) } : {}),
      ...(s.insuredParty ? { insuredParty: s.insuredParty } : {}),
      ...(s.coverageType ? { coverageType: s.coverageType } : {}),
    }))
  }, [insuranceSuggestion])

  const handleAddLien = useCallback(async () => {
    if (!selectedLeadId || !lienForm.name.trim()) return
    try {
      const record = await createLeadLien(selectedLeadId, {
        ...lienForm,
        amount: lienForm.amount || undefined,
      })
      setLienItems((prev) => [record, ...prev])
      setLienForm(DEFAULT_LIEN_FORM)
    } catch (err) {
      console.error('Failed to add lien:', err)
    }
  }, [lienForm, selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId) {
      setLeadEvidenceFiles([])
      return
    }

    const loadEvidence = async () => {
      try {
        const files = await getLeadEvidenceFiles(selectedLeadId)
        setLeadEvidenceFiles(Array.isArray(files) ? files : [])
      } catch (err) {
        console.error('Failed to load lead evidence files:', err)
        setLeadEvidenceFiles([])
      }
    }

    void loadEvidence()
  }, [selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId) {
      setInsuranceItems([])
      setLienItems([])
      setInsuranceSuggestion(null)
      return
    }

    const loadInsurance = async () => {
      try {
        const records = await getLeadInsurance(selectedLeadId)
        setInsuranceItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load insurance details:', err)
        setInsuranceItems([])
      }
    }

    const loadSuggestion = async () => {
      try {
        const suggestion = await getLeadInsuranceSuggestion(selectedLeadId)
        setInsuranceSuggestion(suggestion || null)
      } catch (err) {
        console.error('Failed to load insurance suggestion:', err)
        setInsuranceSuggestion(null)
      }
    }

    void loadSuggestion()

    const loadLiens = async () => {
      try {
        const records = await getLeadLiens(selectedLeadId)
        setLienItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load lien holders:', err)
        setLienItems([])
      }
    }

    void loadInsurance()
    void loadLiens()
  }, [selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId || !isPostAcceptance) {
      setMedicalChronology([])
      setMedicalChronologySummary(null)
      setCasePreparation(null)
      setSettlementBenchmarks(null)
      return
    }

    const loadCaseInsights = async () => {
      try {
        const [chronology, summary, preparation, benchmarks] = await Promise.all([
          getLeadMedicalChronology(selectedLeadId).catch(() => []),
          getLeadMedicalChronologySummary(selectedLeadId).catch(() => null),
          getLeadCasePreparation(selectedLeadId).catch(() => null),
          getLeadSettlementBenchmarks(selectedLeadId).catch(() => null),
        ])
        setMedicalChronology(Array.isArray(chronology) ? chronology : [])
        setMedicalChronologySummary(summary)
        setCasePreparation(preparation)
        setSettlementBenchmarks(benchmarks)
      } catch {
        setMedicalChronology([])
        setMedicalChronologySummary(null)
        setCasePreparation(null)
        setSettlementBenchmarks(null)
      }
    }

    void loadCaseInsights()
  }, [isPostAcceptance, selectedLeadId])

  return {
    casePreparation,
    handleAddInsurance,
    handleUpdateInsurance,
    handleRequestDecPage,
    applyInsuranceSuggestion,
    insuranceSuggestion,
    handleAddLien,
    insuranceForm,
    insuranceItems,
    leadEvidenceFiles,
    lienForm,
    lienItems,
    medicalChronology,
    medicalChronologySummary,
    setInsuranceForm,
    setLienForm,
    settlementBenchmarks,
  }
}
