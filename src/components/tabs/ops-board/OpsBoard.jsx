import { useMemo } from 'react'
import OpsBoardHeader from './OpsBoardHeader'
import PipelineView from './pipeline/PipelineView'
import TaskDetailModal from './task-detail/TaskDetailModal'
import TaskCreateModal from './modals/TaskCreateModal'
import { useOpsBoardData } from '../../../hooks/useOpsBoard'

function applyClientFilters(tasks, filters) {
  return tasks.filter(task => {
    if (filters.stage && task.stage !== filters.stage) return false
    if (filters.agent && task.assignedAgent !== filters.agent) return false
    if (filters.classification && task.classification !== filters.classification) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      const hay = `${task.title || ''} ${task.description || ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

export default function OpsBoard() {
  const { state, dispatch, actions } = useOpsBoardData()

  const filteredTasks = useMemo(
    () => applyClientFilters(state.tasks, state.filters),
    [state.tasks, state.filters],
  )

  const selectedTask = state.tasks.find(task => task.id === state.selectedTaskId) || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <OpsBoardHeader
        tasks={state.tasks}
        filters={state.filters}
        onFiltersChange={patch => dispatch({ type: 'SET_FILTERS', payload: patch })}
        onOpenCreate={() => dispatch({ type: 'OPEN_CREATE_MODAL' })}
        syncing={state.syncing}
        wsConnected={state.wsConnected}
      />

      {state.error && (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.35)',
            backgroundColor: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            fontSize: '12px',
            padding: '10px 12px',
          }}
        >
          {state.error}
        </div>
      )}

      <PipelineView
        tasks={filteredTasks}
        loading={state.loading}
        onMoveTask={actions.moveTaskStage}
        onOpenTask={taskId => dispatch({ type: 'OPEN_TASK_DETAIL', payload: taskId })}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          manifestContent={state.manifestCache[selectedTask.id] || ''}
          liveLogLines={state.liveLogs[selectedTask.id] || []}
          onClose={() => dispatch({ type: 'CLOSE_TASK_DETAIL' })}
          onArchive={actions.archiveTask}
          actions={actions}
          syncing={state.syncing}
        />
      )}

      <TaskCreateModal
        open={state.createModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_CREATE_MODAL' })}
        onCreate={actions.createTask}
        syncing={state.syncing}
      />
    </div>
  )
}


