type AttorneyDashboardWorkstreamTasksProps = {
  taskForm: any
  setTaskForm: any
  handleAddTask: any
  selectedLeadId?: string
  createLeadSolTask: any
  setTaskItems: any
  setError: any
  taskItems: any[]
  handleToggleTask: any
  workflowBaseDate: string
  setWorkflowBaseDate: any
  workflowTemplateForm: any
  setWorkflowTemplateForm: any
  workflowStepForm: any
  setWorkflowStepForm: any
  handleAddWorkflowStep: any
  handleCreateWorkflowTemplate: any
  workflowMessage: string
  workflowSteps: any[]
  workflowTemplates: any[]
  handleApplyWorkflowTemplate: any
  handleDeleteWorkflowTemplate: any
  handleCreateTasksFromReadiness?: any
  leadCommandCenter?: any
}

export default function AttorneyDashboardWorkstreamTasks({
  taskForm,
  setTaskForm,
  handleAddTask,
  selectedLeadId,
  createLeadSolTask,
  setTaskItems,
  setError,
  taskItems,
  handleToggleTask,
  workflowBaseDate,
  setWorkflowBaseDate,
  workflowTemplateForm,
  setWorkflowTemplateForm,
  workflowStepForm,
  setWorkflowStepForm,
  handleAddWorkflowStep,
  handleCreateWorkflowTemplate,
  workflowMessage,
  workflowSteps,
  workflowTemplates,
  handleApplyWorkflowTemplate,
  handleDeleteWorkflowTemplate,
  handleCreateTasksFromReadiness,
  leadCommandCenter,
}: AttorneyDashboardWorkstreamTasksProps) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Tasks & Deadlines</h4>
      {leadCommandCenter ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900">Auto-generate blocker tasks</div>
          <div className="mt-1 text-amber-800">
            {leadCommandCenter.readiness.score}% readiness • {leadCommandCenter.missingItems.length} missing item{leadCommandCenter.missingItems.length === 1 ? '' : 's'}
            {leadCommandCenter.treatmentMonitor.largestGapDays > 0 ? ` • ${leadCommandCenter.treatmentMonitor.largestGapDays}-day treatment gap` : ''}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await handleCreateTasksFromReadiness?.()
                  if (result?.summary) {
                    setError(result.summary)
                  }
                } catch (err: any) {
                  setError(err.response?.data?.error || 'Failed to create blocker tasks')
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-amber-900 border border-amber-300 rounded-md hover:bg-amber-100"
            >
              Create tasks from blockers
            </button>
            <div className="text-xs text-amber-700 self-center">
              {leadCommandCenter.nextBestAction.title}
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <input
          value={taskForm.title}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, title: e.target.value }))}
          className="input md:col-span-2"
          placeholder="Task title"
        />
        <select
          value={taskForm.taskType}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, taskType: e.target.value }))}
          className="input"
        >
          <option value="general">General</option>
          <option value="statute">Statute of Limitations</option>
          <option value="milestone">Litigation Milestone</option>
          <option value="checkpoint">Medical Checkpoint</option>
          <option value="demand_deadline">Demand Deadline</option>
          <option value="negotiation_deadline">Negotiation Deadline</option>
        </select>
        <select
          value={taskForm.priority}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, priority: e.target.value }))}
          className="input"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          type="date"
          value={taskForm.dueDate}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, dueDate: e.target.value }))}
          className="input"
        />
        <input
          type="date"
          value={taskForm.reminderAt}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, reminderAt: e.target.value }))}
          className="input"
          placeholder="Reminder date"
        />
        <select
          value={taskForm.assignedRole}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, assignedRole: e.target.value }))}
          className="input"
        >
          <option value="attorney">Attorney</option>
          <option value="paralegal">Paralegal</option>
        </select>
        <input
          value={taskForm.assignedTo}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, assignedTo: e.target.value }))}
          className="input"
          placeholder="Assignee name/email"
        />
        <select
          value={taskForm.deadlineType}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, deadlineType: e.target.value }))}
          className="input"
        >
          <option value="">Deadline type</option>
          <option value="sol">Statute</option>
          <option value="demand">Demand</option>
          <option value="negotiation">Negotiation</option>
          <option value="court">Court</option>
        </select>
        <input
          value={taskForm.milestoneType}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, milestoneType: e.target.value }))}
          className="input"
          placeholder="Litigation milestone"
        />
        <input
          value={taskForm.checkpointType}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, checkpointType: e.target.value }))}
          className="input"
          placeholder="Medical checkpoint"
        />
        <select
          value={taskForm.escalationLevel}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, escalationLevel: e.target.value }))}
          className="input"
        >
          <option value="none">No escalation</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <input
          value={taskForm.notes}
          onChange={(e) => setTaskForm((prev: any) => ({ ...prev, notes: e.target.value }))}
          className="input md:col-span-2"
          placeholder="Notes"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleAddTask}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
        >
          Add Task
        </button>
        <button
          onClick={async () => {
            if (!selectedLeadId) return
            try {
              const record = await createLeadSolTask(selectedLeadId)
              setTaskItems((prev: any[]) => [record, ...prev])
            } catch (err: any) {
              setError(err.response?.data?.error || 'Failed to create SOL task')
            }
          }}
          className="px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
        >
          Add SOL Task
        </button>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {taskItems.length === 0 ? (
          <div className="text-gray-500">No tasks yet.</div>
        ) : (
          taskItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
              <div>
                <div className={`font-medium ${item.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                  {item.title}
                </div>
                <div className="text-gray-600 text-xs">
                  {item.taskType || 'general'} • {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'} • {item.priority}
                  {item.assignedTo ? ` • ${item.assignedRole || 'assignee'}: ${item.assignedTo}` : ''}
                  {item.escalationLevel && item.escalationLevel !== 'none' ? ` • ${item.escalationLevel}` : ''}
                </div>
              </div>
              <button
                onClick={() => handleToggleTask(item.id, item.status)}
                className="text-xs text-brand-600 hover:text-brand-800"
              >
                {item.status === 'done' ? 'Reopen' : 'Complete'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-semibold text-gray-900">Workflow Templates by Case Type</h5>
          <input
            type="date"
            value={workflowBaseDate}
            onChange={(e) => setWorkflowBaseDate(e.target.value)}
            className="input text-xs"
            placeholder="Base date"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <input
            value={workflowTemplateForm.name}
            onChange={(e) => setWorkflowTemplateForm((prev: any) => ({ ...prev, name: e.target.value }))}
            className="input"
            placeholder="Template name"
          />
          <select
            value={workflowTemplateForm.caseType}
            onChange={(e) => setWorkflowTemplateForm((prev: any) => ({ ...prev, caseType: e.target.value }))}
            className="input"
          >
            <option value="PI">PI</option>
            <option value="MVA">MVA</option>
            <option value="Premises">Premises</option>
            <option value="MedMal">MedMal</option>
          </select>
          <input
            value={workflowTemplateForm.description}
            onChange={(e) => setWorkflowTemplateForm((prev: any) => ({ ...prev, description: e.target.value }))}
            className="input"
            placeholder="Description"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
          <input
            value={workflowStepForm.title}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, title: e.target.value }))}
            className="input md:col-span-2"
            placeholder="Step title"
          />
          <input
            value={workflowStepForm.offsetDays}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, offsetDays: e.target.value }))}
            className="input"
            placeholder="Offset days"
          />
          <select
            value={workflowStepForm.taskType}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, taskType: e.target.value }))}
            className="input"
          >
            <option value="general">General</option>
            <option value="statute">Statute</option>
            <option value="milestone">Milestone</option>
            <option value="checkpoint">Checkpoint</option>
            <option value="demand_deadline">Demand Deadline</option>
            <option value="negotiation_deadline">Negotiation Deadline</option>
          </select>
          <select
            value={workflowStepForm.priority}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, priority: e.target.value }))}
            className="input"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            value={workflowStepForm.assignedRole}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, assignedRole: e.target.value }))}
            className="input"
          >
            <option value="attorney">Attorney</option>
            <option value="paralegal">Paralegal</option>
          </select>
          <input
            value={workflowStepForm.reminderOffsetDays}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, reminderOffsetDays: e.target.value }))}
            className="input"
            placeholder="Reminder offset days"
          />
          <select
            value={workflowStepForm.escalationLevel}
            onChange={(e) => setWorkflowStepForm((prev: any) => ({ ...prev, escalationLevel: e.target.value }))}
            className="input"
          >
            <option value="none">No escalation</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddWorkflowStep}
            className="px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50"
          >
            Add Step
          </button>
          <button
            onClick={handleCreateWorkflowTemplate}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Save Template
          </button>
          {workflowMessage ? <span className="text-xs text-gray-500">{workflowMessage}</span> : null}
        </div>
        {workflowSteps.length > 0 ? (
          <div className="text-xs text-gray-600">
            Steps: {workflowSteps.map((step) => `${step.offsetDays}d ${step.title}`).join(' • ')}
          </div>
        ) : null}
        <div className="space-y-2 text-sm">
          {workflowTemplates.length === 0 ? (
            <div className="text-gray-500">No workflow templates yet.</div>
          ) : (
            workflowTemplates.map((item) => (
              <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-gray-600 text-xs">
                    {item.caseType} • {item.steps?.length || 0} steps
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApplyWorkflowTemplate(item.id)}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflowTemplate(item.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
