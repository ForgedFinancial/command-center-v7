import { useMemo, useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'

const STATUS_CONFIG = {
  active: { label: 'Active', bg: 'rgba(34,197,94,0.18)', color: '#22C55E', className: 'status-active' },
  planning: { label: 'Planning', bg: 'rgba(234,179,8,0.18)', color: '#EAB308', className: 'status-planning' },
  on_hold: { label: 'On Hold', bg: 'rgba(249,115,22,0.18)', color: '#F97316', className: 'status-on-hold' },
  complete: { label: 'Complete', bg: 'rgba(0,212,255,0.18)', color: '#00D4FF', className: 'status-complete' },
  completed: { label: 'Complete', bg: 'rgba(0,212,255,0.18)', color: '#00D4FF', className: 'status-complete' },
}

export default function WorkspaceHeader({ project }) {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()

  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(project.name)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  const projectObjects = useMemo(() => state.canvasObjects.filter((obj) => obj.projectId === project.id || obj.data?.projectId === project.id), [project.id, state.canvasObjects])
  const totalTasks = projectObjects.filter((obj) => obj.type === 'task' || obj.type === 'taskcard' || obj.type === 'task-card').length
  const doneTasks = projectObjects.filter((obj) => (obj.type === 'task' || obj.type === 'taskcard' || obj.type === 'task-card') && obj.data?.status === 'done').length
  const progress = totalTasks === 0 ? (project.progress || 0) : Math.round((doneTasks / totalTasks) * 100)

  const statusKey = STATUS_CONFIG[project.status] ? project.status : (project.status === 'completed' ? 'complete' : 'active')
  const statusConfig = STATUS_CONFIG[statusKey]

  const saveProject = async (patch) => {
    try {
      const res = await taskboardClient.updateProject(project.id, patch)
      if (res?.ok) actions.updateProject({ id: project.id, ...patch })
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message || 'Failed to update project' })
    }
  }

  const saveName = () => {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setNameDraft(project.name)
      setEditing(false)
      return
    }
    if (trimmed !== project.name) saveProject({ name: trimmed })
    setEditing(false)
  }

  return (
    <div className={`workspace-header ${statusConfig.className}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(154,167,188,0.20)', background: 'rgba(7,9,15,0.88)', position: 'relative' }}>
      <span style={{ fontSize: 20 }}>{project.icon || project.emoji || '📁'}</span>

      {editing ? (
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName()
            if (e.key === 'Escape') {
              setNameDraft(project.name)
              setEditing(false)
            }
          }}
          autoFocus
          style={{ height: 34, borderRadius: 8, border: '1px solid rgba(0,212,255,0.62)', background: '#0E1320', color: '#E6EDF7', padding: '0 10px', fontSize: 16, fontWeight: 700 }}
        />
      ) : (
        <h2 onClick={() => { setEditing(true); setNameDraft(project.name) }} style={{ margin: 0, color: '#E6EDF7', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'text' }}>{project.name}</h2>
      )}

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setStatusMenuOpen((open) => !open)}
          style={{
            minHeight: 32,
            padding: '0 12px',
            borderRadius: 999,
            border: `1px solid ${statusConfig.color}`,
            background: statusConfig.bg,
            color: statusConfig.color,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {statusConfig.label}
          <span style={{ fontSize: 14 }}>▾</span>
        </button>

        {statusMenuOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 150, zIndex: 80, borderRadius: 10, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', padding: 6, display: 'grid', gap: 4 }}>
            {Object.entries(STATUS_CONFIG).filter(([key]) => ['active', 'planning', 'on_hold', 'complete'].includes(key)).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setStatusMenuOpen(false)
                  saveProject({ status: key === 'complete' ? 'completed' : key })
                }}
                style={{ height: 32, borderRadius: 8, border: '1px solid rgba(154,167,188,0.20)', background: config.bg, color: config.color, fontWeight: 700, cursor: 'pointer' }}
              >
                {config.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ minWidth: 240, marginLeft: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10, color: '#9AA7BC' }}>
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className={progress === 100 ? 'progress-track is-complete' : 'progress-track'} style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(154,167,188,0.16)' }}>
          <div
            className={progress === 100 ? 'progress-fill is-complete' : 'progress-fill'}
            style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'linear-gradient(90deg, #00D4FF, #D4A574)' : 'linear-gradient(90deg, #00D4FF, #48E2FF)', transition: 'width var(--motion-base)' }}
          />
        </div>
      </div>
    </div>
  )
}
