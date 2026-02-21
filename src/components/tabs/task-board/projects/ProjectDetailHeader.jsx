import { useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'

const STATUS_COLORS = {
  active: 'var(--theme-accent)',
  planning: '#f59e0b',
  completed: '#4ade80',
  archived: '#71717a',
}

export default function ProjectDetailHeader({ project }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const save = async (updates) => {
    try {
      const res = await taskboardClient.updateProject(project.id, updates)
      if (res.ok) {
        actions.updateProject({ id: project.id, ...updates })
        appActions.addToast({ type: 'success', message: 'Project updated' })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed: ${err.message}` })
    }
  }

  const handleNameSave = () => {
    if (editName.trim() && editName !== project.name) {
      save({ name: editName.trim() })
    }
    setEditing(false)
  }

  const handleArchive = async () => {
    try {
      await taskboardClient.deleteProject(project.id)
      actions.updateProject({ id: project.id, status: 'archived' })
      actions.setSelectedProject(null)
      actions.setProjectTab('overview')
      appActions.addToast({ type: 'success', message: 'Project archived' })
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed: ${err.message}` })
    }
  }

  const btnStyle = {
    padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: 'var(--theme-text-secondary)', cursor: 'pointer',
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={() => { actions.setSelectedProject(null); actions.setProjectTab('overview') }}
        style={{
          background: 'none', border: 'none', color: 'var(--theme-text-secondary)',
          fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '8px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--theme-accent)' }}
        onMouseOut={(e) => { e.currentTarget.style.color = '#71717a' }}
      >← Projects</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditName(project.name); setEditing(false) } }}
              autoFocus
              style={{
                fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--theme-accent)',
                borderRadius: '6px', padding: '2px 8px', outline: 'none', fontFamily: 'inherit',
                width: '100%', boxSizing: 'border-box',
              }}
            />
          ) : (
            <h2
              onClick={() => { setEditName(project.name); setEditing(true) }}
              style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)', cursor: 'text' }}
              title="Click to edit"
            >{project.name}</h2>
          )}
          {project.description && (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-secondary)' }}>{project.description}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '16px', flexShrink: 0 }}>
          {/* Pin toggle */}
          <button onClick={() => save({ pinned: !project.pinned })} style={btnStyle} title={project.pinned ? 'Unpin' : 'Pin'}>
            {project.pinned ? '📌 Pinned' : '📌 Pin'}
          </button>

          {/* Status */}
          <select
            value={project.status}
            onChange={(e) => save({ status: e.target.value })}
            style={{
              ...btnStyle,
              color: STATUS_COLORS[project.status] || '#71717a',
              textTransform: 'capitalize',
            }}
          >
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="completed">Completed</option>
          </select>

          {/* Archive */}
          {showArchiveConfirm ? (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleArchive} style={{ ...btnStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Confirm</button>
              <button onClick={() => setShowArchiveConfirm(false)} style={btnStyle}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowArchiveConfirm(true)} style={{ ...btnStyle, color: '#ef4444' }}>Archive</button>
          )}
        </div>
      </div>
    </div>
  )
}
