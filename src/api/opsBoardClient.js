import { WORKER_PROXY_URL, getSyncHeaders } from '../config/api'

class OpsBoardClient {
  async request(endpoint, options = {}) {
    const res = await fetch(`${WORKER_PROXY_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getSyncHeaders(),
        ...(options.headers || {}),
      },
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`)
    }

    return data
  }

  async getTasks(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return this.request(`/api/ops/tasks${qs}`)
  }

  async getTask(taskId) {
    return this.request(`/api/ops/tasks/${taskId}`)
  }

  async createTask(payload) {
    return this.request('/api/ops/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async updateTask(taskId, payload) {
    return this.request(`/api/ops/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async archiveTask(taskId) {
    return this.request(`/api/ops/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  async moveTaskStage(taskId, stage, payload = {}) {
    return this.request(`/api/ops/tasks/${taskId}/stage/${stage}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getManifest(taskId) {
    return this.request(`/api/ops/tasks/${taskId}/manifest`)
  }

  async updateManifestSection(taskId, section, content) {
    return this.request(`/api/ops/tasks/${taskId}/manifest/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  }

  async validateGates(taskId) {
    return this.request(`/api/ops/tasks/${taskId}/gates/validate`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async getGateStatus(taskId) {
    return this.request(`/api/ops/tasks/${taskId}/gates/status`)
  }

  async setGate(taskId, gateName, passed = true, reason = '') {
    return this.request(`/api/ops/tasks/${taskId}/gates/${gateName}`, {
      method: 'PUT',
      body: JSON.stringify({ passed, reason }),
    })
  }

  async createCheckpoint(taskId, messageCount = 0) {
    return this.request(`/api/ops/tasks/${taskId}/checkpoints`, {
      method: 'POST',
      body: JSON.stringify({ messageCount }),
    })
  }

  async getLatestCheckpoint(taskId) {
    return this.request(`/api/ops/tasks/${taskId}/checkpoints/latest`)
  }

  async listHandoffs(taskId) {
    return this.request(`/api/ops/tasks/${taskId}/handoffs`)
  }

  async createHandoff(taskId, fromStage, toStage) {
    return this.request(`/api/ops/tasks/${taskId}/handoffs`, {
      method: 'POST',
      body: JSON.stringify({ fromStage, toStage }),
    })
  }
}

export const opsBoardClient = new OpsBoardClient()
export default opsBoardClient
