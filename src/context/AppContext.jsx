import { createContext, useContext, useReducer, useCallback } from 'react'
import { TABS, DEFAULT_THEME } from '../config/constants'

// ========================================
// FEATURE: AppContext
// Added: 2026-02-14 by Claude Code
// Central state management for Forged-OS
// ========================================

const initialState = {
  // Navigation
  activeTab: (typeof localStorage !== 'undefined' && localStorage.getItem('cc7-active-tab')) || TABS.TASK_BOARD,
  theme: DEFAULT_THEME,

  // User role — default to owner (single-user system, DANO is the owner)
  userRole: 'owner',

  // Connection Status
  isConnected: false,
  lastSync: null,
  syncError: null,

  // Notifications
  toasts: [],

  // Task Manager Data
  sessions: {
    active: 0,
    idle: 0,
    total: 0,
    list: [],
  },
  tokens: {
    input: 0,
    output: 0,
    cache: 0,
  },
  costs: {
    session: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
  },
  cronJobs: [],
  activityLog: [],
  overnightLog: [],

  // Org Chart Data
  agents: {},
  selectedAgent: null,

  // Workspaces Data
  workspaceAgent: null,
  workspaceFiles: [],
  activeFile: null,
  fileContent: '',

  // Org Chart — Radial
  centeredAgent: 'ceo',

  // Pipeline State
  pipelineState: {
    stages: [],
    context: '',
    startTime: null,
    initiator: '',
    activeConnections: [],
  },

  // System Health
  systemHealth: {
    status: 'healthy',
    uptime: 0,
    lastHealthCheck: null,
    checks: {},
  },

  // Build Info
  buildInfo: null,

  // Stand-Up Room
  standUpMessages: [],
  standUpSession: { active: false, activatedBy: null, activatedAt: null },

  // Initial load
  isInitialLoad: true,
}

const ActionTypes = {
  SET_TAB: 'SET_TAB',
  SET_THEME: 'SET_THEME',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_LAST_SYNC: 'SET_LAST_SYNC',
  SET_SYNC_ERROR: 'SET_SYNC_ERROR',
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  UPDATE_SESSIONS: 'UPDATE_SESSIONS',
  UPDATE_TOKENS: 'UPDATE_TOKENS',
  UPDATE_COSTS: 'UPDATE_COSTS',
  UPDATE_CRON_JOBS: 'UPDATE_CRON_JOBS',
  UPDATE_ACTIVITY_LOG: 'UPDATE_ACTIVITY_LOG',
  UPDATE_OVERNIGHT_LOG: 'UPDATE_OVERNIGHT_LOG',
  UPDATE_AGENTS: 'UPDATE_AGENTS',
  SET_SELECTED_AGENT: 'SET_SELECTED_AGENT',
  SET_CENTERED_AGENT: 'SET_CENTERED_AGENT',
  SET_PIPELINE_STATE: 'SET_PIPELINE_STATE',
  SET_WORKSPACE_AGENT: 'SET_WORKSPACE_AGENT',
  SET_WORKSPACE_FILES: 'SET_WORKSPACE_FILES',
  SET_ACTIVE_FILE: 'SET_ACTIVE_FILE',
  SET_FILE_CONTENT: 'SET_FILE_CONTENT',
  SET_BUILD_INFO: 'SET_BUILD_INFO',
  UPDATE_SYSTEM_HEALTH: 'UPDATE_SYSTEM_HEALTH',
  SYNC_STATE: 'SYNC_STATE',
  UPDATE_STANDUP: 'UPDATE_STANDUP',
  UPDATE_STANDUP_SESSION: 'UPDATE_STANDUP_SESSION',
  SET_INITIAL_LOAD: 'SET_INITIAL_LOAD',
}

