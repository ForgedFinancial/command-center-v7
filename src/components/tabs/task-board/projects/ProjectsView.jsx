import { useTaskBoard } from '../../../../context/TaskBoardContext'
import ProjectsHeader from './ProjectsHeader'
import ProjectsGrid from './ProjectsGrid'
import ProjectDetailView from './ProjectDetailView'

export default function ProjectsView() {
  const { state } = useTaskBoard()

  if (state.selectedProject) {
    return <ProjectDetailView />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ProjectsHeader />
      <ProjectsGrid />
    </div>
  )
}
