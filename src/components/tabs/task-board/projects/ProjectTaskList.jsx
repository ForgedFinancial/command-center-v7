import { useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import { STAGE_CONFIG, PRIORITY_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'
import taskboardClient from '../../../../api/taskboardClient'
import EmptyState from '../../../shared/EmptyState'

function AddTaskInline({ project, onDone }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await taskboardClient.createTask({ title: title.trim(), projectId: project.id })
      if (res.ok) {
        actions.addTask(res.data)
        appActions.addToast({ type: 'success', message: 'Task added to project' })
        setTitle('')
        onDone()
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <input
        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onDone() }}
        placeholder="Task title..." autoFocus
        style={{
          flex: 1, padding: '8px 12px', borderRadius: '8px',
          border: '1px solid var(--theme-accent)', background: 'rgba(255,255,255,0.04)',
          color: 'var(--theme-text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button onClick={handleSubmit} disabled={saving || !title.trim()}
        style={{
          padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
          background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)',
          fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: !title.trim() ? 0.5 : 1,
        }}>{saving ? '...' : 'Add'}</button>
      <button onClick={onDone} style={{
        padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
        background: 'transparent', color: 'var(--theme-text-secondary)',
        fontSize: '11px', cursor: 'pointer',
      }}>Cancel</button>
    </div>
  )
}

export default function ProjectTaskList({ project }) {
  const { state, actions } = useTaskBoard()
  const [showAdd, setShowAdd] = useState(false)
  const projectTasks = state.tasks
    .filter(t => t.projectId === project.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div>
      {/* Add Task button */}
      <div style={{ marginBottom: '12px' }}>
        {showAdd ? (
          <AddTaskInline project={project} onDone={() => setShowAdd(false)} />
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{
              padding: '7px 14px', borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)', background: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            }}>+ Add Task</button>
        )}
      </div>

      {projectTasks.length === 0 && !showAdd ? (
        <EmptyState icon="✅" title="No Tasks" message="No tasks are linked to this project yet." />
      ) : (
        <div>
      {projectTasks.map(task => {
        const stageConf = STAGE_CONFIG[task.stage] || {}
        const priorityConf = PRIORITY_CONFIG[task.priority] || {}
        const isCompleted = task.stage === 'completed'

        return (
          <div
            key={task.id}
            onClick={() => actions.setSelectedTask(task)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--theme-bg)',
              border: '1px solid rgba(255,255,255,0.04)',
              marginBottom: '6px',
              cursor: 'pointer',
              opacity: isCompleted ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: stageConf.color || '#71717a',
              marginRight: '12px',
              flexShrink: 0,
            }} />
            <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
              {task.title}
            </span>
            <span style={{
              fontSize: '10px',
              color: stageConf.color || '#71717a',
              marginRight: '16px',
              minWidth: '70px',
            }}>
              {stageConf.label || task.stage}
            </span>
            {task.priority && (
              <span style={{
                fontSize: '9px',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: priorityConf.color || '#71717a',
                background: priorityConf.bg || 'rgba(113,113,122,0.15)',
                marginRight: '16px',
              }}>
                {task.priority}
              </span>
            )}
            {task.assignedAgent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '16px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: AGENT_COLORS[task.assignedAgent] || '#71717a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {task.assignedAgent[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', textTransform: 'capitalize' }}>
                  {task.assignedAgent}
                </span>
              </div>
            )}
            {task.dueDate && (
              <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )
      })}
        </div>
      )}
    </div>
  )
}
