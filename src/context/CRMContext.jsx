import { createContext, useContext, useReducer, useCallback } from 'react'

const initialState = {
  // Auth
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('forgedos_crm_token') : null,
  user: null,
  authLoading: true,
  // Data
  leads: [],
  customFields: [],
  activity: [],
  // Calendar
  calendar: { events: [], view: 'month', currentDate: new Date().toISOString(), providers: [], settings: {} },
  // UI
  activeView: (typeof localStorage !== 'undefined' && localStorage.getItem('cc7-crm-view')) || 'dashboard',
  pipelineMode: 'new',
  filters: {
    search: '', stages: [], leadTypes: [], tags: [],
    valueMin: null, valueMax: null,
    createdAfter: null, createdBefore: null, overdueOnly: false,
  },
  savedFilters: [],
  sortBy: 'createdAt',
  sortDir: 'desc',
  currentPage: 1,
  pageSize: 20,
  selectedLeads: [],
  dashboardRange: 'all',
  // Settings
  settings: {
    agentName: '', workPhone: '', personalPhone: '',
    defaultStage: 'new_lead', defaultLeadType: '', defaultTags: [],
    overdueDays: 7,
    cardPreviewFields: ['state', 'createdAt', 'carrier', 'premium'],
    bookingLink: { enabled: false, slug: '', availableHours: { start: '09:00', end: '17:00' }, bufferMinutes: 15, maxPerDay: 8 },
  },
  // Sync
  syncStatus: 'idle',
  lastSync: null,
}

const ActionTypes = {
  SET_TOKEN: 'CRM_SET_TOKEN',
  SET_USER: 'CRM_SET_USER',
  SET_AUTH_LOADING: 'CRM_SET_AUTH_LOADING',
  SET_LEADS: 'CRM_SET_LEADS',
  SET_CUSTOM_FIELDS: 'CRM_SET_CUSTOM_FIELDS',
  SET_ACTIVITY: 'CRM_SET_ACTIVITY',
  SET_CALENDAR: 'CRM_SET_CALENDAR',
  SET_VIEW: 'CRM_SET_VIEW',
  SET_PIPELINE_MODE: 'CRM_SET_PIPELINE_MODE',
  SET_FILTERS: 'CRM_SET_FILTERS',
  SET_SAVED_FILTERS: 'CRM_SET_SAVED_FILTERS',
  SET_SORT: 'CRM_SET_SORT',
  SET_PAGE: 'CRM_SET_PAGE',
  SET_SELECTED_LEADS: 'CRM_SET_SELECTED_LEADS',
  SET_DASHBOARD_RANGE: 'CRM_SET_DASHBOARD_RANGE',
  SET_SETTINGS: 'CRM_SET_SETTINGS',
  SET_SYNC_STATUS: 'CRM_SET_SYNC_STATUS',
  UPDATE_LEAD: 'CRM_UPDATE_LEAD',
  ADD_LEAD: 'CRM_ADD_LEAD',
  REMOVE_LEAD: 'CRM_REMOVE_LEAD',
  REMOVE_LEADS: 'CRM_REMOVE_LEADS',
  LOGOUT: 'CRM_LOGOUT',
}

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_TOKEN:
      if (action.payload) localStorage.setItem('forgedos_crm_token', action.payload)
      else localStorage.removeItem('forgedos_crm_token')
      return { ...state, token: action.payload }
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload }
    case ActionTypes.SET_AUTH_LOADING:
      return { ...state, authLoading: action.payload }
    case ActionTypes.SET_LEADS:
      return { ...state, leads: action.payload }
    case ActionTypes.SET_CUSTOM_FIELDS:
      return { ...state, customFields: action.payload }
    case ActionTypes.SET_ACTIVITY:
      return { ...state, activity: action.payload }
    case ActionTypes.SET_CALENDAR:
      return { ...state, calendar: { ...state.calendar, ...action.payload } }
    case ActionTypes.SET_VIEW:
      try { localStorage.setItem('cc7-crm-view', action.payload) } catch {}
      return { ...state, activeView: action.payload }
    case ActionTypes.SET_PIPELINE_MODE:
      return { ...state, pipelineMode: action.payload }
    case ActionTypes.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload }, currentPage: 1 }
    case ActionTypes.SET_SAVED_FILTERS:
      return { ...state, savedFilters: action.payload }
    case ActionTypes.SET_SORT:
      return { ...state, sortBy: action.payload.sortBy, sortDir: action.payload.sortDir }
    case ActionTypes.SET_PAGE:
      return { ...state, currentPage: action.payload }
    case ActionTypes.SET_SELECTED_LEADS:
      return { ...state, selectedLeads: action.payload }
    case ActionTypes.SET_DASHBOARD_RANGE:
      return { ...state, dashboardRange: action.payload }
    case ActionTypes.SET_SETTINGS:
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case ActionTypes.SET_SYNC_STATUS:
      return { ...state, syncStatus: action.payload.status, lastSync: action.payload.lastSync || state.lastSync }
    case ActionTypes.UPDATE_LEAD:
      return { ...state, leads: state.leads.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) }
    case ActionTypes.ADD_LEAD:
      return { ...state, leads: [action.payload, ...state.leads] }
    case ActionTypes.REMOVE_LEAD:
      return { ...state, leads: state.leads.filter(l => l.id !== action.payload) }
    case ActionTypes.REMOVE_LEADS:
      return { ...state, leads: state.leads.filter(l => !action.payload.includes(l.id)), selectedLeads: [] }
    case ActionTypes.LOGOUT:
      localStorage.removeItem('forgedos_crm_token')
      return { ...initialState, token: null, authLoading: false }
    default:
      return state
  }
}

