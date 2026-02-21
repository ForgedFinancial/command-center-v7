import { useCallback, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'
import ProjectColumn from './ProjectColumn'
import ProjectTaskCard from './ProjectTaskCard'
import ColumnEditor from './ColumnEditor'

export default function ProjectKanban({ project }) {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [activeTask, setActiveTask] = useState(null)
  const [showColorPicker, setShowColorPicker] = useState(null) // column id

  const columns = [...(project.columns || [])].sort((a, b) => a.order - b.order)
  const projectTasks = state.tasks.filter(t => t.projectId === project.id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Map tasks to columns
  const getColumnTasks = (columnId) => {
    return projectTasks
      .filter(t => t.projectColumn === columnId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  // Tasks with no column assignment → first column
  const firstColId = columns[0]?.id
  const unassigned = projectTasks.filter(t => !t.projectColumn || !columns.find(c => c.id === t.projectColumn))

  const handleDragStart = useCallback((event) => {
    const task = projectTasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }, [projectTasks])

  const handleDragEnd = useCallback(async (event) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id
    // over.id could be a column id or a task id
    let targetColumnId = over.id

    // Check if dropped on a task — find its column
    if (!columns.find(c => c.id === targetColumnId)) {
      const overTask = projectTasks.find(t => t.id === targetColumnId)
      if (overTask) {
        targetColumnId = overTask.projectColumn || firstColId
      } else {
        return
      }
    }

    const task = projectTasks.find(t => t.id === taskId)
    if (!task || task.projectColumn === targetColumnId) return

    // Optimistic update
    actions.updateTask({ id: taskId, projectColumn: targetColumnId })

    try {
      await taskboardClient.updateTask(taskId, { projectColumn: targetColumnId })
    } catch (err) {
      // Revert
      actions.updateTask({ id: taskId, projectColumn: task.projectColumn })
      appActions.addToast({ type: 'error', message: `Failed to move task` })
    }
  }, [columns, projectTasks, firstColId, actions, appActions])

  // Column editing
  const handleEditColumn = useCallback(async (columnId, update) => {
    if (update.delete) {
      const confirmed = window.confirm(`Delete column? Tasks will move to the first column.`)
      if (!confirmed) return
      const newColumns = columns.filter(c => c.id !== columnId).map((c, i) => ({ ...c, order: i }))
      actions.updateProject({ id: project.id, columns: newColumns })
      await taskboardClient.updateProject(project.id, { columns: newColumns })

      // Reassign tasks
      const orphanedTasks = projectTasks.filter(t => t.projectColumn === columnId)
      const fallbackCol = newColumns[0]?.id || null
      for (const task of orphanedTasks) {
        actions.updateTask({ id: task.id, projectColumn: fallbackCol })
        taskboardClient.updateTask(task.id, { projectColumn: fallbackCol }).catch(() => {})
      }
      return
    }

    if (update.moveDir) {
      const idx = columns.findIndex(c => c.id === columnId)
      const newIdx = idx + update.moveDir
      if (newIdx < 0 || newIdx >= columns.length) return
      const newColumns = [...columns]
      const temp = newColumns[idx]
      newColumns[idx] = newColumns[newIdx]
      newColumns[newIdx] = temp
      const reordered = newColumns.map((c, i) => ({ ...c, order: i }))
      actions.updateProject({ id: project.id, columns: reordered })
      await taskboardClient.updateProject(project.id, { columns: reordered })
      return
    }

    if (update.showColorPicker) {
      setShowColorPicker(columnId)
      return
    }

    if (update.color) {
      const newColumns = columns.map(c => c.id === columnId ? { ...c, color: update.color } : c)
      actions.updateProject({ id: project.id, columns: newColumns })
      await taskboardClient.updateProject(project.id, { columns: newColumns })
      setShowColorPicker(null)
      return
    }

    if (update.name) {
      const newColumns = columns.map(c => c.id === columnId ? { ...c, name: update.name } : c)
      actions.updateProject({ id: project.id, columns: newColumns })
      await taskboardClient.updateProject(project.id, { columns: newColumns })
      return
    }
  }, [columns, project.id, projectTasks, actions])

  const handleAddColumn = useCallback(async () => {
    const newCol = {
      id: `col_${Date.now().toString(36)}`,
      name: 'New Column',
      color: '#71717a',
      order: columns.length,
    }
    const newColumns = [...columns, newCol]
    actions.updateProject({ id: project.id, columns: newColumns })
    await taskboardClient.updateProject(project.id, { columns: newColumns })
  }, [columns, project.id, actions])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Color picker overlay */}
      {showColorPicker && (
        <ColumnEditor
          columnId={showColorPicker}
          onSelectColor={(color) => handleEditColumn(showColorPicker, { color })}
          onClose={() => setShowColorPicker(null)}
        />
      )}

      {/* Kanban board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{
          flex: 1, display: 'flex', gap: '12px',
          padding: '16px', overflowX: 'auto', overflowY: 'hidden',
          alignItems: 'flex-start',
        }}>
          {columns.map(col => (
            <ProjectColumn
              key={col.id}
              column={col}
              tasks={[
                ...getColumnTasks(col.id),
                ...(col.id === firstColId ? unassigned : []),
              ]}
              project={project}
              onEditColumn={handleEditColumn}
            />
          ))}

          {/* Add column */}
          <button onClick={handleAddColumn}
            style={{
              minWidth: '200px', padding: '40px 20px', borderRadius: '10px',
              border: '2px dashed rgba(255,255,255,0.08)', background: 'transparent',
              color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'var(--theme-text-primary)' }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--theme-text-secondary)' }}>
            + Add Column
          </button>
        </div>

        <DragOverlay>
          {activeTask && <ProjectTaskCard task={activeTask} isDragOverlay />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
