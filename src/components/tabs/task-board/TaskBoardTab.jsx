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
import CalendarView from './calendar/CalendarView'
import PhoneView from './phone/PhoneView'
import MessagesView from './messages/MessagesView'
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

function BackToBoardButton() {
  const { actions } = useTaskBoard()
  return (
    <button
      onClick={() => actions.setView('board')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        marginBottom: '16px',
        borderRadius: '8px',
        border: '1px solid var(--theme-border)',
        background: 'var(--theme-bg)',
        color: 'var(--theme-text-secondary)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--theme-accent-muted)'; e.currentTarget.style.color = 'var(--theme-accent)'; e.currentTarget.style.borderColor = 'var(--theme-accent)' }}
      onMouseOut={(e) => { e.currentTarget.style.background = 'var(--theme-bg)'; e.currentTarget.style.color = 'var(--theme-text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
    >
      ← Back to Board
    </button>
  )
}

function ViewContent({ view, loading }) {
  const showBackButton = view !== 'board' && view !== TASK_BOARD_VIEWS.BOARD

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <LoadingSpinner />
      </div>
    )
  }

  const content = (() => {
    switch (view) {
      case TASK_BOARD_VIEWS.BOARD:
      case 'board':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <KanbanHeader />
            <KanbanBoard />
          </div>
        )
      case TASK_BOARD_VIEWS.CALENDAR:
      case 'calendar':
        return <CalendarView />
      case TASK_BOARD_VIEWS.PHONE:
      case 'phone':
        return <PhoneView />
      case TASK_BOARD_VIEWS.MESSAGES:
      case 'messages':
        return <MessagesView />
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
  })()

  return (
    <>
      {showBackButton && <BackToBoardButton />}
      {content}
    </>
  )
}
