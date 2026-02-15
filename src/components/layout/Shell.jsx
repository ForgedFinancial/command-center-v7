import { useApp } from '../../context/AppContext'
import { TABS, TAB_LABELS } from '../../config/constants'
import { useSyncServer } from '../../hooks/useSyncServer'
import Logo from '../shared/Logo'
import TabBar from './TabBar'
import StatusBar from './StatusBar'
import ToastContainer from '../shared/ToastContainer'
import ConnectionBanner from '../shared/ConnectionBanner'
import OrgChart from '../tabs/OrgChart'
import AgentDetailPanel from '../shared/AgentDetailPanel'
import Workspaces from '../tabs/Workspaces'

// ========================================
// FEATURE: Shell
// Added: 2026-02-14 by Claude Code
// Full-viewport app shell
// ========================================

export default function Shell() {
  const { state } = useApp()

  // Start polling for state and health updates
  useSyncServer()

  return (
    <>
      {/* Fixed position overlays */}
      <ConnectionBanner />
      <ToastContainer />

      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          overflow: 'hidden',
        }}
      >
      {/* Header */}
      <header
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderRadius: 0,
          boxShadow: '0 1px 0 var(--border-color), 0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={32} />
          <h1
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            FORGED-OS
          </h1>
        </div>

        <TabBar />
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}
      >
        <TabContent activeTab={state.activeTab} />
      </main>

      {/* Status Bar */}
      <StatusBar />
    </div>

    {/* Agent Detail Slide-in */}
    <AgentDetailPanel />
    </>
  )
}

function TabContent({ activeTab }) {
  // Placeholder content for each tab
  // These will be replaced by actual components in later build phases
  const tabStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
    fontSize: '18px',
  }

  switch (activeTab) {
    case TABS.TASK_MANAGER:
      return (
        <div style={tabStyles}>
          <p>Task Manager - Coming in Part 3</p>
        </div>
      )
    case TABS.ORG_CHART:
      return <OrgChart />
    case TABS.WORKSPACES:
      return <Workspaces />
    default:
      return null
  }
}
