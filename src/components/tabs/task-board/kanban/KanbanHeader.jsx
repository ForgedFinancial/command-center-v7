import { useTaskBoard } from '../../../../context/TaskBoardContext'
import SearchInput from '../../../shared/SearchInput'

export default function KanbanHeader() {
  const { state, actions } = useTaskBoard()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>Task Board</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SearchInput
          value={state.taskFilters.search}
          onChange={(v) => actions.setTaskFilters({ search: v })}
          placeholder="Search tasks..."
          width="200px"
        />
        <button
          onClick={() => actions.setCreateProjectModalOpen(true)}
          style={{
            padding: '7px 14px', fontSize: '12px', borderRadius: '8px',
            border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
            color: 'var(--theme-text-secondary)', cursor: 'pointer', fontWeight: 500,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--theme-surface-hover)'; e.currentTarget.style.color = 'var(--theme-text-primary)' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--theme-bg)'; e.currentTarget.style.color = 'var(--theme-text-secondary)' }}
        >
          + New Project
        </button>
        <button
          onClick={() => actions.setCreateModalOpen(true)}
          style={{
            padding: '7px 14px', fontSize: '12px', borderRadius: '8px',
            border: 'none', background: 'var(--theme-accent)', color: '#0f0f1a',
            cursor: 'pointer', fontWeight: 600,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#00b8e6' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--theme-accent)' }}
        >
          + New Task
        </button>
      </div>
    </div>
  )
}