function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_TAB:
      try { localStorage.setItem('cc7-active-tab', action.payload) } catch {}
      return { ...state, activeTab: action.payload }

    case ActionTypes.SET_THEME:
      document.body.className = `theme-${action.payload}`
      return { ...state, theme: action.payload }

    case ActionTypes.SET_CONNECTED:
      return { ...state, isConnected: action.payload }

    case ActionTypes.SET_LAST_SYNC:
      return { ...state, lastSync: action.payload }

    case ActionTypes.SET_SYNC_ERROR:
      return { ...state, syncError: action.payload }

    case ActionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, { id: Date.now(), ...action.payload }],
      }

    case ActionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      }

    case ActionTypes.UPDATE_SESSIONS:
      return { ...state, sessions: action.payload }

    case ActionTypes.UPDATE_TOKENS:
      return { ...state, tokens: action.payload }

    case ActionTypes.UPDATE_COSTS:
      return { ...state, costs: action.payload }

    case ActionTypes.UPDATE_CRON_JOBS:
      return { ...state, cronJobs: action.payload }

    case ActionTypes.UPDATE_ACTIVITY_LOG:
      return { ...state, activityLog: action.payload }

    case ActionTypes.UPDATE_OVERNIGHT_LOG:
      return { ...state, overnightLog: action.payload }

    case ActionTypes.UPDATE_AGENTS:
      return { ...state, agents: action.payload }

    case ActionTypes.SET_SELECTED_AGENT:
      return { ...state, selectedAgent: action.payload }

    case ActionTypes.SET_CENTERED_AGENT:
      return { ...state, centeredAgent: action.payload }

    case ActionTypes.SET_PIPELINE_STATE:
      return { ...state, pipelineState: action.payload }

    case ActionTypes.SET_WORKSPACE_AGENT:
      return { ...state, workspaceAgent: action.payload }

    case ActionTypes.SET_WORKSPACE_FILES:
      return { ...state, workspaceFiles: action.payload }

    case ActionTypes.SET_ACTIVE_FILE:
      return { ...state, activeFile: action.payload }

    case ActionTypes.SET_FILE_CONTENT:
      return { ...state, fileContent: action.payload }

    case ActionTypes.SET_BUILD_INFO:
      return { ...state, buildInfo: action.payload }

    case ActionTypes.UPDATE_SYSTEM_HEALTH:
      return { ...state, systemHealth: action.payload }

    case ActionTypes.UPDATE_STANDUP:
      return { ...state, standUpMessages: action.payload }

    case ActionTypes.UPDATE_STANDUP_SESSION:
      return { ...state, standUpSession: action.payload }

    case ActionTypes.SET_INITIAL_LOAD:
      return { ...state, isInitialLoad: action.payload }

    case ActionTypes.SYNC_STATE:
      // Merge incoming state from API
      return {
        ...state,
        ...action.payload,
        systemHealth: action.payload.systemHealth || state.systemHealth,
        isConnected: true,
        lastSync: new Date(),
        syncError: null,
      }

    default:
      return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Action creators
  const actions = {
    setTab: useCallback((tab) => {
      dispatch({ type: ActionTypes.SET_TAB, payload: tab })
    }, []),

    setTheme: useCallback((theme) => {
      dispatch({ type: ActionTypes.SET_THEME, payload: theme })
    }, []),

    setConnected: useCallback((isConnected) => {
      dispatch({ type: ActionTypes.SET_CONNECTED, payload: isConnected })
    }, []),

    setLastSync: useCallback((timestamp) => {
      dispatch({ type: ActionTypes.SET_LAST_SYNC, payload: timestamp })
    }, []),

    setSyncError: useCallback((error) => {
      dispatch({ type: ActionTypes.SET_SYNC_ERROR, payload: error })
    }, []),

    addToast: useCallback((toast) => {
      dispatch({ type: ActionTypes.ADD_TOAST, payload: toast })
    }, []),

    removeToast: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_TOAST, payload: id })
    }, []),

    updateSessions: useCallback((sessions) => {
      dispatch({ type: ActionTypes.UPDATE_SESSIONS, payload: sessions })
    }, []),

    updateTokens: useCallback((tokens) => {
      dispatch({ type: ActionTypes.UPDATE_TOKENS, payload: tokens })
    }, []),

    updateCosts: useCallback((costs) => {
      dispatch({ type: ActionTypes.UPDATE_COSTS, payload: costs })
    }, []),

    updateCronJobs: useCallback((jobs) => {
      dispatch({ type: ActionTypes.UPDATE_CRON_JOBS, payload: jobs })
    }, []),

    updateActivityLog: useCallback((log) => {
      dispatch({ type: ActionTypes.UPDATE_ACTIVITY_LOG, payload: log })
    }, []),

    updateOvernightLog: useCallback((log) => {
      dispatch({ type: ActionTypes.UPDATE_OVERNIGHT_LOG, payload: log })
    }, []),

    updateAgents: useCallback((agents) => {
      dispatch({ type: ActionTypes.UPDATE_AGENTS, payload: agents })
    }, []),

    setSelectedAgent: useCallback((agentId) => {
      dispatch({ type: ActionTypes.SET_SELECTED_AGENT, payload: agentId })
    }, []),

    setCenteredAgent: useCallback((agentId) => {
      dispatch({ type: ActionTypes.SET_CENTERED_AGENT, payload: agentId })
    }, []),

    updatePipelineState: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_PIPELINE_STATE, payload: data })
    }, []),

    setWorkspaceAgent: useCallback((agentId) => {
      dispatch({ type: ActionTypes.SET_WORKSPACE_AGENT, payload: agentId })
    }, []),

    setWorkspaceFiles: useCallback((files) => {
      dispatch({ type: ActionTypes.SET_WORKSPACE_FILES, payload: files })
    }, []),

    setActiveFile: useCallback((filename) => {
      dispatch({ type: ActionTypes.SET_ACTIVE_FILE, payload: filename })
    }, []),

    setFileContent: useCallback((content) => {
      dispatch({ type: ActionTypes.SET_FILE_CONTENT, payload: content })
    }, []),

    setBuildInfo: useCallback((info) => {
      dispatch({ type: ActionTypes.SET_BUILD_INFO, payload: info })
    }, []),

    updateSystemHealth: useCallback((health) => {
      dispatch({ type: ActionTypes.UPDATE_SYSTEM_HEALTH, payload: health })
    }, []),

    syncState: useCallback((newState) => {
      dispatch({ type: ActionTypes.SYNC_STATE, payload: newState })
    }, []),

    updateStandUp: useCallback((messages) => {
      dispatch({ type: ActionTypes.UPDATE_STANDUP, payload: messages })
    }, []),

    updateStandUpSession: useCallback((session) => {
      dispatch({ type: ActionTypes.UPDATE_STANDUP_SESSION, payload: session })
    }, []),

    setInitialLoad: useCallback((val) => {
      dispatch({ type: ActionTypes.SET_INITIAL_LOAD, payload: val })
    }, []),
  }

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export { ActionTypes }
