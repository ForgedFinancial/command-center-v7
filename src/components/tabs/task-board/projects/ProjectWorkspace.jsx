import { useTaskBoard } from '../../../../context/TaskBoardContext'
import WorkspaceHeader from './WorkspaceHeader'
import ProjectWorkspaceCanvas from './ProjectWorkspaceCanvas'

export default function ProjectWorkspace() {
  const { state } = useTaskBoard()
  const project = state.selectedProject

  if (!project) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <WorkspaceHeader project={project} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ProjectWorkspaceCanvas project={project} />
      </div>
    </div>
  )
}

