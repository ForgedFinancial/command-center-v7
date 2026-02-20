// ========================================
// API Configuration
// Worker proxy URL and endpoint definitions
// ========================================

export const WORKER_PROXY_URL = 'https://api.forgedfinancial.us'

// Sync server auth — pulled from env at build or fallback
export const SYNC_API_KEY = import.meta.env.VITE_SYNC_API_KEY || '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0'

export function getSyncHeaders() {
  return { 'Content-Type': 'application/json', 'x-api-key': SYNC_API_KEY }
}

export const ENDPOINTS = {
  // Health & State
  health: '/api/health',
  ccState: '/api/cc-state',
  push: '/api/push',
  poll: '/api/poll',

  // Workspace
  workspace: (agentId) => `/api/workspace/${agentId}`,
  workspaceFile: (agentId, filename) => `/api/workspace/${agentId}/${filename}`,

  // Communications
  commsSend: '/api/comms/send',
  commsMessages: '/api/comms/messages',
  commsRead: '/api/comms/read',
  commsRoom: '/api/comms/room',
  commsSession: '/api/comms/session',

  // Dashboard Data
  dashboardEmail: '/api/dashboard/email',
  dashboardFinance: '/api/dashboard/finance',
  dashboardCalendar: '/api/dashboard/calendar',
  dashboardAds: '/api/dashboard/ads',
  dashboardWeather: '/api/dashboard/weather',

  // OpenClaw Webhooks
  openclawComplete: '/api/openclaw/complete',
  openclawProgress: '/api/openclaw/progress',
  openclawError: '/api/openclaw/error',

  // Agent Status
  agentStatus: '/api/agents/status',
  agentOutput: (agentId) => `/api/agents/${agentId}/output`,
  agentActivity: (agentId) => `/api/agents/${agentId}/activity`,
  agentLogs: (agentId) => `/api/agents/${agentId}/logs`,
  agentLogFile: (agentId, filename) => `/api/agents/${agentId}/logs/${filename}`,
  pipelineState: '/api/pipeline/state',

  // Task Board
  taskboardTasks: '/api/taskboard/tasks',
  taskboardTask: (id) => `/api/taskboard/tasks/${id}`,
  taskboardTaskMove: (id) => `/api/taskboard/tasks/${id}/move`,
  taskboardTaskApprove: (id) => `/api/taskboard/tasks/${id}/approve`,
  taskboardTaskDecline: (id) => `/api/taskboard/tasks/${id}/decline`,
  taskboardSuggestions: '/api/taskboard/suggestions',
  taskboardSuggestionApprove: (id) => `/api/taskboard/suggestions/${id}/approve`,
  taskboardSuggestionDismiss: (id) => `/api/taskboard/suggestions/${id}/dismiss`,
  taskboardProjects: '/api/taskboard/projects',
  taskboardProject: (id) => `/api/taskboard/projects/${id}`,
  taskboardDocuments: '/api/taskboard/documents',
  taskboardDocument: (id) => `/api/taskboard/documents/${id}`,
  taskboardDocumentUpload: '/api/taskboard/documents/upload',
  taskboardLessons: '/api/taskboard/lessons',

  // Notifications
  notifications: '/api/notifications',
  notificationRead: (id) => `/api/notifications/${id}/read`,
  notificationsMarkAllRead: '/api/notifications/mark-all-read',

  // Task Notify Webhook
  tasksNotify: '/api/tasks/notify',

  // Lead Sources Settings
  leadSources: '/api/settings/lead-sources',

  // Auth
  authSetup: '/api/auth/setup',
  authLogin: '/api/auth/login',
  authLogout: '/api/auth/logout',
  authCheck: '/api/auth/check',
}

export const POLL_INTERVAL_MS = 60000 // 60 seconds (was 15s)
