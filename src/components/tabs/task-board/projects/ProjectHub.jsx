import { useMemo } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { ProjectCanvasProvider, useProjectCanvas } from '../../../../context/ProjectCanvasContext'
import ProjectCanvas from './ProjectCanvas'
import Board from './Board'

function ProjectHubLayout() {
  const { state, actions } = useTaskBoard()
  const { setSelectedObjectIds, setActiveTool, setIsPlacementMode, setGhostPosition } = useProjectCanvas()

  const activeProject = useMemo(() => (
    state.projects.find((project) => project.id === state.selectedProject?.id) || state.selectedProject
  ), [state.projects, state.selectedProject])

  const handleBackToHub = () => {
    actions.setSelectedProject(null)
    actions.setProjectTab('canvas')
    setSelectedObjectIds([])
    setActiveTool('select')
    setIsPlacementMode(false)
    setGhostPosition(null)
  }

  return (
    <div className="project-workspace-root" style={{ position: 'relative', height: '100%', width: '100%', background: '#07090F', '--projects-bg': '#07090F', '--projects-surface': '#0E1320', '--projects-accent': '#00D4FF' }}>
      <div className={activeProject ? 'project-hub-shell is-backgrounded' : 'project-hub-shell'}>
        <ProjectCanvas />
      </div>

      {activeProject && (
        <section className="project-inner-shell" aria-label="Project inner canvas">
          <header className="workspace-breadcrumb-bar">
            <button className="hub-back-btn" onClick={handleBackToHub}>◀ Project Hub</button>
            <span className="crumb-sep">›</span>
            <strong className="project-crumb-name">{activeProject.name}</strong>
          </header>
          <Board projectId={activeProject?.id} />
        </section>
      )}
    </div>
  )
}

export default function ProjectHub() {
  return (
    <ProjectCanvasProvider>
      <ProjectHubLayout />
    </ProjectCanvasProvider>
  )
}
