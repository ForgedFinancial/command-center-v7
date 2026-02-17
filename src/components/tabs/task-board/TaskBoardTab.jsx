import { useTaskBoard } from '../../../context/TaskBoardContext'
import { TASK_BOARD_VIEWS } from '../../../config/taskboard'
import { useTaskBoardData } from '../../../hooks/useTaskBoard'
import EmptyState from '../../shared/EmptyState'
import KanbanHeader from './kanban/KanbanHeader'
import KanbanBoard from './kanban/KanbanBoard'
import TaskDetailModal from './modal/TaskDetailModal'
import TaskCreateModal from './modal/TaskCreateModal'
import LoadingSpinner from '../../shared/LoadingSpinner'

export default function TaskBoardTab() {
  const { state } = useTaskBoard()
  useTaskBoardData()

  return (
    <>
      <ViewContent view={state.activeView} loading={state.loading} />
      {state.selectedTask && <TaskDetailModal />}
      <TaskCreateModal />
    </>
  )
}

function ViewContent({ view, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <LoadingSpinner />
      </div>
    )
  }

  switch (view) {
    case TASK_BOARD_VIEWS.BOARD:
    case 'board':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <KanbanHeader />
          <KanbanBoard />
        </div>
      )
    case TASK_BOARD_VIEWS.PROJECTS:
    case 'projects':
      return <EmptyState icon="📁" title="Projects" message="Projects view coming in Phase 3" />
    case TASK_BOARD_VIEWS.TASKS:
    case 'tasks':
      return <EmptyState icon="✅" title="Tasks" message="Tasks list coming in Phase 3" />
    case TASK_BOARD_VIEWS.DOCUMENTS:
    case 'documents':
      return <EmptyState icon="📄" title="Documents" message="Documents view coming in Phase 3" />
    default:
      return null
  }
}
