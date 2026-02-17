import { useTaskBoard } from '../../../../context/TaskBoardContext'
import SearchInput from '../../../shared/SearchInput'

export default function KanbanHeader() {
  const { state, actions } = useTaskBoard()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#e4e4e7' }}>Task Board</h2>
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
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
            color: '#a1a1aa', cursor: 'pointer', fontWeight: 500,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e4e4e7' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#a1a1aa' }}
        >
          + New Project
        </button>
        <button
          onClick={() => actions.setCreateModalOpen(true)}
          style={{
            padding: '7px 14px', fontSize: '12px', borderRadius: '8px',
            border: 'none', background: '#00d4ff', color: '#0f0f1a',
            cursor: 'pointer', fontWeight: 600,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#00b8e6' }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#00d4ff' }}
        >
          + New Task
        </button>
      </div>
    </div>
  )
}
