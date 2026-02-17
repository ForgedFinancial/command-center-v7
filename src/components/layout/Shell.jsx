import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useApp } from '../../context/AppContext'
import { useTaskBoard } from '../../context/TaskBoardContext'
import { useCRM } from '../../context/CRMContext'
import { TABS } from '../../config/constants'
import { TASK_BOARD_VIEWS } from '../../config/taskboard'
import { CRM_VIEWS } from '../../config/crm'
import { useSyncServer } from '../../hooks/useSyncServer'
import Logo from '../shared/Logo'
import TabBar from './TabBar'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import ToastContainer from '../shared/ToastContainer'
import ConnectionBanner from '../shared/ConnectionBanner'
import OrgChart from '../tabs/OrgChart'
import Workspaces from '../tabs/Workspaces'
import TaskBoardTab from '../tabs/task-board/TaskBoardTab'
import CRMTab from '../tabs/crm/CRMTab'
import AgentDetailPanel from '../shared/AgentDetailPanel'
import ErrorBoundary from '../shared/ErrorBoundary'
import HealthPanel from '../shared/HealthPanel'

const NetworkMonitor = import.meta.env.DEV
  ? lazy(() => import('../shared/NetworkMonitor'))
  : () => null

// Sidebar configs
const TASK_BOARD_SIDEBAR = [
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'phone', icon: '📞', label: 'Phone' },
  { id: 'messages', icon: '💬', label: 'Messages' },
  { id: 'projects', icon: '📁', label: 'Projects' },
  { id: 'tasks', icon: '✅', label: 'Tasks' },
  { id: 'documents', icon: '📄', label: 'Documents' },
]

const CRM_SIDEBAR = [
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'phone', icon: '📞', label: 'Phone' },
  { id: 'messages', icon: '💬', label: 'Messages' },
  { id: 'projects', icon: '📁', label: 'Projects' },
  { id: 'tasks', icon: '✅', label: 'Tasks' },
  { id: 'documents', icon: '📄', label: 'Documents' },
]

// Map sidebar item clicks to view changes
const TB_SIDEBAR_VIEW_MAP = {
  calendar: TASK_BOARD_VIEWS.CALENDAR,
  phone: TASK_BOARD_VIEWS.PHONE,
  messages: TASK_BOARD_VIEWS.MESSAGES,
  projects: TASK_BOARD_VIEWS.PROJECTS,
  tasks: TASK_BOARD_VIEWS.TASKS,
  documents: TASK_BOARD_VIEWS.DOCUMENTS,
}

