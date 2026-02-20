import { useState } from 'react'
import { STAGES, STAGE_CONFIG } from './pipelineConstants'
import FilterBar from './FilterBar'
import StageColumn from './StageColumn'
import TaskDetailModal from './TaskDetailModal'
import NewTaskForm from './NewTaskForm'

export default function PipelineBoard({ tasks, loading, filters, onFiltersChange, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--theme-text-secondary)', fontSize: '13px' }}>
        Loading pipeline…
      </div>
    )
  }

  // Apply filters
  const filtered = tasks.filter(t => {
    if (filters.assignee !== 'all' && t.assignee !== filters.assignee) return false
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false
    if (filters.stage !== 'all' && t.stage !== filters.stage) return false
    if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const isEmpty = tasks.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
          Build Pipeline
        </h2>
        <button
          onClick={() => setShowNewForm(true)}
          style={{
            padding: '6px 14px', fontSize: '12px', fontWeight: 600,
            backgroundColor: 'var(--theme-accent)', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}
        >+ New Task</button>
      </div>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={onFiltersChange} />

      {isEmpty ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--theme-text-secondary)', fontSize: '14px', fontStyle: 'italic',
        }}>
          No active tasks. Create one to start tracking builds.
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`,
          gap: '10px', minHeight: 0, overflow: 'auto',
        }}>
          {STAGES.map(stage => (
            <StageColumn
              key={stage}
              stage={stage}
              config={STAGE_CONFIG[stage]}
              tasks={filtered.filter(t => t.stage === stage)}
              onSelectTask={(t) => setSelectedTask(t)}
              onMoveTask={(id, newStage) => onUpdateTask(id, { stage: newStage })}
            />
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(id, patch) => { onUpdateTask(id, patch); setSelectedTask(prev => prev ? { ...prev, ...patch } : null) }}
          onDelete={(id) => { onDeleteTask(id); setSelectedTask(null) }}
        />
      )}

      {showNewForm && (
        <NewTaskForm
          onClose={() => setShowNewForm(false)}
          onCreate={async (data) => { await onCreateTask(data); setShowNewForm(false) }}
        />
      )}
    </div>
  )
}
