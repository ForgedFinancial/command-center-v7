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
        'x-api-key': import.meta.env.VITE_SYNC_API_KEY || import.meta.env.VITE_WORKER_API_KEY || '',
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

  async getProjectById(id) {
    return this.request(`/api/taskboard/projects/${id}`)
  }

  async createProjectObject(projectId, data) {
    try {
      return await this.request(`/api/taskboard/projects/${projectId}/objects`, { method: 'POST', body: JSON.stringify(data) })
    } catch {
      return this.createCanvasObject({ ...data, projectId })
    }
  }

  async updateProjectObject(projectId, objId, data) {
    try {
      return await this.request(`/api/taskboard/projects/${projectId}/objects/${objId}`, { method: 'PATCH', body: JSON.stringify(data) })
    } catch {
      return this.updateCanvasObject(objId, data)
    }
  }

  async deleteProjectObject(projectId, objId) {
    try {
      return await this.request(`/api/taskboard/projects/${projectId}/objects/${objId}`, { method: 'DELETE' })
    } catch {
      return this.deleteCanvasObject(objId)
    }
  }

  async getTemplates() {
    return this.request('/api/taskboard/templates')
  }

  async createProjectFromTemplate(payload) {
    return this.request('/api/taskboard/projects/from-template', { method: 'POST', body: JSON.stringify(payload) })
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

  async batchUpdateCanvasPositions(positions) {
    return this.request('/api/taskboard/projects/canvas-positions', {
      method: 'PUT',
      body: JSON.stringify({ positions }),
    })
  }

  async uploadFile(file, projectId) {
    const formData = new FormData()
    formData.append('file', file)
    if (projectId) formData.append('projectId', projectId)
    const token = sessionStorage.getItem('forged-os-token') || ''
    const res = await fetch(`${this.baseUrl}${ENDPOINTS.taskboardDocumentUpload}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': import.meta.env.VITE_SYNC_API_KEY || import.meta.env.VITE_WORKER_API_KEY || '',
      },
      body: formData,
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    return res.json()
  }

  // Canvas Objects (sticky notes, frames, text labels, connectors)
  async getCanvasObjects() {
    return this.request('/api/taskboard/canvas-objects')
  }

  async createCanvasObject(obj) {
    return this.request('/api/taskboard/canvas-objects', {
      method: 'POST',
      body: JSON.stringify(obj),
    })
  }

  async updateCanvasObject(id, updates) {
    return this.request(`/api/taskboard/canvas-objects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteCanvasObject(id) {
    return this.request(`/api/taskboard/canvas-objects/${id}`, {
      method: 'DELETE',
    })
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
