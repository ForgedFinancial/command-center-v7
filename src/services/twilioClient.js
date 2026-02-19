// ========================================
// Twilio API Client — Phase 1 Power Dialer
// Routes through Worker proxy → VPS sync server
// ========================================

import { WORKER_PROXY_URL } from '../config/api'

function getAuthHeaders() {
  const token = localStorage.getItem('forgedos_crm_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(endpoint, options = {}) {
  const url = `${WORKER_PROXY_URL}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  })
  const data = await res.json()
  if (!res.ok && !data.configured) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const twilioClient = {
  // ── Config ──
  getConfigStatus: () => request('/api/twilio/config/status'),
  updateConfig: (config) => request('/api/twilio/config/update', {
    method: 'POST', body: JSON.stringify(config),
  }),

  // ── Token ──
  getToken: (identity = 'boss') => request('/api/twilio/token', {
    method: 'POST', body: JSON.stringify({ identity }),
  }),

  // ── Calls ──
  makeCall: (to, contactId = null, leadName = null, leadState = null, from = null) => request('/api/twilio/call', {
    method: 'POST', body: JSON.stringify({ to, from, contactId, leadName, leadState }),
  }),
  holdCall: (callSid) => request(`/api/twilio/call/${callSid}/hold`, { method: 'POST' }),
  unholdCall: (callSid) => request(`/api/twilio/call/${callSid}/unhold`, { method: 'POST' }),
  endCall: (callSid) => request(`/api/twilio/call/${callSid}/end`, { method: 'POST' }),
  dispositionCall: (callSid, disposition, notes = '') => request(`/api/twilio/call/${callSid}/disposition`, {
    method: 'POST', body: JSON.stringify({ disposition, notes }),
  }),
  getCalls: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/twilio/calls${qs ? '?' + qs : ''}`)
  },

  // ── Lines ──
  getLines: () => request('/api/twilio/lines'),
  getNumbers: () => request('/api/twilio/numbers'),
  setPrimaryLine: (lineId) => request('/api/twilio/numbers/primary', {
    method: 'POST', body: JSON.stringify({ lineId }),
  }),
  addNumber: (number, label) => request('/api/twilio/numbers/add', {
    method: 'POST', body: JSON.stringify({ number, label }),
  }),
  removeNumber: (number, sid) => request('/api/twilio/numbers/remove', {
    method: 'POST', body: JSON.stringify({ number, sid }),
  }),

  // ── Routing ──
  previewRouting: (phone, state) => request(`/api/twilio/routing/preview?phone=${encodeURIComponent(phone || '')}&state=${encodeURIComponent(state || '')}`),

  // ── SMS ──
  sendSMS: (to, body, contactId = null, leadState = null) => request('/api/twilio/sms/send', {
    method: 'POST', body: JSON.stringify({ to, body, contactId, leadState }),
  }),
  getMessages: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/twilio/sms/messages${qs ? '?' + qs : ''}`)
  },
  getThreads: (limit = 30) => request(`/api/twilio/sms/threads?limit=${limit}`),

  // ── Failover ──
  getFailoverStatus: () => request('/api/twilio/failover/status'),
}

export default twilioClient
