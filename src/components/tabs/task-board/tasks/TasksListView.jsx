import { useMemo, useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { STAGE_CONFIG, PRIORITY_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'
import EmptyState from '../../../shared/EmptyState'

export default function TasksListView() {
  const { state, actions } = useTaskBoard()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  const filteredTasks = useMemo(() => {
    let tasks = [...state.tasks]
    if (search) {
      const q = search.toLowerCase()
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q))
    }
    if (stageFilter) tasks = tasks.filter(t => t.stage === stageFilter)
    if (projectFilter) tasks = tasks.filter(t => t.projectId === projectFilter)
    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [state.tasks, search, stageFilter, projectFilter])

  const getProjectName = (projectId) => {
    const p = state.projects.find(p => p.id === projectId)
    return p ? p.name : '—'
  }

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--theme-border)',
    background: 'var(--theme-bg)',
    color: 'var(--theme-text-secondary)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>Tasks</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
            <option value="">All Projects</option>
            {state.projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={selectStyle}>
            <option value="">All Status</option>
            {Object.entries(STAGE_CONFIG).map(([key, conf]) => (
              <option key={key} value={key}>{conf.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--theme-border)',
              background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)',
              fontSize: '12px',
              outline: 'none',
              width: '180px',
            }}
          />
          <button
            onClick={() => actions.setCreateModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--theme-accent)',
              background: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon="✅"
          title="No Tasks"
          message={search || stageFilter || projectFilter ? 'No tasks match your filters.' : 'Create a task to get started.'}
          action={!search && !stageFilter && !projectFilter ? (
            <button
              onClick={() => actions.setCreateModalOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--theme-accent)',
                background: 'var(--theme-accent-muted)',
                color: 'var(--theme-accent)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + New Task
            </button>
          ) : undefined}
        />
      ) : (
        <div style={{
          borderRadius: '10px',
          border: '1px solid var(--theme-border-subtle)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--theme-border-subtle)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: 'var(--theme-text-secondary)',
            fontWeight: 600,
          }}>
            <span>Task</span>
            <span>Project</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Assignee</span>
            <span>Due</span>
          </div>

          {/* Rows */}
          {filteredTasks.map(task => {
            const stageConf = STAGE_CONFIG[task.stage] || {}
            const priorityConf = PRIORITY_CONFIG[task.priority] || {}
            const isCompleted = task.stage === 'completed'

            return (
              <div
                key={task.id}
                onClick={() => actions.setSelectedTask(task)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--theme-border-subtle)',
                  cursor: 'pointer',
                  opacity: isCompleted ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                  {task.projectId ? getProjectName(task.projectId) : '—'}
                </span>
                <span style={{ fontSize: '11px', color: stageConf.color || '#71717a' }}>
                  {stageConf.label || task.stage}
                </span>
                <span>
                  {task.priority ? (
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: priorityConf.color || '#71717a',
                      background: priorityConf.bg || 'rgba(113,113,122,0.15)',
                    }}>
                      {task.priority}
                    </span>
                  ) : '—'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {task.assignedAgent ? (
                    <>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: AGENT_COLORS[task.assignedAgent] || '#71717a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                        fontWeight: 700,
                        color: '#fff',
                      }}>
                        {task.assignedAgent[0].toUpperCase()}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', textTransform: 'capitalize' }}>
                        {task.assignedAgent}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Unassigned</span>
                  )}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
