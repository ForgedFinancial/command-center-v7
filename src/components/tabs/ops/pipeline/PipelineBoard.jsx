import { useState } from 'react'
import { STAGES, STAGE_CONFIG } from './pipelineConstants'
import FilterBar from './FilterBar'
import StageColumn from './StageColumn'
import TaskCard from './TaskCard'
import TaskDetailModal from './TaskDetailModal'
import NewTaskForm from './NewTaskForm'

export default function PipelineBoard({ tasks, loading, filters, onFiltersChange, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [boardMode, setBoardMode] = useState('active') // active | backlog

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--theme-text-secondary)', fontSize: '13px' }}>Loading pipeline…</div>
  }

  const backlogCount = tasks.filter(t => t.isBacklog).length

  const filtered = tasks.filter(t => {
    const scope = filters.scope || 'all'
    const modeBacklog = boardMode === 'backlog'
    if (modeBacklog && !t.isBacklog) return false
    if (!modeBacklog && t.isBacklog) return false
    if (scope === 'active' && t.isBacklog) return false
    if (scope === 'backlog' && !t.isBacklog) return false
    if (filters.assignee !== 'all' && t.assignee !== filters.assignee) return false
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false
    if (filters.stage !== 'all' && t.stage !== filters.stage) return false
    if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const isEmpty = filtered.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#E2E8F0' }}>Build Pipeline</h2>
          <div style={{ display: 'flex', border: '1px solid rgba(148,163,184,0.24)', borderRadius: 8, overflow: 'hidden', background: '#0E1320' }}>
            <button onClick={() => setBoardMode('active')} style={segBtn(boardMode === 'active')}>Active Pipeline</button>
            <button onClick={() => setBoardMode('backlog')} style={segBtn(boardMode === 'backlog')}>Backlog ({backlogCount})</button>
          </div>
        </div>
        <button onClick={() => setShowNewForm(true)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--theme-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ New Task</button>
      </div>

      <FilterBar filters={filters} onChange={onFiltersChange} />

      {isEmpty ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
          {boardMode === 'backlog' ? 'No tasks in backlog.' : 'No active tasks. Create one to start tracking builds.'}
        </div>
      ) : boardMode === 'backlog' ? (
        <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10, alignContent: 'start' }}>
          {filtered.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />)}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`, gap: '10px', minHeight: 0, overflow: 'auto', alignItems: 'stretch' }}>
          {STAGES.map(stage => (
            <StageColumn key={stage} stage={stage} config={STAGE_CONFIG[stage]} tasks={filtered.filter(t => t.stage === stage)} onSelectTask={(t) => setSelectedTask(t)} />
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(id, patch) => { onUpdateTask(id, patch); setSelectedTask(prev => (prev ? { ...prev, ...patch } : null)) }}
          onDelete={(id) => { onDeleteTask(id); setSelectedTask(null) }}
        />
      )}

      {showNewForm && (
        <NewTaskForm
          onClose={() => setShowNewForm(false)}
          onCreate={async (data) => {
            const created = await onCreateTask(data)
            setShowNewForm(false)
            return created
          }}
        />
      )}
    </div>
  )
}

function segBtn(active) {
  return {
    padding: '6px 10px',
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'rgba(0,212,255,0.14)' : 'transparent',
    color: active ? '#CFF6FF' : '#94A3B8',
    fontWeight: active ? 700 : 600,
  }
}
