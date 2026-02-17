import { useCallback } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import { STAGE_ORDER } from '../../../../config/taskboard'
import taskboardClient from '../../../../api/taskboardClient'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import { useState } from 'react'

export default function KanbanBoard() {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Filter tasks by search
  const filteredTasks = state.tasks.filter(t => {
    if (state.taskFilters.search) {
      const s = state.taskFilters.search.toLowerCase()
      return t.title.toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s)
    }
    return true
  })

  const tasksByStage = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = filteredTasks.filter(t => t.stage === stage)
    return acc
  }, {})

  const handleDragStart = useCallback((event) => {
    const task = state.tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }, [state.tasks])

  const handleDragEnd = useCallback(async (event) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return

    // Determine target stage: drop on column (stage id) or on another task
    let targetStage = over.id
    if (!STAGE_ORDER.includes(targetStage)) {
      // Dropped on a task — find its stage
      const targetTask = state.tasks.find(t => t.id === over.id)
      if (targetTask) targetStage = targetTask.stage
      else return
    }

    if (task.stage === targetStage) return
    // Don't allow dragging suggestions
    if (task.stage === 'suggestions') return

    // Optimistic update
    actions.updateTask({ id: taskId, stage: targetStage })

    try {
      const res = await taskboardClient.moveTask(taskId, targetStage, 'boss')
      if (res.ok) {
        actions.updateTask(res.data)
      }
    } catch (err) {
      // Revert
      actions.updateTask({ id: taskId, stage: task.stage })
      appActions.addToast({ type: 'error', message: `Move failed: ${err.message}` })
    }
  }, [state.tasks, actions, appActions])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{
        display: 'flex',
        gap: '12px',
        flex: 1,
        overflowX: 'auto',
        paddingBottom: '8px',
      }}>
        {STAGE_ORDER.map((stage) => (
          <KanbanColumn key={stage} stage={stage} tasks={tasksByStage[stage] || []} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
