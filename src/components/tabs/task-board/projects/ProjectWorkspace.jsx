import { useTaskBoard } from '../../../../context/TaskBoardContext'
import WorkspaceHeader from './WorkspaceHeader'
import WorkspaceTabs from './WorkspaceTabs'
import ProjectFiles from './ProjectFiles'
import ProjectNotes from './ProjectNotes'
import ProjectOverview from './ProjectOverview'
import ProjectInnerCanvas from './ProjectInnerCanvas'

export default function ProjectWorkspace() {
  const { state } = useTaskBoard()
  const project = state.selectedProject
  const activeTab = state.projectTab || 'canvas'

  if (!project) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
      <WorkspaceHeader project={project} />
      <WorkspaceTabs />
      <div style={{ flex: 1, overflow: 'auto', padding: activeTab === 'canvas' ? 0 : '24px' }}>
        {activeTab === 'canvas' && <ProjectInnerCanvas project={project} />}
        {activeTab === 'files' && <ProjectFiles project={project} />}
        {activeTab === 'notes' && <ProjectNotes project={project} />}
        {activeTab === 'overview' && <ProjectOverview project={project} />}
      </div>
    </div>
  )
}