const CRMContext = createContext(null)

export function CRMProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions = {
    setToken: useCallback((token) => dispatch({ type: ActionTypes.SET_TOKEN, payload: token }), []),
    setUser: useCallback((user) => dispatch({ type: ActionTypes.SET_USER, payload: user }), []),
    setAuthLoading: useCallback((v) => dispatch({ type: ActionTypes.SET_AUTH_LOADING, payload: v }), []),
    setLeads: useCallback((leads) => dispatch({ type: ActionTypes.SET_LEADS, payload: leads }), []),
    setCustomFields: useCallback((fields) => dispatch({ type: ActionTypes.SET_CUSTOM_FIELDS, payload: fields }), []),
    setActivity: useCallback((activity) => dispatch({ type: ActionTypes.SET_ACTIVITY, payload: activity }), []),
    setCalendar: useCallback((cal) => dispatch({ type: ActionTypes.SET_CALENDAR, payload: cal }), []),
    setView: useCallback((view) => dispatch({ type: ActionTypes.SET_VIEW, payload: view }), []),
    setPipelineMode: useCallback((mode) => dispatch({ type: ActionTypes.SET_PIPELINE_MODE, payload: mode }), []),
    setFilters: useCallback((filters) => dispatch({ type: ActionTypes.SET_FILTERS, payload: filters }), []),
    setSavedFilters: useCallback((filters) => dispatch({ type: ActionTypes.SET_SAVED_FILTERS, payload: filters }), []),
    setSort: useCallback((sortBy, sortDir) => dispatch({ type: ActionTypes.SET_SORT, payload: { sortBy, sortDir } }), []),
    setPage: useCallback((page) => dispatch({ type: ActionTypes.SET_PAGE, payload: page }), []),
    setSelectedLeads: useCallback((ids) => dispatch({ type: ActionTypes.SET_SELECTED_LEADS, payload: ids }), []),
    setDashboardRange: useCallback((range) => dispatch({ type: ActionTypes.SET_DASHBOARD_RANGE, payload: range }), []),
    setSettings: useCallback((settings) => dispatch({ type: ActionTypes.SET_SETTINGS, payload: settings }), []),
    setSyncStatus: useCallback((status, lastSync) => dispatch({ type: ActionTypes.SET_SYNC_STATUS, payload: { status, lastSync } }), []),
    updateLead: useCallback((lead) => dispatch({ type: ActionTypes.UPDATE_LEAD, payload: lead }), []),
    addLead: useCallback((lead) => dispatch({ type: ActionTypes.ADD_LEAD, payload: lead }), []),
    removeLead: useCallback((id) => dispatch({ type: ActionTypes.REMOVE_LEAD, payload: id }), []),
    removeLeads: useCallback((ids) => dispatch({ type: ActionTypes.REMOVE_LEADS, payload: ids }), []),
    logout: useCallback(() => dispatch({ type: ActionTypes.LOGOUT }), []),
  }

  return (
    <CRMContext.Provider value={{ state, actions }}>
      {children}
    </CRMContext.Provider>
  )
}

export function useCRM() {
  const context = useContext(CRMContext)
  if (!context) throw new Error('useCRM must be used within CRMProvider')
  return context
}
