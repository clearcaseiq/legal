import { useCallback, useEffect, useState } from 'react'
import {
  createHealthRule,
  createNegotiationCadenceTemplate,
  createRecurringInvoice,
  deleteHealthRule,
  deleteNegotiationCadenceTemplate,
  getHealthRules,
  getLeadHealth,
  getNegotiationCadenceTemplates,
  getRecurringInvoices,
  processRecurringInvoices,
  saveLeadHealth,
} from '../lib/api'

const DEFAULT_HEALTH_RULE_FORM = {
  threshold: '60',
  action: '',
}

const DEFAULT_CADENCE_TEMPLATE_FORM = {
  name: '',
  triggerEventType: 'offer',
}

const DEFAULT_CADENCE_STEP_FORM = {
  offsetDays: '3',
  channel: 'email',
  message: '',
}

const DEFAULT_RECURRING_INVOICE_FORM = {
  amount: '',
  intervalDays: '30',
  nextRunAt: '',
  notes: '',
}

export function useAttorneyCaseHealth(selectedLeadId?: string) {
  const [caseHealth, setCaseHealth] = useState<any>(null)
  const [healthRules, setHealthRules] = useState<any[]>([])
  const [healthRuleForm, setHealthRuleForm] = useState(DEFAULT_HEALTH_RULE_FORM)
  const [negotiationCadenceTemplates, setNegotiationCadenceTemplates] = useState<any[]>([])
  const [recurringInvoices, setRecurringInvoices] = useState<any[]>([])
  const [cadenceTemplateForm, setCadenceTemplateForm] = useState(DEFAULT_CADENCE_TEMPLATE_FORM)
  const [cadenceStepForm, setCadenceStepForm] = useState(DEFAULT_CADENCE_STEP_FORM)
  const [cadenceSteps, setCadenceSteps] = useState<any[]>([])
  const [recurringInvoiceForm, setRecurringInvoiceForm] = useState(DEFAULT_RECURRING_INVOICE_FORM)

  const handleAddHealthRule = useCallback(async () => {
    if (!healthRuleForm.action.trim()) return
    try {
      const record = await createHealthRule({
        threshold: Number(healthRuleForm.threshold),
        action: healthRuleForm.action,
      })
      setHealthRules((prev) => [...prev, record].sort((a, b) => a.threshold - b.threshold))
      setHealthRuleForm(DEFAULT_HEALTH_RULE_FORM)
    } catch (err) {
      console.error('Failed to add health rule:', err)
    }
  }, [healthRuleForm])

  const handleDeleteHealthRule = useCallback(async (ruleId: string) => {
    try {
      await deleteHealthRule(ruleId)
      setHealthRules((prev) => prev.filter((rule) => rule.id !== ruleId))
    } catch (err) {
      console.error('Failed to delete health rule:', err)
    }
  }, [])

  const handleAddCadenceStep = useCallback(() => {
    if (!cadenceStepForm.message.trim()) return
    setCadenceSteps((prev) => [
      ...prev,
      {
        offsetDays: Number(cadenceStepForm.offsetDays) || 0,
        channel: cadenceStepForm.channel,
        message: cadenceStepForm.message,
      },
    ])
    setCadenceStepForm(DEFAULT_CADENCE_STEP_FORM)
  }, [cadenceStepForm])

  const handleCreateCadenceTemplate = useCallback(async () => {
    if (!cadenceTemplateForm.name.trim() || cadenceSteps.length === 0) return
    try {
      const record = await createNegotiationCadenceTemplate({
        name: cadenceTemplateForm.name,
        triggerEventType: cadenceTemplateForm.triggerEventType,
        steps: cadenceSteps,
      })
      setNegotiationCadenceTemplates((prev) => [record, ...prev])
      setCadenceTemplateForm(DEFAULT_CADENCE_TEMPLATE_FORM)
      setCadenceSteps([])
    } catch (err) {
      console.error('Failed to create negotiation cadence template:', err)
    }
  }, [cadenceTemplateForm, cadenceSteps])

  const handleDeleteCadenceTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteNegotiationCadenceTemplate(templateId)
      setNegotiationCadenceTemplates((prev) => prev.filter((item) => item.id !== templateId))
    } catch (err) {
      console.error('Failed to delete cadence template:', err)
    }
  }, [])

  const handleAddRecurringInvoice = useCallback(async () => {
    if (!selectedLeadId || !recurringInvoiceForm.amount) return
    try {
      const record = await createRecurringInvoice(selectedLeadId, {
        amount: recurringInvoiceForm.amount,
        intervalDays: recurringInvoiceForm.intervalDays,
        nextRunAt: recurringInvoiceForm.nextRunAt || undefined,
        notes: recurringInvoiceForm.notes,
      })
      setRecurringInvoices((prev) => [record, ...prev])
      setRecurringInvoiceForm(DEFAULT_RECURRING_INVOICE_FORM)
    } catch (err) {
      console.error('Failed to create recurring invoice:', err)
    }
  }, [recurringInvoiceForm, selectedLeadId])

  const handleProcessRecurringInvoices = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      const data = await processRecurringInvoices(selectedLeadId)
      if (data?.created) {
        const records = await getRecurringInvoices(selectedLeadId)
        setRecurringInvoices(Array.isArray(records) ? records : [])
      }
    } catch (err) {
      console.error('Failed to process recurring invoices:', err)
    }
  }, [selectedLeadId])

  const handleRefreshHealth = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      const data = await saveLeadHealth(selectedLeadId)
      setCaseHealth(data)
    } catch (err) {
      console.error('Failed to refresh case health:', err)
    }
  }, [selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId) {
      setCaseHealth(null)
      setRecurringInvoices([])
      return
    }

    const loadHealth = async () => {
      try {
        const data = await getLeadHealth(selectedLeadId)
        setCaseHealth(data)
      } catch (err) {
        console.error('Failed to load case health:', err)
        setCaseHealth(null)
      }
    }

    const loadRecurringInvoices = async () => {
      try {
        const data = await getRecurringInvoices(selectedLeadId)
        setRecurringInvoices(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load recurring invoices:', err)
        setRecurringInvoices([])
      }
    }

    void loadHealth()
    void loadRecurringInvoices()
  }, [selectedLeadId])

  useEffect(() => {
    const loadHealthRules = async () => {
      try {
        const data = await getHealthRules()
        setHealthRules(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load health rules:', err)
        setHealthRules([])
      }
    }

    const loadCadenceTemplates = async () => {
      try {
        const data = await getNegotiationCadenceTemplates()
        setNegotiationCadenceTemplates(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load negotiation cadence templates:', err)
        setNegotiationCadenceTemplates([])
      }
    }

    void loadHealthRules()
    void loadCadenceTemplates()
  }, [])

  return {
    cadenceStepForm,
    cadenceSteps,
    cadenceTemplateForm,
    caseHealth,
    handleAddCadenceStep,
    handleAddHealthRule,
    handleAddRecurringInvoice,
    handleCreateCadenceTemplate,
    handleDeleteCadenceTemplate,
    handleDeleteHealthRule,
    handleProcessRecurringInvoices,
    handleRefreshHealth,
    healthRuleForm,
    healthRules,
    negotiationCadenceTemplates,
    recurringInvoiceForm,
    recurringInvoices,
    setCadenceStepForm,
    setCadenceTemplateForm,
    setHealthRuleForm,
    setRecurringInvoiceForm,
  }
}
