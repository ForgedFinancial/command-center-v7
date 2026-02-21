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

  const leftTabs = [TABS.ORG_CHART, TABS.WORKSPACES, TABS.OPS, TABS.CRM, TABS.PROJECTS]

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
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Left tabs */}
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {leftTabs.map(tabButton)}
      </div>
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      {/* Stand-Up — right side */}
      <div style={{ flexShrink: 0, borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', marginLeft: '4px' }}>
        {tabButton(TABS.STAND_UP)}
      </div>
    </nav>
  )
}
