// ========================================
// CRM API Client
// Connects to yncrm-api.danielruh.workers.dev (D1 backend)
// ========================================

const CRM_API_URL = '/api/crm'

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

    // Auth handled server-side by Pages Function proxy

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

  // Pipelines
  async getPipelines() {
    return this.request('/pipelines')
  }

  async createPipeline(data) {
    return this.request('/pipelines', { method: 'POST', body: JSON.stringify(data) })
  }

  async updatePipeline(id, data) {
    return this.request(`/pipelines/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deletePipeline(id) {
    return this.request(`/pipelines/${id}`, { method: 'DELETE' })
  }

  async reorderPipelines(orderedIds) {
    return this.request('/pipelines/reorder', { method: 'PUT', body: JSON.stringify({ order: orderedIds }) })
  }

  async getStages(pipelineId) {
    return this.request(`/pipelines/${pipelineId}/stages`)
  }

  async createStage(pipelineId, data) {
    return this.request(`/pipelines/${pipelineId}/stages`, { method: 'POST', body: JSON.stringify(data) })
  }

  async updateStage(stageId, data) {
    return this.request(`/stages/${stageId}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteStage(stageId) {
    return this.request(`/stages/${stageId}`, { method: 'DELETE' })
  }

  async reorderStages(pipelineId, orderedIds) {
    return this.request(`/pipelines/${pipelineId}/stages/reorder`, { method: 'PUT', body: JSON.stringify({ order: orderedIds }) })
  }

  async moveLead(leadId, toPipelineId, toStageId, fromPipelineId, fromStageId, reason) {
    // Update the lead
    const updateRes = await this.request(`/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ pipeline_id: toPipelineId, stage_id: toStageId }),
    })
    // Log in pipeline history
    await this.request('/pipeline-history', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: leadId,
        from_pipeline_id: fromPipelineId || null,
        from_stage_id: fromStageId || null,
        to_pipeline_id: toPipelineId,
        to_stage_id: toStageId,
        reason: reason || null,
      }),
    }).catch(() => {}) // non-blocking
    return updateRes
  }

  async getHistory(leadId) {
    return this.request(`/pipeline-history?lead_id=${leadId}`)
  }

  async getPipelineHistory(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ''))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/pipeline-history${qs}`)
  }

  // Lead bulk ops
  async bulkMoveLeads(ids, stageId) {
    return this.request('/leads/bulk-move', { method: 'POST', body: JSON.stringify({ ids, stage_id: stageId }) })
  }

  async bulkTransferLeads(ids, pipelineId, stageId) {
    return this.request('/leads/bulk-transfer', { method: 'POST', body: JSON.stringify({ ids, pipeline_id: pipelineId, stage_id: stageId }) })
  }

  async transferLead(leadId, toPipelineId, toStageId) {
    return this.moveLead(leadId, toPipelineId, toStageId)
  }

  // Activity feed
  async getLeadActivity(leadId) {
    return this.request(`/leads/${leadId}/activity`)
  }

  // Tags
  async getTags() {
    return this.request('/tags')
  }

  async addTag(leadId, tag) {
    return this.request(`/leads/${leadId}/tags`, { method: 'POST', body: JSON.stringify({ tag }) })
  }

  async removeTag(leadId, tag) {
    return this.request(`/leads/${leadId}/tags`, { method: 'DELETE', body: JSON.stringify({ tag }) })
  }

  // Metric settings
  async getMetricSettings() {
    return this.request('/metric-settings')
  }

  async updateMetricSetting(id, data) {
    return this.request(`/metric-settings/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async bulkUpdateMetrics(metrics) {
    return this.request('/metric-settings/bulk', { method: 'PUT', body: JSON.stringify({ metrics }) })
  }

  // SMS templates
  async getTemplates() {
    return this.request('/sms-templates')
  }

  async updateTemplate(id, data) {
    return this.request(`/sms-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async resetTemplate(id) {
    return this.request(`/sms-templates/${id}/reset`, { method: 'POST' })
  }

  // Timer configs
  async getTimerConfigs() {
    return this.request('/timer-configs')
  }

  async updateTimerConfig(id, data) {
    return this.request(`/timer-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  // Notification preferences
  async getNotificationPrefs() {
    return this.request('/notification-prefs')
  }

  async updateNotificationPrefs(data) {
    return this.request('/notification-prefs', { method: 'PUT', body: JSON.stringify(data) })
  }

  // Dashboard
  async getDashboardData(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ''))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/dashboard${qs}`)
  }

  // Approval queue
  async getApprovalQueue(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ''))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/approval-queue${qs}`)
  }

  async approveMessage(id) {
    return this.request(`/approval-queue/${id}/approve`, { method: 'POST' })
  }

  async declineMessage(id) {
    return this.request(`/approval-queue/${id}/decline`, { method: 'POST' })
  }

  // Call recordings
  async listRecordings(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ''))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/recordings${qs}`)
  }

  async getRecording(id) {
    return this.request(`/recordings/${id}`)
  }

  // Voicemail drops
  async listDrops() {
    return this.request('/voicemail-drops')
  }

  async createDrop(data) {
    return this.request('/voicemail-drops', { method: 'POST', body: JSON.stringify(data) })
  }

  async deleteDrop(id) {
    return this.request(`/voicemail-drops/${id}`, { method: 'DELETE' })
  }

  // Voicemails
  async listVoicemails(query = {}) {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ''))
    const qs = params.toString() ? `?${params}` : ''
    return this.request(`/voicemails${qs}`)
  }

  async getVoicemail(id) {
    return this.request(`/voicemails/${id}`)
  }

  async markVoicemailHandled(id) {
    return this.request(`/voicemails/${id}/handled`, { method: 'POST' })
  }

  async deleteVoicemail(id) {
    return this.request(`/voicemails/${id}`, { method: 'DELETE' })
  }

  // Sync
  async sync() {
    return this.request('/sync', { method: 'POST' })
  }
}

export const crmClient = new CRMClient()
export default crmClient
