import { useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'
import { PROJECT_TEMPLATES } from '../../../../config/projectTemplates'

const STATUS_COLORS = {
  active: 'var(--theme-accent)',
  planning: '#f59e0b',
  completed: '#4ade80',
  archived: '#71717a',
}

export default function WorkspaceHeader({ project }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)

  const save = async (updates) => {
    try {
      const res = await taskboardClient.updateProject(project.id, updates)
      if (res.ok) actions.updateProject({ id: project.id, ...updates })
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed: ${err.message}` })
    }
  }

  const handleNameSave = () => {
    if (editName.trim() && editName !== project.name) save({ name: editName.trim() })
    setEditing(false)
  }

  const handleClose = () => {
    actions.setSelectedProject(null)
    actions.setProjectTab('board')
  }

  const template = PROJECT_TEMPLATES[project.template]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(10,10,15,0.95)',
      flexShrink: 0,
    }}>
      {/* Back */}
      <button onClick={handleClose}
        style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--theme-accent)' }}
        onMouseOut={(e) => { e.currentTarget.style.color = '#71717a' }}>
        ← Hub
      </button>

      {/* Icon */}
      <span style={{ fontSize: '18px' }}>{project.icon || '📁'}</span>

      {/* Name */}
      {editing ? (
        <input value={editName} onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditName(project.name); setEditing(false) } }}
          autoFocus
          style={{
            fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)',
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--theme-accent)',
            borderRadius: '4px', padding: '2px 8px', outline: 'none', fontFamily: 'inherit',
          }} />
      ) : (
        <h2 onClick={() => { setEditName(project.name); setEditing(true) }}
          style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)', cursor: 'text' }}
          title="Click to edit">{project.name}</h2>
      )}

      {/* Template badge */}
      {template && template.id !== 'custom' && (
        <span style={{ fontSize: '10px', color: template.color, background: `${template.color}15`, padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
          {template.name}
        </span>
      )}

      {/* Status */}
      <select value={project.status} onChange={(e) => save({ status: e.target.value })}
        style={{
          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
          color: STATUS_COLORS[project.status] || '#71717a', cursor: 'pointer', outline: 'none',
          textTransform: 'capitalize',
        }}>
        <option value="active">Active</option>
        <option value="planning">Planning</option>
        <option value="completed">Completed</option>
      </select>

      <div style={{ flex: 1 }} />

      {/* Close */}
      <button onClick={handleClose}
        style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
          color: 'var(--theme-text-secondary)', fontSize: '14px', cursor: 'pointer',
          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
    </div>
  )
}
