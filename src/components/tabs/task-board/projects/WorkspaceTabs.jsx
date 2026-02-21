import { useTaskBoard } from '../../../../context/TaskBoardContext'

const TABS = [
  { id: 'board', label: 'Board' },
  { id: 'files', label: 'Files' },
  { id: 'notes', label: 'Notes' },
  { id: 'overview', label: 'Overview' },
]

export default function WorkspaceTabs() {
  const { state, actions } = useTaskBoard()
  const activeTab = state.projectTab || 'board'

  return (
    <div style={{
      display: 'flex', gap: '4px',
      padding: '0 24px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(10,10,15,0.95)',
      flexShrink: 0,
    }}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => actions.setProjectTab(tab.id)}
            style={{
              padding: '10px 16px', border: 'none',
              borderBottom: isActive ? '2px solid var(--theme-accent)' : '2px solid transparent',
              background: 'none',
              color: isActive ? 'var(--theme-accent)' : '#71717a',
              fontSize: '12px', fontWeight: isActive ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        )
      })}
    </div>
  )
}
