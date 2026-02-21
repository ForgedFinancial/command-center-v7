import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useApp } from '../../context/AppContext'
import { useTaskBoard } from '../../context/TaskBoardContext'
import { useCRM } from '../../context/CRMContext'
import { TABS } from '../../config/constants'
import { TASK_BOARD_VIEWS } from '../../config/taskboard'
import { CRM_VIEWS } from '../../config/crm'
import { useSyncServer } from '../../hooks/useSyncServer'
import { useAgentStatus } from '../../hooks/useAgentStatus'
import { useThemeContext } from '../../context/ThemeContext'
import Logo from '../shared/Logo'
import TabBar from './TabBar'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import ToastContainer from '../shared/ToastContainer'
import ConnectionBanner from '../shared/ConnectionBanner'
import OrgChart from '../tabs/OrgChart'
import Workspaces from '../tabs/Workspaces'
import TaskBoardTab from '../tabs/task-board/TaskBoardTab'
import ProjectsView from '../tabs/task-board/projects/ProjectsView'
import { useTaskBoardData } from '../../hooks/useTaskBoard'

// Standalone Projects tab — loads taskboard data without the full TaskBoardTab
function ProjectsTab() {
  useTaskBoardData()
  return <ProjectsView />
}
import CRMTab from '../tabs/crm/CRMTab'
import StandUpTab from '../tabs/stand-up/StandUpTab'
import OpsTab from '../tabs/ops/OpsTab'
import AgentDetailPanel from '../shared/AgentDetailPanel'
import ErrorBoundary from '../shared/ErrorBoundary'
import HealthPanel from '../shared/HealthPanel'
import NotificationCenter from '../shared/NotificationCenter'

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
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'pipeline', icon: '🔀', label: 'Pipeline' },
  { id: 'contacts', icon: '👥', label: 'Contacts' },
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'phone', icon: '📞', label: 'Phone' },
  { id: 'messages', icon: '💬', label: 'Messages' },
  { id: 'automations', icon: '⚡', label: 'Automations' },
  { id: 'intelligence', icon: '🧠', label: 'Intelligence' },
  { id: 'manager', icon: '👔', label: 'Manager' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
  { id: 'help', icon: '❓', label: 'Help' },
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

  const { theme } = useThemeContext()

  useSyncServer()
  useAgentStatus()

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
      return crmContext.state.activeView || 'dashboard'
    }
    return null
  }, [state.activeTab, tbContext.state.activeView, crmContext.state.activeView])

  const handleSidebarSelect = useCallback((id) => {
    if (state.activeTab === TABS.TASK_BOARD) {
      const view = TB_SIDEBAR_VIEW_MAP[id]
      if (view) {
        tbContext.actions.setView(view)
      }
    } else if (state.activeTab === TABS.CRM) {
      crmContext.actions.setView(id)
    }
  }, [state.activeTab, tbContext.actions, appActions, crmContext.actions])

  if (state.isInitialLoad) {
    return (
      <div style={{
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--theme-bg)', gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid var(--theme-border)', borderTop: '3px solid var(--theme-accent)',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--theme-text-secondary)', fontSize: '13px', margin: 0 }}>Connecting to server…</p>
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
        backgroundColor: 'var(--theme-bg)',
        overflow: 'hidden',
      }}>
        {/* Header — left-aligned tabs next to logo */}
        <header
          className="glass-panel"
          style={{
            display: 'flex', alignItems: 'center', padding: '0 24px', height: '52px',
            borderRadius: 0,
            boxShadow: '0 1px 0 var(--theme-border), 0 4px 12px var(--theme-shadow)',
          }}
        >
          <Logo size={28} />
          <span style={{
            fontSize: '15px', fontWeight: 700, color: 'var(--theme-accent)',
            letterSpacing: '2px', marginLeft: '10px', marginRight: '32px',
          }}>
            CC v7
          </span>
          <TabBar />
          {/* Notification Center */}
          <NotificationCenter />
          {/* Connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: state.isConnected ? 'var(--theme-success)' : 'var(--theme-text-secondary)',
            }} />
            <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
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
            {/* CRM navigation moved to sidebar */}
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
              color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              background: isActive ? 'var(--theme-accent-muted)' : 'transparent',
              border: isActive ? '1px solid var(--theme-accent)' : '1px solid transparent',
              borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--theme-text-primary)' }}
            onMouseOut={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--theme-text-secondary)' }}
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
    case TABS.OPS:
      return <ErrorBoundary><OpsTab /></ErrorBoundary>
    case TABS.PROJECTS:
      return <ErrorBoundary><ProjectsTab /></ErrorBoundary>
    case TABS.STAND_UP:
      return <ErrorBoundary><StandUpTab /></ErrorBoundary>
    default:
      return null
  }
}
