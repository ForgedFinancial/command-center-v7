import { useTaskBoard } from '../../../../context/TaskBoardContext'

const STATUS_COLORS = {
  active: { color: 'var(--theme-accent)', bg: 'var(--theme-accent-muted)' },
  planning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { color: 'var(--theme-success)', bg: 'rgba(74,222,128,0.1)' },
  archived: { color: 'var(--theme-text-secondary)', bg: 'rgba(113,113,122,0.1)' },
}

const PRIORITY_COLORS = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  low: { color: '#71717a', bg: 'rgba(113,113,122,0.15)' },
}

export default function ProjectCard({ project }) {
  const { state, actions } = useTaskBoard()

  const projectTasks = state.tasks.filter(t => t.projectId === project.id)
  const completedTasks = projectTasks.filter(t => t.stage === 'completed')
  const docCount = state.documents.filter(d => d.projectId === project.id).length
  const progress = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 0

  const statusStyle = STATUS_COLORS[project.status] || STATUS_COLORS.active
  const priorityStyle = PRIORITY_COLORS[project.priority] || {}
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed'

  return (
    <div
      onClick={() => actions.setSelectedProject(project)}
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border-subtle)',
        borderLeft: project.color ? `3px solid ${project.color}` : '1px solid var(--theme-border-subtle)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-accent)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        if (project.color) e.currentTarget.style.borderLeftColor = project.color
      }}
    >
      {/* Pinned indicator */}
      {project.pinned && (
        <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '12px' }}>📌</span>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', paddingRight: project.pinned ? '20px' : 0 }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
          {project.name}
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {project.priority && project.priority !== 'medium' && (
            <span style={{
              fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
              textTransform: 'uppercase',
              color: priorityStyle.color, background: priorityStyle.bg,
            }}>{project.priority}</span>
          )}
          <span style={{ fontSize: '11px', fontWeight: 600, color: statusStyle.color, textTransform: 'capitalize' }}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p style={{
          margin: '0 0 10px', fontSize: '12px', color: 'var(--theme-text-secondary)',
          lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{project.description}</p>
      )}

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {project.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              fontSize: '9px', padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-secondary)',
              fontWeight: 500,
            }}>{tag}</span>
          ))}
          {project.tags.length > 4 && (
            <span style={{ fontSize: '9px', color: 'var(--theme-text-secondary)' }}>+{project.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '12px' }}>
        <span>📋 {projectTasks.length} tasks</span>
        {docCount > 0 && <span>📎 {docCount} files</span>}
        {project.deadline && (
          <span style={{ color: isOverdue ? '#ef4444' : 'var(--theme-text-secondary)' }}>
            🗓 {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {isOverdue && ' (overdue)'}
          </span>
        )}
        {!project.deadline && project.createdAt && (
          <span>📅 {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: project.color || (project.status === 'completed' ? '#4ade80' : 'var(--theme-accent)'),
          borderRadius: '2px', transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}
