// ========================================
// CRM Constants
// Stages, lead types, event types, calendar views
// ========================================

export const CRM_API_URL = 'https://yncrm-api.danielruh.workers.dev'

export const CRM_STAGES = {
  NEW_LEAD: 'new_lead',
  CONTACT: 'contact',
  ENGAGED: 'engaged',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  SOLD: 'sold',
}

export const CRM_STAGE_ORDER = ['new_lead', 'contact', 'engaged', 'qualified', 'proposal', 'sold']

export const CRM_STAGE_CONFIG = {
  new_lead:     { label: 'New Lead',          color: '#00d4ff', bg: 'rgba(0,212,255,0.12)' },
  contact:      { label: 'Contacted',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  engaged:      { label: 'Engaged Interest',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  qualified:    { label: 'Qualified',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  proposal:     { label: 'Proposal',           color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  sold:         { label: 'Won',                color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
}

export const LEAD_TYPES = ['FEX', 'WHOLE', 'TERM', 'IUL', 'ANNUITY', 'TRUCKER', 'MP', 'VETERANS']

export const EVENT_TYPES = {
  APPOINTMENT: 'appointment',
  FOLLOW_UP: 'follow_up',
  CLOSING: 'closing',
  TASK: 'task',
  PERSONAL: 'personal',
  REMINDER: 'reminder',
}

export const EVENT_COLORS = {
  appointment: '#3b82f6',
  follow_up: '#f59e0b',
  closing: '#4ade80',
  task: '#8b5cf6',
  personal: '#ec4899',
  reminder: '#ef4444',
  clawd_booked: '#00d4ff',
}

export const CRM_VIEWS = {
  DASHBOARD: 'dashboard',
  PIPELINE: 'pipeline',
  CONTACTS: 'contacts',
  FOLLOW_UP: 'follow-up',
  CALENDAR: 'calendar',
  SETTINGS: 'settings',
}

export const CALENDAR_VIEWS = ['month', 'week', 'day', 'agenda', 'list']
