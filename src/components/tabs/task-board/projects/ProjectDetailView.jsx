import { useTaskBoard } from '../../../../context/TaskBoardContext'
import ProjectDetailHeader from './ProjectDetailHeader'
import ProjectOverview from './ProjectOverview'
import ProjectTaskList from './ProjectTaskList'
import ProjectDocuments from './ProjectDocuments'
import ProjectNotes from './ProjectNotes'

const TABS = ['Overview', 'Tasks', 'Documents', 'Notes']

export default function ProjectDetailView() {
  const { state, actions } = useTaskBoard()
  const project = state.selectedProject
  const activeTab = state.projectTab || 'overview'

  if (!project) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ProjectDetailHeader project={project} />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--theme-border-subtle)',
        paddingBottom: '0',
      }}>
        {TABS.map(tab => {
          const tabId = tab.toLowerCase()
          const isActive = activeTab === tabId
          return (
            <button
              key={tab}
              onClick={() => actions.setProjectTab(tabId)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid #00d4ff' : '2px solid transparent',
                background: 'none',
                color: isActive ? 'var(--theme-accent)' : '#71717a',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'overview' && <ProjectOverview project={project} />}
        {activeTab === 'tasks' && <ProjectTaskList project={project} />}
        {activeTab === 'documents' && <ProjectDocuments project={project} />}
        {activeTab === 'notes' && <ProjectNotes project={project} />}
      </div>
    </div>
  )
}
