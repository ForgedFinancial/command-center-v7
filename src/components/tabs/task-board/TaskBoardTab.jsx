import { useTaskBoard } from '../../../context/TaskBoardContext'
import { TASK_BOARD_VIEWS } from '../../../config/taskboard'
import EmptyState from '../../shared/EmptyState'

export default function TaskBoardTab() {
  const { state } = useTaskBoard()

  switch (state.activeView) {
    case TASK_BOARD_VIEWS.BOARD:
      return (
        <EmptyState
          icon="📋"
          title="Task Board"
          message="Kanban board coming in Phase 2"
        />
      )
    case TASK_BOARD_VIEWS.PROJECTS:
      return (
        <EmptyState
          icon="📁"
          title="Projects"
          message="Projects view coming in Phase 3"
        />
      )
    case TASK_BOARD_VIEWS.TASKS:
      return (
        <EmptyState
          icon="✅"
          title="Tasks"
          message="Tasks list coming in Phase 3"
        />
      )
    case TASK_BOARD_VIEWS.DOCUMENTS:
      return (
        <EmptyState
          icon="📄"
          title="Documents"
          message="Documents view coming in Phase 3"
        />
      )
    default:
      return null
  }
}
