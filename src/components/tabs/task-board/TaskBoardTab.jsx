import { useTaskBoard } from '../../../context/TaskBoardContext'
import { TASK_BOARD_VIEWS } from '../../../config/taskboard'
import { useTaskBoardData } from '../../../hooks/useTaskBoard'
import KanbanHeader from './kanban/KanbanHeader'
import KanbanBoard from './kanban/KanbanBoard'
import TaskDetailModal from './modal/TaskDetailModal'
import TaskCreateModal from './modal/TaskCreateModal'
import ProjectsView from './projects/ProjectsView'
import ProjectCreateModal from './projects/ProjectCreateModal'
import TasksListView from './tasks/TasksListView'
import DocumentsView from './documents/DocumentsView'
import LoadingSpinner from '../../shared/LoadingSpinner'

export default function TaskBoardTab() {
  const { state } = useTaskBoard()
  useTaskBoardData()

  return (
    <>
      <ViewContent view={state.activeView} loading={state.loading} />
      {state.selectedTask && <TaskDetailModal />}
      <TaskCreateModal />
      <ProjectCreateModal />
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
      return <ProjectsView />
    case TASK_BOARD_VIEWS.TASKS:
    case 'tasks':
      return <TasksListView />
    case TASK_BOARD_VIEWS.DOCUMENTS:
    case 'documents':
      return <DocumentsView />
    default:
      return null
  }
}
