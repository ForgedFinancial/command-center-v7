import { useTaskBoard } from '../../../../context/TaskBoardContext'
import WorkspaceHeader from './WorkspaceHeader'
import ProjectInnerCanvas from './ProjectInnerCanvas'

export default function ProjectWorkspace() {
  const { state } = useTaskBoard()
  const project = state.selectedProject

  if (!project) return null

  return (
    <div className="project-folder-hero" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      background: '#07090F',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <WorkspaceHeader project={project} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ProjectInnerCanvas project={project} />
      </div>
    </div>
  )
}

