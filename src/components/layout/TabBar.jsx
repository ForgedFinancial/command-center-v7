import { useApp } from '../../context/AppContext'
import { TABS, TAB_LABELS } from '../../config/constants'

// ========================================
// FEATURE: TabBar
// Added: 2026-02-14 by Claude Code
// Updated: 2026-02-20 — Stand-Up tab (right-aligned)
// Top navigation tabs
// ========================================

export default function TabBar() {
  const { state, actions } = useApp()

  const leftTabs = [TABS.TASK_BOARD, TABS.ORG_CHART, TABS.WORKSPACES, TABS.CRM]

  const tabButton = (tab) => (
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
        backgroundColor: state.activeTab === tab
          ? 'rgba(255, 255, 255, 0.04)'
          : 'transparent',
        border: 'none',
        borderBottom:
          state.activeTab === tab
            ? '2px solid var(--accent)'
            : '2px solid transparent',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: state.activeTab === tab
          ? '0 1px 0 var(--accent)'
          : 'none',
      }}
      onMouseOver={(e) => {
        if (state.activeTab !== tab) {
          e.target.style.color = 'var(--text-primary)'
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
        }
      }}
      onMouseOut={(e) => {
        if (state.activeTab !== tab) {
          e.target.style.color = 'var(--text-secondary)'
          e.target.style.backgroundColor = 'transparent'
        }
      }}
    >
      {TAB_LABELS[tab]}
    </button>
  )

  return (
    <nav
      style={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        flex: 1,
      }}
    >
      {leftTabs.map(tabButton)}
      <div style={{ marginLeft: 'auto' }}>
        {tabButton(TABS.STAND_UP)}
      </div>
    </nav>
  )
}
