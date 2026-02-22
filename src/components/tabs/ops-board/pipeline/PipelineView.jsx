import { useMemo } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core'
import { OPS_STAGE_CONFIG, OPS_STAGE_ORDER, stageForDropTarget } from '../../../../config/opsBoard'
import PipelineColumn from './PipelineColumn'
import TaskCard from './TaskCard'

export default function PipelineView({ tasks = [], loading = false, onMoveTask, onOpenTask }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const tasksByStage = useMemo(() => {
    const map = {}
    OPS_STAGE_ORDER.forEach(stage => {
      map[stage] = tasks.filter(task => task.stage === stage)
    })
    return map
  }, [tasks])

  const activeTask = null

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--theme-text-secondary)', fontSize: '13px' }}>
        Loading Ops pipeline...
      </div>
    )
  }

  const handleDragEnd = async event => {
    const { active, over } = event
    if (!over) return

    const taskId = active.id
    const task = tasks.find(entry => entry.id === taskId)
    if (!task) return

    const targetStage = stageForDropTarget(over.id, tasks)
    if (!targetStage || targetStage === task.stage) return

    await onMoveTask?.(taskId, targetStage)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
          minHeight: '420px',
        }}
      >
        {OPS_STAGE_ORDER.map(stage => (
          <PipelineColumn
            key={stage}
            stage={stage}
            config={OPS_STAGE_CONFIG[stage]}
            tasks={tasksByStage[stage] || []}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  )
}

