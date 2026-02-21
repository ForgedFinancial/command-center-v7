export const PROJECT_TEMPLATES = {
  sales_pipeline: {
    id: 'sales_pipeline',
    name: 'Sales Pipeline',
    icon: '💰',
    description: 'Lead-to-close insurance sales workflow',
    color: '#00d4ff',
    columns: [
      { name: 'New Lead',       color: '#8b5cf6', order: 0 },
      { name: 'Contacted',      color: '#3b82f6', order: 1 },
      { name: 'Qualified',      color: '#06b6d4', order: 2 },
      { name: 'Quote Sent',     color: '#f59e0b', order: 3 },
      { name: 'App Submitted',  color: '#f97316', order: 4 },
      { name: 'Underwriting',   color: '#a855f7', order: 5 },
      { name: 'Issued',         color: '#4ade80', order: 6 },
      { name: 'Delivered',      color: '#10b981', order: 7 },
    ]
  },

  policy_tracking: {
    id: 'policy_tracking',
    name: 'Policy Tracking',
    icon: '📋',
    description: 'Track policies from submission through renewal',
    color: '#3b82f6',
    columns: [
      { name: 'Pending',         color: '#f59e0b', order: 0 },
      { name: 'In Underwriting', color: '#a855f7', order: 1 },
      { name: 'Approved',        color: '#4ade80', order: 2 },
      { name: 'Active',          color: '#10b981', order: 3 },
      { name: 'Renewal Due',     color: '#f97316', order: 4 },
      { name: 'Lapsed',          color: '#ef4444', order: 5 },
    ]
  },

  agent_onboarding: {
    id: 'agent_onboarding',
    name: 'Agent Onboarding',
    icon: '🎯',
    description: 'New agent setup and training pipeline',
    color: '#a855f7',
    columns: [
      { name: 'Paperwork',         color: '#8b5cf6', order: 0 },
      { name: 'Licensing',         color: '#3b82f6', order: 1 },
      { name: 'Contracting',       color: '#06b6d4', order: 2 },
      { name: 'Training',          color: '#f59e0b', order: 3 },
      { name: 'Shadow Calls',      color: '#f97316', order: 4 },
      { name: 'Solo — Monitored',  color: '#a855f7', order: 5 },
      { name: 'Fully Active',      color: '#4ade80', order: 6 },
    ]
  },

  recruiting: {
    id: 'recruiting',
    name: 'Recruiting',
    icon: '👥',
    description: 'Agent recruiting and hiring funnel',
    color: '#f59e0b',
    columns: [
      { name: 'Prospect',            color: '#8b5cf6', order: 0 },
      { name: 'Reached Out',         color: '#3b82f6', order: 1 },
      { name: 'Interview Scheduled', color: '#06b6d4', order: 2 },
      { name: 'Interviewed',         color: '#f59e0b', order: 3 },
      { name: 'Offer Sent',          color: '#f97316', order: 4 },
      { name: 'Hired',               color: '#4ade80', order: 5 },
      { name: 'Declined',            color: '#ef4444', order: 6 },
    ]
  },

  custom: {
    id: 'custom',
    name: 'Blank Board',
    icon: '📁',
    description: 'Start with an empty board — add your own columns',
    color: '#71717a',
    columns: [
      { name: 'To Do',  color: '#3b82f6', order: 0 },
      { name: 'Doing',  color: '#f59e0b', order: 1 },
      { name: 'Done',   color: '#4ade80', order: 2 },
    ]
  }
}

export const TEMPLATE_LIST = Object.values(PROJECT_TEMPLATES)

export const PROJECT_ICONS = ['📁', '💰', '📋', '🎯', '👥', '🏗️', '📊', '⚡']

export const PROJECT_COLORS = ['#00d4ff', '#3b82f6', '#8b5cf6', '#a855f7', '#ef4444', '#f59e0b', '#f97316', '#4ade80', '#10b981', '#71717a']
