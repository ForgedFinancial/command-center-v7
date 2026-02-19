import { useTaskBoard } from '../../../../context/TaskBoardContext'

const STATUS_COLORS = {
  active: { color: 'var(--theme-accent)', bg: 'var(--theme-accent-muted)' },
  planning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { color: 'var(--theme-success)', bg: 'rgba(74,222,128,0.1)' },
  archived: { color: 'var(--theme-text-secondary)', bg: 'rgba(113,113,122,0.1)' },
}

export default function ProjectCard({ project }) {
  const { state, actions } = useTaskBoard()

  const projectTasks = state.tasks.filter(t => t.projectId === project.id)
  const completedTasks = projectTasks.filter(t => t.stage === 'completed')
  const inProgressTasks = projectTasks.filter(t => t.stage === 'in_progress')
  const agents = [...new Set(projectTasks.map(t => t.assignedAgent).filter(Boolean))]
  const progress = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 0

  const statusStyle = STATUS_COLORS[project.status] || STATUS_COLORS.active

  return (
    <div
      onClick={() => actions.setSelectedProject(project)}
      style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border-subtle)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--theme-accent)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
          {project.name}
        </h3>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: statusStyle.color,
          textTransform: 'capitalize',
        }}>
          {project.status}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p style={{
          margin: '0 0 12px',
          fontSize: '12px',
          color: 'var(--theme-text-secondary)',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '12px' }}>
        <span>📋 {projectTasks.length} tasks</span>
        {agents.length > 0 && <span>👥 {agents.length} agents</span>}
        {project.createdAt && (
          <span>📅 {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        height: '3px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: project.status === 'completed' ? '#4ade80' : 'var(--theme-accent)',
          borderRadius: '2px',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}
