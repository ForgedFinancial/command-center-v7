import { useTaskBoard } from '../../../../context/TaskBoardContext'

const STATUS_COLORS = {
  active: '#00d4ff',
  planning: '#f59e0b',
  completed: '#4ade80',
  archived: '#71717a',
}

export default function ProjectDetailHeader({ project }) {
  const { actions } = useTaskBoard()

  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={() => {
          actions.setSelectedProject(null)
          actions.setProjectTab('overview')
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#71717a',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '0',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseOver={(e) => { e.currentTarget.style.color = '#00d4ff' }}
        onMouseOut={(e) => { e.currentTarget.style.color = '#71717a' }}
      >
        ← Projects
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>
            {project.name}
          </h2>
          {project.description && (
            <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>
              {project.description}
            </p>
          )}
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '6px',
          color: STATUS_COLORS[project.status] || '#71717a',
          background: `${STATUS_COLORS[project.status] || '#71717a'}15`,
          textTransform: 'capitalize',
        }}>
          {project.status}
        </span>
      </div>
    </div>
  )
}