export default function Shell() {
  const { state, actions: appActions } = useApp()
  const tbContext = useTaskBoard()
  const crmContext = useCRM()
  const [healthOpen, setHealthOpen] = useState(false)
  const toggleHealth = useCallback(() => setHealthOpen(v => !v), [])
  const closeHealth = useCallback(() => setHealthOpen(false), [])

  useSyncServer()

  const hasSidebar = [TABS.TASK_BOARD, TABS.CRM].includes(state.activeTab)

  // Determine sidebar items with badges
  const sidebarItems = useMemo(() => {
    if (state.activeTab === TABS.TASK_BOARD) {
      return TASK_BOARD_SIDEBAR.map(item => ({
        ...item,
        badge: item.id === 'projects' ? tbContext.state.projects.length
             : item.id === 'tasks' ? tbContext.state.tasks.length
             : item.id === 'documents' ? tbContext.state.documents.length
             : undefined,
      }))
    }
    if (state.activeTab === TABS.CRM) {
      return CRM_SIDEBAR
    }
    return []
  }, [state.activeTab, tbContext.state.projects.length, tbContext.state.tasks.length, tbContext.state.documents.length])

  // Map active view to sidebar active item
  const activeSidebarItem = useMemo(() => {
    if (state.activeTab === TABS.TASK_BOARD) {
      const view = tbContext.state.activeView
      if (view === 'calendar') return 'calendar'
      if (view === 'phone') return 'phone'
      if (view === 'messages') return 'messages'
      if (view === 'projects') return 'projects'
      if (view === 'tasks') return 'tasks'
      if (view === 'documents') return 'documents'
      return null // board view = no sidebar highlight
    }
    if (state.activeTab === TABS.CRM) {
      return null // CRM sub-tabs are in content area, not sidebar
    }
    return null
  }, [state.activeTab, tbContext.state.activeView])

  const handleSidebarSelect = useCallback((id) => {
    if (state.activeTab === TABS.TASK_BOARD) {
      const view = TB_SIDEBAR_VIEW_MAP[id]
      if (view) {
        tbContext.actions.setView(view)
      }
    } else if (state.activeTab === TABS.CRM) {
      // CRM sidebar items share the same nav — switch to Task Board with appropriate view
      const view = TB_SIDEBAR_VIEW_MAP[id]
      if (view) {
        appActions.setTab(TABS.TASK_BOARD)
        tbContext.actions.setView(view)
      }
    }
  }, [state.activeTab, tbContext.actions, appActions])

  if (state.isInitialLoad) {
    return (
      <div style={{
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid var(--border-color, #1e293b)', borderTop: '3px solid var(--accent, #00d4ff)',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Connecting to server…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <>
      <ConnectionBanner />
      <ToastContainer />

      <div style={{
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)', overflow: 'hidden',
      }}>
        {/* Header — left-aligned tabs next to logo */}
        <header
          className="glass-panel"
          style={{
            display: 'flex', alignItems: 'center', padding: '0 24px', height: '52px',
            borderRadius: 0,
            boxShadow: '0 1px 0 var(--border-color), 0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Logo size={28} />
          <span style={{
            fontSize: '15px', fontWeight: 700, color: '#00d4ff',
            letterSpacing: '2px', marginLeft: '10px', marginRight: '32px',
          }}>
            CC v7
          </span>
          <TabBar />
          <div style={{ flex: 1 }} />
          {/* Connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: state.isConnected ? '#4ade80' : '#6b7280',
            }} />
            <span style={{ fontSize: '11px', color: '#71717a' }}>
              {state.isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Body: sidebar + content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {hasSidebar && (
            <Sidebar
              items={sidebarItems}
              activeItem={activeSidebarItem}
              onSelect={handleSidebarSelect}
            />
          )}
          <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            {/* CRM sub-tabs */}
            {state.activeTab === TABS.CRM && <CRMSubTabs />}
            <TabContent activeTab={state.activeTab} />
          </main>
        </div>

        <StatusBar onToggleHealth={toggleHealth} />
      </div>

      <HealthPanel isOpen={healthOpen} onClose={closeHealth} />
      <AgentDetailPanel />
      {import.meta.env.DEV && (
        <Suspense fallback={null}><NetworkMonitor /></Suspense>
      )}
    </>
  )
}

function CRMSubTabs() {
  const { state, actions } = useCRM()
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'follow-up', label: 'Follow-Ups' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
      {tabs.map(tab => {
        const isActive = state.activeView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => actions.setView(tab.id)}
            style={{
              padding: '8px 16px', fontSize: '12px', fontWeight: isActive ? 600 : 400,
              color: isActive ? '#00d4ff' : '#a1a1aa',
              background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
              borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { if (!isActive) e.currentTarget.style.color = '#e4e4e7' }}
            onMouseOut={(e) => { if (!isActive) e.currentTarget.style.color = '#a1a1aa' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function TabContent({ activeTab }) {
  switch (activeTab) {
    case TABS.TASK_BOARD:
      return <ErrorBoundary><TaskBoardTab /></ErrorBoundary>
    case TABS.ORG_CHART:
      return <ErrorBoundary><OrgChart /></ErrorBoundary>
    case TABS.WORKSPACES:
      return <ErrorBoundary><Workspaces /></ErrorBoundary>
    case TABS.CRM:
      return <ErrorBoundary><CRMTab /></ErrorBoundary>
    default:
      return null
  }
}
