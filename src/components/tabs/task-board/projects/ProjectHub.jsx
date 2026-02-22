import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { ProjectCanvasProvider } from '../../../../context/ProjectCanvasContext'
import ProjectCanvas from './ProjectCanvas'
import ProjectWorkspace from './ProjectWorkspace'

export default function ProjectHub() {
  const { state } = useTaskBoard()

  return (
    <ProjectCanvasProvider>
      <div style={{ position: 'relative', height: '100%', width: '100%', background: '#07090F', '--projects-bg': '#07090F', '--projects-surface': '#0E1320', '--projects-accent': '#00D4FF' }}>
        <ProjectCanvas />
        {state.selectedProject && <ProjectWorkspace />}
      </div>
    </ProjectCanvasProvider>
  )
}
