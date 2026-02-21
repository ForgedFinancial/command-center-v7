import { createContext, useContext, useReducer, useCallback } from 'react'
import { WORKER_PROXY_URL } from '../config/api'

// Fire-and-forget telegram notification
function notifyTelegram(event, taskTitle, details = {}) {
  try {
    const enabled = localStorage.getItem('telegramNotifications')
    if (enabled === 'false') return
    fetch(`${WORKER_PROXY_URL}/api/notifications/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, taskTitle, details }),
    }).catch(() => {}) // fail gracefully
  } catch { /* ignore */ }
}

// Fire-and-forget task notify webhook (Feature 3)
function notifyTaskWebhook(task) {
  try {
    const token = sessionStorage.getItem('cc_auth_token') || ''
    fetch(`${WORKER_PROXY_URL}/api/tasks/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        taskId: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        startTime: task.startTime || null,
        projectId: task.projectId || null,
      }),
    }).catch(() => {})
  } catch { /* ignore */ }
}

const initialState = {
  activeView: 'board',
  tasks: [],
  projects: [],
  documents: [],
  agentLessons: [],
  selectedTask: null,
  selectedProject: null,
  createModalOpen: false,
  createProjectModalOpen: false,
  projectTab: 'overview',
  taskFilters: { search: '', stages: [], priorities: [], projectIds: [], agents: [] },
  taskSort: { field: 'createdAt', dir: 'desc' },
  docToggle: 'reports',
  docCategory: 'all',
  loading: false,
  error: null,
  lastFetch: null,
  canvasObjects: [],
}

const ActionTypes = {
  SET_VIEW: 'TB_SET_VIEW',
  SET_TASKS: 'TB_SET_TASKS',
  SET_PROJECTS: 'TB_SET_PROJECTS',
  SET_DOCUMENTS: 'TB_SET_DOCUMENTS',
  SET_LESSONS: 'TB_SET_LESSONS',
  SET_SELECTED_TASK: 'TB_SET_SELECTED_TASK',
  SET_SELECTED_PROJECT: 'TB_SET_SELECTED_PROJECT',
  SET_CREATE_MODAL: 'TB_SET_CREATE_MODAL',
  SET_CREATE_PROJECT_MODAL: 'TB_SET_CREATE_PROJECT_MODAL',
  SET_PROJECT_TAB: 'TB_SET_PROJECT_TAB',
  SET_TASK_FILTERS: 'TB_SET_TASK_FILTERS',
  SET_TASK_SORT: 'TB_SET_TASK_SORT',
  SET_DOC_TOGGLE: 'TB_SET_DOC_TOGGLE',
  SET_DOC_CATEGORY: 'TB_SET_DOC_CATEGORY',
  SET_LOADING: 'TB_SET_LOADING',
  SET_ERROR: 'TB_SET_ERROR',
  UPDATE_TASK: 'TB_UPDATE_TASK',
  ADD_TASK: 'TB_ADD_TASK',
  REMOVE_TASK: 'TB_REMOVE_TASK',
  UPDATE_PROJECT: 'TB_UPDATE_PROJECT',
  ADD_PROJECT: 'TB_ADD_PROJECT',
  ADD_DOCUMENT: 'TB_ADD_DOCUMENT',
  UPDATE_DOCUMENT: 'TB_UPDATE_DOCUMENT',
  REMOVE_DOCUMENT: 'TB_REMOVE_DOCUMENT',
  SET_CANVAS_OBJECTS: 'TB_SET_CANVAS_OBJECTS',
  ADD_CANVAS_OBJECT: 'TB_ADD_CANVAS_OBJECT',
  UPDATE_CANVAS_OBJECT: 'TB_UPDATE_CANVAS_OBJECT',
  REMOVE_CANVAS_OBJECT: 'TB_REMOVE_CANVAS_OBJECT',
}

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_VIEW:
      return { ...state, activeView: action.payload, selectedProject: action.payload !== 'projects' ? null : state.selectedProject }
    case ActionTypes.SET_TASKS:
      return { ...state, tasks: action.payload, lastFetch: new Date() }
    case ActionTypes.SET_PROJECTS:
      return { ...state, projects: action.payload }
    case ActionTypes.SET_DOCUMENTS:
      return { ...state, documents: action.payload }
    case ActionTypes.SET_LESSONS:
      return { ...state, agentLessons: action.payload }
    case ActionTypes.SET_SELECTED_TASK:
      return { ...state, selectedTask: action.payload }
    case ActionTypes.SET_SELECTED_PROJECT:
      return { ...state, selectedProject: action.payload }
    case ActionTypes.SET_CREATE_MODAL:
      return { ...state, createModalOpen: action.payload }
    case ActionTypes.SET_CREATE_PROJECT_MODAL:
      return { ...state, createProjectModalOpen: action.payload }
    case ActionTypes.SET_PROJECT_TAB:
      return { ...state, projectTab: action.payload }
    case ActionTypes.SET_TASK_FILTERS:
      return { ...state, taskFilters: { ...state.taskFilters, ...action.payload } }
    case ActionTypes.SET_TASK_SORT:
      return { ...state, taskSort: action.payload }
    case ActionTypes.SET_DOC_TOGGLE:
      return { ...state, docToggle: action.payload }
    case ActionTypes.SET_DOC_CATEGORY:
      return { ...state, docCategory: action.payload }
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload }
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload }
    case ActionTypes.UPDATE_TASK:
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) }
    case ActionTypes.ADD_TASK:
      return { ...state, tasks: [action.payload, ...state.tasks] }
    case ActionTypes.REMOVE_TASK:
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) }
    case ActionTypes.UPDATE_PROJECT:
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case ActionTypes.ADD_PROJECT:
      return { ...state, projects: [action.payload, ...state.projects] }
    case ActionTypes.ADD_DOCUMENT:
      return { ...state, documents: [action.payload, ...state.documents] }
    case ActionTypes.UPDATE_DOCUMENT:
      return { ...state, documents: state.documents.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) }
    case ActionTypes.REMOVE_DOCUMENT:
      return { ...state, documents: state.documents.filter(d => d.id !== action.payload) }
    case ActionTypes.SET_CANVAS_OBJECTS:
      return { ...state, canvasObjects: action.payload }
    case ActionTypes.ADD_CANVAS_OBJECT:
      return { ...state, canvasObjects: [...state.canvasObjects, action.payload] }
    case ActionTypes.UPDATE_CANVAS_OBJECT:
      return { ...state, canvasObjects: state.canvasObjects.map(o => o.id === action.payload.id ? { ...o, ...action.payload } : o) }
    case ActionTypes.REMOVE_CANVAS_OBJECT:
      return { ...state, canvasObjects: state.canvasObjects.filter(o => o.id !== action.payload) }
    default:
      return state
  }
}

