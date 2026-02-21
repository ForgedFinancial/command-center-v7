import { useTaskBoard } from '../../../../context/TaskBoardContext'
import ProjectCanvas from './ProjectCanvas'
import ProjectWorkspace from './ProjectWorkspace'

export default function ProjectHub() {
  const { state } = useTaskBoard()

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <ProjectCanvas />
      {state.selectedProject && <ProjectWorkspace />}
    </div>
  )
}
