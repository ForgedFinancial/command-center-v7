import { useTaskBoard } from '../../../../context/TaskBoardContext'

export default function ProjectsHeader() {
  const { actions } = useTaskBoard()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
    }}>
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>
        Projects
      </h2>
      <button
        onClick={() => actions.setCreateProjectModalOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(0,212,255,0.3)',
          background: 'rgba(0,212,255,0.1)',
          color: '#00d4ff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + New Project
      </button>
    </div>
  )
}
