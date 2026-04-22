import { useCallback, useEffect, useState } from 'react'
import {
  createLeadInsurance,
  createLeadLien,
  getLeadCasePreparation,
  getLeadEvidenceFiles,
  getLeadInsurance,
  getLeadLiens,
  getLeadMedicalChronology,
  getLeadSettlementBenchmarks,
} from '../lib/api'

const DEFAULT_INSURANCE_FORM = {
  carrierName: '',
  policyNumber: '',
  policyLimit: '',
  adjusterName: '',
  adjusterEmail: '',
  adjusterPhone: '',
  notes: '',
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
  const [casePreparation, setCasePreparation] = useState<any>(null)
  const [settlementBenchmarks, setSettlementBenchmarks] = useState<any>(null)
  const [insuranceItems, setInsuranceItems] = useState<any[]>([])
  const [lienItems, setLienItems] = useState<any[]>([])
  const [insuranceForm, setInsuranceForm] = useState(DEFAULT_INSURANCE_FORM)
  const [lienForm, setLienForm] = useState(DEFAULT_LIEN_FORM)

  const handleAddInsurance = useCallback(async () => {
    if (!selectedLeadId || !insuranceForm.carrierName.trim()) return
    try {
      const record = await createLeadInsurance(selectedLeadId, {
        ...insuranceForm,
        policyLimit: insuranceForm.policyLimit || undefined,
      })
      setInsuranceItems((prev) => [record, ...prev])
      setInsuranceForm(DEFAULT_INSURANCE_FORM)
    } catch (err) {
      console.error('Failed to add insurance:', err)
    }
  }, [insuranceForm, selectedLeadId])

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
      setCasePreparation(null)
      setSettlementBenchmarks(null)
      return
    }

    const loadCaseInsights = async () => {
      try {
        const [chronology, preparation, benchmarks] = await Promise.all([
          getLeadMedicalChronology(selectedLeadId).catch(() => []),
          getLeadCasePreparation(selectedLeadId).catch(() => null),
          getLeadSettlementBenchmarks(selectedLeadId).catch(() => null),
        ])
        setMedicalChronology(Array.isArray(chronology) ? chronology : [])
        setCasePreparation(preparation)
        setSettlementBenchmarks(benchmarks)
      } catch {
        setMedicalChronology([])
        setCasePreparation(null)
        setSettlementBenchmarks(null)
      }
    }

    void loadCaseInsights()
  }, [isPostAcceptance, selectedLeadId])

  return {
    casePreparation,
    handleAddInsurance,
    handleAddLien,
    insuranceForm,
    insuranceItems,
    leadEvidenceFiles,
    lienForm,
    lienItems,
    medicalChronology,
    setInsuranceForm,
    setLienForm,
    settlementBenchmarks,
  }
}
