import { useTaskBoard } from '../../../../context/TaskBoardContext'
import ProjectCard from './ProjectCard'
import EmptyState from '../../../shared/EmptyState'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export default function ProjectsGrid({ search, sort, categoryFilter }) {
  const { state, actions } = useTaskBoard()

  let projects = state.projects.filter(p => p.status !== 'archived')

  // Search
  if (search) {
    const q = search.toLowerCase()
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }

  // Category filter
  if (categoryFilter) {
    projects = projects.filter(p => p.category === categoryFilter)
  }

  // Sort
  const pinned = projects.filter(p => p.pinned)
  const unpinned = projects.filter(p => !p.pinned)

  const sortFn = (a, b) => {
    switch (sort) {
      case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt)
      case 'name': return (a.name || '').localeCompare(b.name || '')
      case 'priority': return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
      case 'newest':
      default: return new Date(b.createdAt) - new Date(a.createdAt)
    }
  }

  pinned.sort(sortFn)
  unpinned.sort(sortFn)
  projects = [...pinned, ...unpinned]

  if (projects.length === 0) {
    return (
      <EmptyState
        icon="📁"
        title={search || categoryFilter ? 'No Matching Projects' : 'No Projects Yet'}
        message={search || categoryFilter ? 'Try adjusting your filters.' : 'Create a project to organize related tasks and documents.'}
        action={!search && !categoryFilter ? (
          <button
            onClick={() => actions.setCreateProjectModalOpen(true)}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid var(--theme-accent)',
              background: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >+ New Project</button>
        ) : null}
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
