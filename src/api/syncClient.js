// ========================================
// FEATURE: SyncClient
// Added: 2026-02-14 by Claude Code
// HTTP client for all API calls via Worker proxy
// ========================================

import { WORKER_PROXY_URL, ENDPOINTS } from '../config/api'

class SyncClient {
  constructor() {
    this.baseUrl = WORKER_PROXY_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }
      return await response.text()
    } catch (error) {
      console.error(`SyncClient error for ${endpoint}:`, error)
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

  // Dashboard Data
  async getDashboardEmail() {
    return this.request(ENDPOINTS.dashboardEmail)
  }

  async getDashboardFinance() {
    return this.request(ENDPOINTS.dashboardFinance)
  }

  async getDashboardCalendar() {
    return this.request(ENDPOINTS.dashboardCalendar)
  }

  async getDashboardAds() {
    return this.request(ENDPOINTS.dashboardAds)
  }

  async getDashboardWeather() {
    return this.request(ENDPOINTS.dashboardWeather)
  }
}

// Export singleton instance
export const syncClient = new SyncClient()
export default syncClient
