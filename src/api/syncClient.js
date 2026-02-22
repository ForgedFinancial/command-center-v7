// ========================================
// FEATURE: SyncClient
// Added: 2026-02-14 by Claude Code
// Updated: 2026-02-15 — timeout, error types
// HTTP client for all API calls via Worker proxy
// ========================================

import { WORKER_PROXY_URL, ENDPOINTS } from '../config/api'

class SyncClient {
  constructor() {
    this.baseUrl = WORKER_PROXY_URL
    this._inflight = new Map()
    this._authToken = sessionStorage.getItem('cc_auth_token') || null
  }

  async request(endpoint, options = {}) {
    const method = options?.method || 'GET'
    if (method === 'GET' && this._inflight.has(endpoint)) {
      return this._inflight.get(endpoint)
    }

    const promise = this._doRequest(endpoint, options).finally(() => {
      this._inflight.delete(endpoint)
    })

    if (method === 'GET') {
      this._inflight.set(endpoint, promise)
    }

    return promise
  }

  async _doRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const timeoutMs = options.timeout || 10000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_SYNC_API_KEY || import.meta.env.VITE_WORKER_API_KEY || '',
      ...options.headers,
    }
    if (this._authToken) {
      headers['Authorization'] = `Bearer ${this._authToken}`
    }

    const config = {
      headers,
      ...options,
      signal: controller.signal,
    }
    // Remove custom keys
    delete config.timeout

    try {
      const response = await fetch(url, config)

      clearTimeout(timeoutId)

      if (!response.ok) {
        let body = null
        try { body = await response.json() } catch {}
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        error.isHttp = true
        error.body = body
        throw error
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      return await response.text()
    } catch (error) {
      clearTimeout(timeoutId)

      // Attach metadata for callers to distinguish error types
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`)
        timeoutError.status = 0
        timeoutError.isTimeout = true
        throw timeoutError
      }

      if (!error.status && !error.isHttp) {
        // Network error (offline, DNS, etc.)
        error.status = 0
        error.isNetwork = true
      }

      throw error
    }
  }

  // Health & State
  async health() {
    return this.request(ENDPOINTS.health)
  }

  async getState() {
    return this.request(ENDPOINTS.ccState)
  }

  async push(data) {
    return this.request(ENDPOINTS.push, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async poll() {
    return this.request(ENDPOINTS.poll)
  }

  // Workspace
  async getWorkspace(agentId) {
    return this.request(ENDPOINTS.workspace(agentId))
  }

  async getWorkspaceFile(agentId, filename) {
    return this.request(ENDPOINTS.workspaceFile(agentId, filename))
  }

  // Communications
  async sendComm(from, to, message, topic = 'general') {
    return this.request(ENDPOINTS.commsSend, {
      method: 'POST',
      body: JSON.stringify({ from, to, message, topic }),
    })
  }

  async getComms(recipient, unreadOnly = false) {
    const params = new URLSearchParams({ for: recipient })
    if (unreadOnly) params.append('unread', 'true')
    return this.request(`${ENDPOINTS.commsMessages}?${params}`)
  }

  async markCommsRead(ids) {
    return this.request(ENDPOINTS.commsRead, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  }

  // Stand-Up Room — uses relative URLs (same-origin proxy)
  async getRoomMessages(topic = 'standup', limit = 100, since = null) {
    const params = new URLSearchParams({ topic, limit: String(limit) })
    if (since) params.append('since', since)
    const res = await fetch(`/api/comms/room?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async sendRoomMessage(from, message) {
    const res = await fetch('/api/comms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: 'standup', message, topic: 'standup' }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  // Dashboard Data
  async getDashboardCalendar() {
    return this.request(ENDPOINTS.dashboardCalendar)
  }

  // Agent Status
  async getAgentStatus() {
    return this.request(ENDPOINTS.agentStatus)
  }

  // Agent Output
  async getAgentOutput(agentId) {
    return this.request(ENDPOINTS.agentOutput(agentId))
  }

  // Pipeline State
  async getPipelineState() {
    return this.request(ENDPOINTS.pipelineState)
  }

  // Auth — stores token from server response for Bearer auth (works through proxies)
  _setToken(token) {
    this._authToken = token || null
    if (token) {
      sessionStorage.setItem('cc_auth_token', token)
    } else {
      sessionStorage.removeItem('cc_auth_token')
    }
  }

  auth = {
    check: () => this.request(ENDPOINTS.authCheck),
    login: async (username, password) => {
      const result = await this.request(ENDPOINTS.authLogin, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (result?.token) this._setToken(result.token)
      return result
    },
    setup: async (password) => {
      const result = await this.request(ENDPOINTS.authSetup, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      if (result?.token) this._setToken(result.token)
      return result
    },
    logout: async () => {
      const result = await this.request(ENDPOINTS.authLogout, {
        method: 'POST',
      })
      this._setToken(null)
      return result
    },
  }
}

// ========================================
// Network Log — observable array for dev tooling
// Added: 2026-02-15 by Mason (FF-BLD-001)
// ========================================

let _networkLogId = 0
export const networkLog = []
const _subscribers = new Set()

export function networkLogSubscribe(cb) {
  _subscribers.add(cb)
  return () => _subscribers.delete(cb)
}

function _notifySubscribers() {
  _subscribers.forEach(cb => cb())
}

function _logRequest(method, url) {
  const entry = {
    id: ++_networkLogId,
    method,
    url,
    startTime: Date.now(),
    endTime: null,
    status: null,
    duration: null,
    error: null,
  }
  networkLog.push(entry)
  if (networkLog.length > 10) networkLog.shift()
  _notifySubscribers()
  return entry
}

function _logResponse(entry, status, error) {
  entry.endTime = Date.now()
  entry.status = status
  entry.duration = entry.endTime - entry.startTime
  entry.error = error || null
  _notifySubscribers()
}

// Instrument _doRequest for network logging
const _origDoRequest = SyncClient.prototype._doRequest
SyncClient.prototype._doRequest = async function(endpoint, options = {}) {
  const method = options?.method || 'GET'
  const url = `${this.baseUrl}${endpoint}`
  const entry = _logRequest(method, url)
  try {
    const result = await _origDoRequest.call(this, endpoint, options)
    // _doRequest throws on non-ok, so if we're here it was 2xx
    _logResponse(entry, 200, null)
    return result
  } catch (err) {
    _logResponse(entry, err?.status || 0, err?.message)
    throw err
  }
}

// Export singleton instance
export const syncClient = new SyncClient()
export default syncClient
