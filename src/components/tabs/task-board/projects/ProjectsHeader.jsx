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
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
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
          border: '1px solid var(--theme-accent)',
          background: 'var(--theme-accent-muted)',
          color: 'var(--theme-accent)',
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
