import { useCallback, useEffect, useState } from 'react'
import {
  applyWorkflowTemplate,
  createLeadTask,
  createLeadTasksFromReadiness,
  createWorkflowTemplate,
  deleteWorkflowTemplate,
  getLeadTasks,
  getWorkflowTemplates,
  updateLeadTask,
} from '../lib/api'
import { invalidateAttorneyDashboardSummary } from './useAttorneyDashboardSummary'

const DEFAULT_TASK_FORM = {
  title: '',
  dueDate: '',
  priority: 'medium',
  notes: '',
  taskType: 'general',
  milestoneType: '',
  checkpointType: '',
  deadlineType: '',
  assignedRole: 'attorney',
  assignedTo: '',
  reminderAt: '',
  escalationLevel: 'none',
}

const DEFAULT_WORKFLOW_TEMPLATE_FORM = {
  name: '',
  caseType: 'PI',
  description: '',
}

const DEFAULT_WORKFLOW_STEP_FORM = {
  title: '',
  offsetDays: '0',
  priority: 'medium',
  taskType: 'general',
  milestoneType: '',
  checkpointType: '',
  deadlineType: '',
  assignedRole: 'attorney',
  reminderOffsetDays: '1',
  escalationLevel: 'none',
}

export function useAttorneyTaskWorkflow(selectedLeadId?: string) {
  const [taskItems, setTaskItems] = useState<any[]>([])
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK_FORM)
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([])
  const [workflowMessage, setWorkflowMessage] = useState('')
  const [workflowBaseDate, setWorkflowBaseDate] = useState('')
  const [workflowTemplateForm, setWorkflowTemplateForm] = useState(DEFAULT_WORKFLOW_TEMPLATE_FORM)
  const [workflowStepForm, setWorkflowStepForm] = useState(DEFAULT_WORKFLOW_STEP_FORM)

  const handleAddTask = useCallback(async () => {
    if (!selectedLeadId || !taskForm.title.trim()) return
    try {
      const record = await createLeadTask(selectedLeadId, {
        ...taskForm,
        dueDate: taskForm.dueDate || undefined,
        reminderAt: taskForm.reminderAt || undefined,
        milestoneType: taskForm.milestoneType || undefined,
        checkpointType: taskForm.checkpointType || undefined,
        deadlineType: taskForm.deadlineType || undefined,
        assignedTo: taskForm.assignedTo || undefined,
      })
      invalidateAttorneyDashboardSummary()
      setTaskItems((prev) => [record, ...prev])
      setTaskForm(DEFAULT_TASK_FORM)
    } catch (err) {
      console.error('Failed to add task:', err)
    }
  }, [selectedLeadId, taskForm])

  const handleAddWorkflowStep = useCallback(() => {
    if (!workflowStepForm.title.trim()) return
    setWorkflowSteps((prev) => ([
      ...prev,
      {
        ...workflowStepForm,
        offsetDays: Number(workflowStepForm.offsetDays || 0),
        reminderOffsetDays: Number(workflowStepForm.reminderOffsetDays || 1),
      },
    ]))
    setWorkflowStepForm((prev) => ({
      ...prev,
      title: '',
      offsetDays: '0',
    }))
  }, [workflowStepForm])

  const handleCreateWorkflowTemplate = useCallback(async () => {
    try {
      if (!workflowTemplateForm.name.trim() || workflowSteps.length === 0) {
        setWorkflowMessage('Add a template name and at least one step.')
        return
      }
      const template = await createWorkflowTemplate({
        ...workflowTemplateForm,
        steps: workflowSteps,
      })
      setWorkflowTemplates((prev) => [template, ...prev])
      setWorkflowSteps([])
      setWorkflowTemplateForm(DEFAULT_WORKFLOW_TEMPLATE_FORM)
      setWorkflowMessage('Template saved.')
    } catch (err: any) {
      setWorkflowMessage(err.response?.data?.error || 'Failed to save template')
    }
  }, [workflowTemplateForm, workflowSteps])

  const handleApplyWorkflowTemplate = useCallback(async (templateId: string) => {
    if (!selectedLeadId) return
    try {
      await applyWorkflowTemplate(selectedLeadId, templateId, {
        baseDate: workflowBaseDate || undefined,
      })
      const records = await getLeadTasks(selectedLeadId)
      setTaskItems(Array.isArray(records) ? records : [])
      setWorkflowMessage('Workflow applied.')
    } catch (err: any) {
      setWorkflowMessage(err.response?.data?.error || 'Failed to apply workflow')
    }
  }, [selectedLeadId, workflowBaseDate])

  const handleDeleteWorkflowTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteWorkflowTemplate(templateId)
      setWorkflowTemplates((prev) => prev.filter((item) => item.id !== templateId))
    } catch (err) {
      console.error('Failed to delete workflow template:', err)
    }
  }, [])

  const handleToggleTask = useCallback(async (taskId: string, currentStatus: string) => {
    if (!selectedLeadId) return
    try {
      const nextStatus = currentStatus === 'done' ? 'open' : 'done'
      const record = await updateLeadTask(selectedLeadId, taskId, { status: nextStatus })
      invalidateAttorneyDashboardSummary()
      setTaskItems((prev) => prev.map((item) => (item.id === taskId ? record : item)))
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }, [selectedLeadId])

  const handleCreateTasksFromReadiness = useCallback(async () => {
    if (!selectedLeadId) return { createdCount: 0, summary: 'No lead selected.' }
    const result = await createLeadTasksFromReadiness(selectedLeadId)
    invalidateAttorneyDashboardSummary()
    if (Array.isArray(result.tasks) && result.tasks.length > 0) {
      setTaskItems((prev) => [...result.tasks, ...prev])
    }
    return result
  }, [selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId) {
      setTaskItems([])
      return
    }

    const loadTasks = async () => {
      try {
        const records = await getLeadTasks(selectedLeadId)
        setTaskItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load case tasks:', err)
        setTaskItems([])
      }
    }

    const loadWorkflowTemplates = async () => {
      try {
        const data = await getWorkflowTemplates()
        setWorkflowTemplates(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load workflow templates:', err)
        setWorkflowTemplates([])
      }
    }

    void loadTasks()
    void loadWorkflowTemplates()
  }, [selectedLeadId])

  return {
    handleAddTask,
    handleAddWorkflowStep,
    handleApplyWorkflowTemplate,
    handleCreateTasksFromReadiness,
    handleCreateWorkflowTemplate,
    handleDeleteWorkflowTemplate,
    handleToggleTask,
    setTaskForm,
    setTaskItems,
    setWorkflowBaseDate,
    setWorkflowStepForm,
    setWorkflowTemplateForm,
    taskForm,
    taskItems,
    workflowBaseDate,
    workflowMessage,
    workflowStepForm,
    workflowSteps,
    workflowTemplateForm,
    workflowTemplates,
  }
}
