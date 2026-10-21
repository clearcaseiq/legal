import { lazy } from 'react'
import { HubTabs } from '../shared/HubTabs'

const TasksPage = lazy(() => import('./TasksPage'))
const DeadlinesPage = lazy(() => import('./DeadlinesPage'))

/** The cross-case task queue, with the statute-of-limitations radar beside it. */
export default function TasksHubPage() {
  return (
    <div data-tour="tasks-hub">
      <HubTabs
        label="Tasks"
        tabs={[
          { id: 'tasks', label: 'Tasks', render: () => <TasksPage /> },
          { id: 'deadlines', label: 'Deadlines', render: () => <DeadlinesPage /> },
        ]}
      />
    </div>
  )
}
