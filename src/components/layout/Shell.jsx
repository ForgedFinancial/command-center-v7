import { useState, useCallback, lazy, Suspense } from 'react'
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
import ErrorBoundary from '../shared/ErrorBoundary'
import HealthPanel from '../shared/HealthPanel'
// Dev-only network monitor — tree-shaken from production
const NetworkMonitor = import.meta.env.DEV
  ? lazy(() => import('../shared/NetworkMonitor'))
  : () => null

// ========================================
// FEATURE: Shell
// Added: 2026-02-14 by Claude Code
// Full-viewport app shell
// ========================================

export default function Shell() {
  const { state } = useApp()
  const [healthOpen, setHealthOpen] = useState(false)
  const toggleHealth = useCallback(() => setHealthOpen(v => !v), [])
  const closeHealth = useCallback(() => setHealthOpen(false), [])

  // Start polling for state and health updates
  useSyncServer()

  if (state.isInitialLoad) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        gap: '16px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border-color, #1e293b)',
          borderTop: '3px solid var(--accent, #00d4ff)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          Connecting to server…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

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
            CC v7
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
      <StatusBar onToggleHealth={toggleHealth} />
    </div>

    {/* Health Panel */}
    <HealthPanel isOpen={healthOpen} onClose={closeHealth} />

    {/* Agent Detail Slide-in */}
    <AgentDetailPanel />

    {/* Dev-only Network Monitor */}
    {import.meta.env.DEV && (
      <Suspense fallback={null}>
        <NetworkMonitor />
      </Suspense>
    )}
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
        <ErrorBoundary>
          <div style={tabStyles}>
            <p>Task Manager - Coming in Part 3</p>
          </div>
        </ErrorBoundary>
      )
    case TABS.ORG_CHART:
      return <ErrorBoundary><OrgChart /></ErrorBoundary>
    case TABS.WORKSPACES:
      return <ErrorBoundary><Workspaces /></ErrorBoundary>
    default:
      return null
  }
}
