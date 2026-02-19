// ========================================
// Twilio API Client
// Frontend service for all Twilio endpoints
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

  // ── Token (for browser calling) ──
  getToken: (identity = 'boss') => request('/api/twilio/token', {
    method: 'POST', body: JSON.stringify({ identity }),
  }),

  // ── Calls ──
  makeCall: (to, contactId = null) => request('/api/twilio/call', {
    method: 'POST', body: JSON.stringify({ to, contactId }),
  }),
  getCalls: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/twilio/calls${qs ? '?' + qs : ''}`)
  },

  // ── SMS ──
  sendSMS: (to, body, contactId = null) => request('/api/twilio/sms/send', {
    method: 'POST', body: JSON.stringify({ to, body, contactId }),
  }),
  getMessages: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/twilio/sms/messages${qs ? '?' + qs : ''}`)
  },
  getThreads: (limit = 30) => request(`/api/twilio/sms/threads?limit=${limit}`),

  // ── Phone Lines ──
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

  // ── Hold ──
  holdCall: (callSid) => request('/api/twilio/call/hold', {
    method: 'POST', body: JSON.stringify({ callSid }),
  }),
  unholdCall: (callSid) => request('/api/twilio/call/unhold', {
    method: 'POST', body: JSON.stringify({ callSid }),
  }),

  // ── Failover ──
  getFailoverStatus: () => request('/api/twilio/failover/status'),
}

export default twilioClient
