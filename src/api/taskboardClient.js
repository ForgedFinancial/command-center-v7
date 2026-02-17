// ========================================
// Task Board API Client
// Uses existing syncClient pattern via Worker proxy
// ========================================

import { WORKER_PROXY_URL, ENDPOINTS } from '../config/api'

class TaskboardClient {
  constructor() {
    this.baseUrl = WORKER_PROXY_URL
    this.pending = new Map()
  }

  async request(url, options = {}) {
    const fullUrl = `${this.baseUrl}${url}`
    const key = `${options.method || 'GET'}:${fullUrl}`

    // Dedup in-flight GET requests
    if (!options.method || options.method === 'GET') {
      if (this.pending.has(key)) return this.pending.get(key)
    }

    const token = sessionStorage.getItem('forged-os-token') || ''
    const promise = fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })
      .then(async (res) => {
        this.pending.delete(key)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .catch((err) => {
        this.pending.delete(key)
        throw err
      })

    if (!options.method || options.method === 'GET') {
      this.pending.set(key, promise)
    }
    return promise
  }

  // Tasks
  async getTasks(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`${ENDPOINTS.taskboardTasks}${qs}`)
  }

  async createTask(data) {
    return this.request(ENDPOINTS.taskboardTasks, { method: 'POST', body: JSON.stringify(data) })
  }

  async updateTask(id, data) {
    return this.request(ENDPOINTS.taskboardTask(id), { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteTask(id) {
    return this.request(ENDPOINTS.taskboardTask(id), { method: 'DELETE' })
  }

  async moveTask(id, stage, movedBy = 'boss') {
    return this.request(ENDPOINTS.taskboardTaskMove(id), { method: 'POST', body: JSON.stringify({ stage, movedBy }) })
  }

  async approveTask(id) {
    return this.request(ENDPOINTS.taskboardTaskApprove(id), { method: 'POST' })
  }

  async declineTask(id, notes) {
    return this.request(ENDPOINTS.taskboardTaskDecline(id), { method: 'POST', body: JSON.stringify({ notes }) })
  }

  // Suggestions
  async createSuggestion(data) {
    return this.request(ENDPOINTS.taskboardSuggestions, { method: 'POST', body: JSON.stringify(data) })
  }

  async approveSuggestion(id) {
    return this.request(ENDPOINTS.taskboardSuggestionApprove(id), { method: 'POST' })
  }

  async dismissSuggestion(id) {
    return this.request(ENDPOINTS.taskboardSuggestionDismiss(id), { method: 'POST' })
  }

  // Projects
  async getProjects() {
    return this.request(ENDPOINTS.taskboardProjects)
  }

  async createProject(data) {
    return this.request(ENDPOINTS.taskboardProjects, { method: 'POST', body: JSON.stringify(data) })
  }

  async updateProject(id, data) {
    return this.request(ENDPOINTS.taskboardProject(id), { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteProject(id) {
    return this.request(ENDPOINTS.taskboardProject(id), { method: 'DELETE' })
  }

  // Documents
  async getDocuments(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`${ENDPOINTS.taskboardDocuments}${qs}`)
  }

  async createDocument(data) {
    return this.request(ENDPOINTS.taskboardDocuments, { method: 'POST', body: JSON.stringify(data) })
  }

  async deleteDocument(id) {
    return this.request(ENDPOINTS.taskboardDocument(id), { method: 'DELETE' })
  }

  // Lessons
  async getLessons(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`${ENDPOINTS.taskboardLessons}${qs}`)
  }
}

export const taskboardClient = new TaskboardClient()
export default taskboardClient
