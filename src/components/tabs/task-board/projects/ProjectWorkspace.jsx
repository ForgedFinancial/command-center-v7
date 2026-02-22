import WorkspaceHeader from './WorkspaceHeader'
import ProjectInnerCanvas from './ProjectInnerCanvas'

export default function ProjectWorkspace({ project }) {
  if (!project) return null

  return (
    <div className="project-folder-hero" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <WorkspaceHeader project={project} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ProjectInnerCanvas project={project} />
      </div>
    </div>
  )
}
