import { createContext, useContext, useEffect, useReducer } from 'react'
import { WORKER_PROXY_URL } from '../config/api'

const OpsBoardContext = createContext(null)

export const initialOpsBoardState = {
  tasks: [],
  filters: {
    stage: '',
    agent: '',
    classification: '',
    priority: '',
    search: '',
  },
  selectedTaskId: null,
  createModalOpen: false,
  loading: false,
  syncing: false,
  initialized: false,
  error: null,
  wsConnected: false,
  liveLogs: {},
  notifications: [],
  manifestCache: {},
}

function mergeTask(tasks, nextTask) {
  const idx = tasks.findIndex(task => task.id === nextTask.id)
  if (idx === -1) return [nextTask, ...tasks]
  const clone = [...tasks]
  clone[idx] = { ...clone[idx], ...nextTask }
  return clone
}

function buildNotification(payload, fallbackType = 'info') {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: payload?.level || payload?.type || fallbackType,
    message: payload?.message || payload?.reason || 'Ops update received',
    timestamp: payload?.timestamp || new Date().toISOString(),
  }
}

export function opsBoardReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_SYNCING':
      return { ...state, syncing: action.payload }

    case 'FETCH_TASKS_SUCCESS':
      return {
        ...state,
        tasks: action.payload || [],
        loading: false,
        initialized: true,
        error: null,
      }

    case 'FETCH_TASKS_ERROR':
      return {
        ...state,
        loading: false,
        initialized: true,
        error: action.payload || 'Failed to fetch tasks',
      }

    case 'UPSERT_TASK':
      return {
        ...state,
        tasks: mergeTask(state.tasks, action.payload),
      }

    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload || [],
      }

    case 'REMOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        selectedTaskId: state.selectedTaskId === action.payload ? null : state.selectedTaskId,
      }

    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      }

    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: initialOpsBoardState.filters,
      }

    case 'OPEN_TASK_DETAIL':
      return {
        ...state,
        selectedTaskId: action.payload,
      }

    case 'CLOSE_TASK_DETAIL':
      return {
        ...state,
        selectedTaskId: null,
      }

    case 'OPEN_CREATE_MODAL':
      return {
        ...state,
        createModalOpen: true,
      }

    case 'CLOSE_CREATE_MODAL':
      return {
        ...state,
        createModalOpen: false,
      }

    case 'SET_MANIFEST_CONTENT':
      return {
        ...state,
        manifestCache: {
          ...state.manifestCache,
          [action.payload.taskId]: action.payload.content,
        },
      }

    case 'WS_CONNECTED':
      return {
        ...state,
        wsConnected: true,
      }

    case 'WS_DISCONNECTED':
      return {
        ...state,
        wsConnected: false,
      }

    case 'RECEIVE_LIVE_LOG': {
      const taskId = action.payload?.taskId
      if (!taskId) return state
      const current = state.liveLogs[taskId] || []
      return {
        ...state,
        liveLogs: {
          ...state.liveLogs,
          [taskId]: [...current.slice(-199), action.payload],
        },
      }
    }

    case 'RECEIVE_TASK_UPDATE':
      return {
        ...state,
        tasks: mergeTask(state.tasks, action.payload),
      }

    case 'RECEIVE_NOTIFICATION':
      return {
        ...state,
        notifications: [buildNotification(action.payload), ...state.notifications].slice(0, 100),
      }

    default:
      return state
  }
}

function resolveOpsWsUrl() {
  const wsBase = WORKER_PROXY_URL.startsWith('https://')
    ? WORKER_PROXY_URL.replace('https://', 'wss://')
    : WORKER_PROXY_URL.replace('http://', 'ws://')
  return `${wsBase}/ops`
}

export function OpsBoardProvider({ children }) {
  const [state, dispatch] = useReducer(opsBoardReducer, initialOpsBoardState)

  useEffect(() => {
    let ws
    let reconnectTimer = null
    let reconnectDelay = 2000
    let isUnmounted = false

    const scheduleReconnect = () => {
      if (isUnmounted || reconnectTimer) return
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    }

    const connect = () => {
      if (isUnmounted) return

      try {
        ws = new WebSocket(resolveOpsWsUrl())
      } catch {
        dispatch({ type: 'WS_DISCONNECTED' })
        scheduleReconnect()
        return
      }

      ws.onopen = () => {
        reconnectDelay = 2000
        dispatch({ type: 'WS_CONNECTED' })
      }

      ws.onclose = () => {
        dispatch({ type: 'WS_DISCONNECTED' })
        scheduleReconnect()
      }

      ws.onerror = () => {
        dispatch({ type: 'WS_DISCONNECTED' })
        ws?.close()
      }

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'task.stage.changed' || data.type === 'task.updated' || data.type === 'task.created') {
            if (data.task) {
              dispatch({ type: 'RECEIVE_TASK_UPDATE', payload: data.task })
            }
            return
          }

          if (data.type === 'task.archived' && data.taskId) {
            dispatch({ type: 'REMOVE_TASK', payload: data.taskId })
            return
          }

          if (data.type === 'live.log') {
            dispatch({ type: 'RECEIVE_LIVE_LOG', payload: data })
            return
          }

          if (data.type === 'task.gate.failed') {
            dispatch({
              type: 'RECEIVE_NOTIFICATION',
              payload: {
                type: 'error',
                message: `Gate failed for ${data.taskId}: ${data.gate}${data.reason ? ` (${data.reason})` : ''}`,
                timestamp: data.timestamp,
              },
            })
            return
          }

          if (data.type === 'task.gate.passed') {
            dispatch({
              type: 'RECEIVE_NOTIFICATION',
              payload: {
                type: 'success',
                message: `Gate passed for ${data.taskId}: ${data.gate}`,
                timestamp: data.timestamp,
              },
            })
            return
          }

          if (data.type === 'notification') {
            dispatch({ type: 'RECEIVE_NOTIFICATION', payload: data })
          }
        } catch {
          // ignore malformed payload
        }
      }
    }

    connect()

    return () => {
      isUnmounted = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      ws?.close()
    }
  }, [])

  return (
    <OpsBoardContext.Provider value={{ state, dispatch }}>
      {children}
    </OpsBoardContext.Provider>
  )
}

export function useOpsBoard() {
  const context = useContext(OpsBoardContext)
  if (!context) throw new Error('useOpsBoard must be used within OpsBoardProvider')
  return context
}
