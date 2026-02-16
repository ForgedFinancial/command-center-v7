// ========================================
// API Configuration
// Worker proxy URL and endpoint definitions
// ========================================

export const WORKER_PROXY_URL = 'https://forged-sync.danielruh.workers.dev'

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

  // Auth
  authSetup: '/api/auth/setup',
  authLogin: '/api/auth/login',
  authLogout: '/api/auth/logout',
  authCheck: '/api/auth/check',
}

export const POLL_INTERVAL_MS = 15000 // 15 seconds
