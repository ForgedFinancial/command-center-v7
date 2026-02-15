import { useApp } from '../../context/AppContext'
import { TABS, TAB_LABELS } from '../../config/constants'

// ========================================
// FEATURE: TabBar
// Added: 2026-02-14 by Claude Code
// Top navigation tabs
// ========================================

export default function TabBar() {
  const { state, actions } = useApp()

  const tabs = [TABS.TASK_MANAGER, TABS.ORG_CHART, TABS.WORKSPACES]

  return (
    <nav
      style={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => actions.setTab(tab)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: state.activeTab === tab ? '600' : '400',
            color:
              state.activeTab === tab
                ? 'var(--text-primary)'
                : 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom:
              state.activeTab === tab
                ? '2px solid var(--accent)'
                : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            if (state.activeTab !== tab) {
              e.target.style.color = 'var(--text-primary)'
            }
          }}
          onMouseOut={(e) => {
            if (state.activeTab !== tab) {
              e.target.style.color = 'var(--text-secondary)'
            }
          }}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  )
}
