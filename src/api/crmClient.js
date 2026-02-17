// ========================================
// CRM API Client
// Connects to yncrm-api.danielruh.workers.dev (D1 backend)
// ========================================

const CRM_API_URL = 'https://yncrm-api.danielruh.workers.dev'

class CRMClient {
  constructor() {
    this.baseUrl = CRM_API_URL
    this.pending = new Map()
  }

  getToken() {
    return localStorage.getItem('forgedos_crm_token') || ''
  }

  async request(url, options = {}) {
    const fullUrl = `${this.baseUrl}${url}`
    const key = `${options.method || 'GET'}:${fullUrl}`

    if (!options.method || options.method === 'GET') {
      if (this.pending.has(key)) return this.pending.get(key)
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const token = this.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const promise = fetch(fullUrl, { ...options, headers })
      .then(async (res) => {
        this.pending.delete(key)
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || body.message || `HTTP ${res.status}`)
        return body
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

  // Auth
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async getMe() {
    return this.request('/auth/me')
  }

  // Leads
  async getLeads(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ''))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/leads${qs}`)
  }

  async createLead(data) {
    return this.request('/leads', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateLead(id, data) {
    return this.request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteLead(id) {
    return this.request(`/leads/${id}`, { method: 'DELETE' })
  }

  async bulkDeleteLeads(ids) {
    return this.request('/leads/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) })
  }

  async importLeads(data) {
    return this.request('/leads/import', { method: 'POST', body: JSON.stringify(data) })
  }

  // Settings
  async getSettings() {
    return this.request('/settings')
  }

  async updateSettings(data) {
    return this.request('/settings', { method: 'PUT', body: JSON.stringify(data) })
  }

  // Custom Fields
  async getCustomFields() {
    return this.request('/custom-fields')
  }

  // Drip Sources
  async getDripSources() {
    return this.request('/drip-sources')
  }

  // Appointments
  async getAppointments(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/appointments${qs}`)
  }

  async createAppointment(data) {
    return this.request('/appointments', { method: 'POST', body: JSON.stringify(data) })
  }

  async getAvailableSlots(date) {
    return this.request(`/appointments/available?date=${date}`)
  }

  // Sync
  async sync() {
    return this.request('/sync', { method: 'POST' })
  }
}

export const crmClient = new CRMClient()
export default crmClient