const TaskBoardContext = createContext(null)

export function TaskBoardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions = {
    setView: useCallback((view) => dispatch({ type: ActionTypes.SET_VIEW, payload: view }), []),
    setTasks: useCallback((tasks) => dispatch({ type: ActionTypes.SET_TASKS, payload: tasks }), []),
    setProjects: useCallback((projects) => dispatch({ type: ActionTypes.SET_PROJECTS, payload: projects }), []),
    setDocuments: useCallback((docs) => dispatch({ type: ActionTypes.SET_DOCUMENTS, payload: docs }), []),
    setLessons: useCallback((lessons) => dispatch({ type: ActionTypes.SET_LESSONS, payload: lessons }), []),
    setSelectedTask: useCallback((task) => dispatch({ type: ActionTypes.SET_SELECTED_TASK, payload: task }), []),
    setSelectedProject: useCallback((project) => dispatch({ type: ActionTypes.SET_SELECTED_PROJECT, payload: project }), []),
    setCreateModalOpen: useCallback((open) => dispatch({ type: ActionTypes.SET_CREATE_MODAL, payload: open }), []),
    setCreateProjectModalOpen: useCallback((open) => dispatch({ type: ActionTypes.SET_CREATE_PROJECT_MODAL, payload: open }), []),
    setProjectTab: useCallback((tab) => dispatch({ type: ActionTypes.SET_PROJECT_TAB, payload: tab }), []),
    setTaskFilters: useCallback((filters) => dispatch({ type: ActionTypes.SET_TASK_FILTERS, payload: filters }), []),
    setTaskSort: useCallback((sort) => dispatch({ type: ActionTypes.SET_TASK_SORT, payload: sort }), []),
    setDocToggle: useCallback((toggle) => dispatch({ type: ActionTypes.SET_DOC_TOGGLE, payload: toggle }), []),
    setDocCategory: useCallback((cat) => dispatch({ type: ActionTypes.SET_DOC_CATEGORY, payload: cat }), []),
    setLoading: useCallback((loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }), []),
    setError: useCallback((error) => dispatch({ type: ActionTypes.SET_ERROR, payload: error }), []),
    updateTask: useCallback((task) => {
      dispatch({ type: ActionTypes.UPDATE_TASK, payload: task })
      notifyTelegram('task_updated', task.title || task.id, { stage: task.stage, priority: task.priority })
      // Feature 3: webhook when task moves to new-task
      if (task.stage === 'new_task') {
        notifyTaskWebhook(task)
      }
    }, []),
    addTask: useCallback((task) => {
      dispatch({ type: ActionTypes.ADD_TASK, payload: task })
      notifyTelegram('task_created', task.title || 'New Task', { stage: task.stage, priority: task.priority })
      // Feature 3: webhook when task enters new-task
      if (task.stage === 'new_task' || !task.stage) {
        notifyTaskWebhook(task)
      }
    }, []),
    removeTask: useCallback((id) => {
      dispatch({ type: ActionTypes.REMOVE_TASK, payload: id })
      notifyTelegram('task_removed', id, {})
    }, []),
    updateProject: useCallback((project) => dispatch({ type: ActionTypes.UPDATE_PROJECT, payload: project }), []),
    addProject: useCallback((project) => dispatch({ type: ActionTypes.ADD_PROJECT, payload: project }), []),
    addDocument: useCallback((doc) => dispatch({ type: ActionTypes.ADD_DOCUMENT, payload: doc }), []),
    updateDocument: useCallback((doc) => dispatch({ type: ActionTypes.UPDATE_DOCUMENT, payload: doc }), []),
    removeDocument: useCallback((id) => dispatch({ type: ActionTypes.REMOVE_DOCUMENT, payload: id }), []),
    setCanvasObjects: useCallback((objs) => dispatch({ type: ActionTypes.SET_CANVAS_OBJECTS, payload: objs }), []),
    addCanvasObject: useCallback((obj) => dispatch({ type: ActionTypes.ADD_CANVAS_OBJECT, payload: obj }), []),
    updateCanvasObject: useCallback((obj) => dispatch({ type: ActionTypes.UPDATE_CANVAS_OBJECT, payload: obj }), []),
    removeCanvasObject: useCallback((id) => dispatch({ type: ActionTypes.REMOVE_CANVAS_OBJECT, payload: id }), []),
  }

  return (
    <TaskBoardContext.Provider value={{ state, actions }}>
      {children}
    </TaskBoardContext.Provider>
  )
}

export function useTaskBoard() {
  const context = useContext(TaskBoardContext)
  if (!context) throw new Error('useTaskBoard must be used within TaskBoardProvider')
  return context
}
