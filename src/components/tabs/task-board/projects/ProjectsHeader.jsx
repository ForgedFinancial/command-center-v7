import { useTaskBoard } from '../../../../context/TaskBoardContext'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'priority', label: 'Priority' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'build', label: 'Build' },
  { value: 'research', label: 'Research' },
  { value: 'ops', label: 'Ops' },
  { value: 'client', label: 'Client' },
  { value: 'other', label: 'Other' },
]

export default function ProjectsHeader({ search, onSearchChange, sort, onSortChange, categoryFilter, onCategoryChange }) {
  const { actions } = useTaskBoard()

  const controlStyle = {
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--theme-text-primary)',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
          Projects
        </h2>
        <button
          onClick={() => actions.setCreateProjectModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid var(--theme-accent)',
            background: 'var(--theme-accent-muted)',
            color: 'var(--theme-accent)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >+ New Project</button>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects..."
          style={{ ...controlStyle, flex: 1, maxWidth: '300px' }}
        />
        <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)} style={controlStyle}>
          {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} style={controlStyle}>
          {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  )
}
