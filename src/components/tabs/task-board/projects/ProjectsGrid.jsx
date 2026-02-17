import { useTaskBoard } from '../../../../context/TaskBoardContext'
import ProjectCard from './ProjectCard'
import EmptyState from '../../../shared/EmptyState'

export default function ProjectsGrid() {
  const { state, actions } = useTaskBoard()
  const projects = state.projects.filter(p => p.status !== 'archived')

  if (projects.length === 0) {
    return (
      <EmptyState
        icon="📁"
        title="No Projects Yet"
        message="Create a project to organize related tasks and documents."
        action={
          <button
            onClick={() => actions.setCreateProjectModalOpen(true)}
            style={{
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
        }
      />
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '16px',
    }}>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
