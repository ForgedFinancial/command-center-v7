// ========================================
// Metric Calculation Engine — 39 Metrics
// Phase 4: Dashboard & Metrics
// ========================================

// Metric definitions with thresholds and categories
export const METRIC_DEFINITIONS = {
  // SECTION 1: SPEED & RESPONSIVENESS (Activity)
  speedToLead: {
    id: 'speedToLead', label: 'Speed to Lead', category: 'activity', unit: 'min',
    thresholds: { green: [0, 5], yellow: [5, 15], red: [15, Infinity] }, invertThreshold: true,
    description: 'Time from lead entering system to first contact attempt',
  },
  avgResponseTime: {
    id: 'avgResponseTime', label: 'Avg Response Time', category: 'activity', unit: 'min',
    thresholds: { green: [0, 30], yellow: [30, 60], red: [60, Infinity] }, invertThreshold: true,
    description: 'How fast agent responds to client messages',
  },
  overdueRate: {
    id: 'overdueRate', label: 'Overdue Rate', category: 'activity', unit: '%',
    thresholds: { green: [0, 5], yellow: [5, 15], red: [15, 100] }, invertThreshold: true,
    description: '% of leads/cases that hit any Overdue tag',
  },
  dailyCalls: {
    id: 'dailyCalls', label: 'Daily Calls', category: 'activity', unit: 'calls',
    thresholds: { green: [80, Infinity], yellow: [50, 80], red: [0, 50] },
    description: 'Total outbound call attempts per day',
  },
  talkTime: {
    id: 'talkTime', label: 'Talk Time', category: 'activity', unit: 'hrs',
    thresholds: { green: [2, Infinity], yellow: [1, 2], red: [0, 1] },
    description: 'Total time on phone with clients per day',
  },
  leadsWorkedToday: {
    id: 'leadsWorkedToday', label: 'Leads Worked Today', category: 'activity', unit: 'leads',
    thresholds: { green: [20, Infinity], yellow: [10, 20], red: [0, 10] },
    description: 'Unique leads with activity today',
  },
  attemptsToContact: {
    id: 'attemptsToContact', label: 'Attempts to Contact', category: 'activity', unit: 'avg',
    thresholds: { green: [3, 5], yellow: [1, 3], red: [0, 1] },
    description: 'Average call/text attempts before first contact',
  },
  dailyActivityScore: {
    id: 'dailyActivityScore', label: 'Activity Score', category: 'activity', unit: 'pts',
    thresholds: { green: [80, Infinity], yellow: [50, 80], red: [0, 50] },
    description: 'Combined metric of calls, texts, leads worked',
  },

  // SECTION 2: PIPELINE HEALTH
  contactRate: {
    id: 'contactRate', label: 'Contact Rate', category: 'pipeline', unit: '%',
    thresholds: { green: [45, 100], yellow: [30, 45], red: [0, 30] },
    description: '% of leads where agent made successful contact',
  },
  engagementRate: {
    id: 'engagementRate', label: 'Engagement Rate', category: 'pipeline', unit: '%',
    thresholds: { green: [30, 100], yellow: [20, 30], red: [0, 20] },
    description: '% of contacted leads showing genuine interest',
  },
  qualificationRate: {
    id: 'qualificationRate', label: 'Qualification Rate', category: 'pipeline', unit: '%',
    thresholds: { green: [55, 100], yellow: [40, 55], red: [0, 40] },
    description: '% of engaged leads that provide SSN',
  },
  pipelineVelocity: {
    id: 'pipelineVelocity', label: 'Pipeline Velocity', category: 'pipeline', unit: 'days',
    thresholds: { green: [0, 14], yellow: [14, 21], red: [21, Infinity] }, invertThreshold: true,
    description: 'Average days from New Lead to Closed Won',
  },
  funnelDropOff: {
    id: 'funnelDropOff', label: 'Funnel Drop-Off', category: 'pipeline', unit: '%',
    thresholds: { green: [0, 30], yellow: [30, 50], red: [50, 100] }, invertThreshold: true,
    description: 'Biggest drop-off point in pipeline',
  },
  stageDistribution: {
    id: 'stageDistribution', label: 'Stage Distribution', category: 'pipeline', unit: 'leads',
    thresholds: { green: [0, Infinity], yellow: [0, 0], red: [0, 0] },
    description: 'Lead count per pipeline stage',
  },

  // SECTION 3: REVENUE
  closeRate: {
    id: 'closeRate', label: 'Close Rate', category: 'revenue', unit: '%',
    thresholds: { green: [10, 100], yellow: [6, 10], red: [0, 6] },
    description: '% of all leads that reach Closed Won',
  },
  appToCloseRate: {
    id: 'appToCloseRate', label: 'App-to-Close Rate', category: 'revenue', unit: '%',
    thresholds: { green: [80, 100], yellow: [65, 80], red: [0, 65] },
    description: '% of applications that reach Closed Won',
  },
  avgPremium: {
    id: 'avgPremium', label: 'Avg Premium', category: 'revenue', unit: '$',
    thresholds: { green: [50, Infinity], yellow: [30, 50], red: [0, 30] },
    description: 'Average monthly premium per closed deal',
  },
  totalRevenue: {
    id: 'totalRevenue', label: 'Total Revenue', category: 'revenue', unit: '$',
    thresholds: { green: [5000, Infinity], yellow: [2000, 5000], red: [0, 2000] },
    description: 'Sum of all AP written in period',
  },
  revenueForecast: {
    id: 'revenueForecast', label: 'Revenue Forecast', category: 'revenue', unit: '$',
    thresholds: { green: [5000, Infinity], yellow: [2000, 5000], red: [0, 2000] },
    description: 'Projected revenue based on current pipeline',
  },

  // SECTION 4: EFFICIENCY
  approvalRate: {
    id: 'approvalRate', label: 'Approval Rate', category: 'efficiency', unit: '%',
    thresholds: { green: [75, 100], yellow: [60, 75], red: [0, 60] },
    description: '% of submitted apps approved by carrier',
  },
  placementRate: {
    id: 'placementRate', label: 'Placement Rate', category: 'efficiency', unit: '%',
    thresholds: { green: [90, 100], yellow: [80, 90], red: [0, 80] },
    description: '% of approved policies that go In Force',
  },
  avgUWTime: {
    id: 'avgUWTime', label: 'Avg UW Time', category: 'efficiency', unit: 'days',
    thresholds: { green: [0, 7], yellow: [7, 14], red: [14, Infinity] }, invertThreshold: true,
    description: 'Average days from Submitted to carrier decision',
  },
  requirementsRate: {
    id: 'requirementsRate', label: 'Requirements Completion', category: 'efficiency', unit: '%',
    thresholds: { green: [85, 100], yellow: [70, 85], red: [0, 70] },
    description: '% of UW requirements resolved without decline',
  },
  leadSourceROI: {
    id: 'leadSourceROI', label: 'Lead Source ROI', category: 'efficiency', unit: 'x',
    thresholds: { green: [3, Infinity], yellow: [1.5, 3], red: [0, 1.5] },
    description: 'Return on investment per lead source',
  },

  // SECTION 5: PERSISTENCY
  persistencyRate: {
    id: 'persistencyRate', label: 'Persistency (13-mo)', category: 'persistency', unit: '%',
    thresholds: { green: [85, 100], yellow: [75, 85], red: [0, 75] },
    description: '% of policies still In Force after 13 months',
  },
  dangerZoneSurvival: {
    id: 'dangerZoneSurvival', label: 'Danger Zone Survival', category: 'persistency', unit: '%',
    thresholds: { green: [90, 100], yellow: [80, 90], red: [0, 80] },
    description: '% of clients surviving Month 3 without exception',
  },
  exceptionRate: {
    id: 'exceptionRate', label: 'Exception Rate', category: 'persistency', unit: '%',
    thresholds: { green: [0, 10], yellow: [10, 20], red: [20, 100] }, invertThreshold: true,
    description: '% of In Force policies entering Retention Exceptions',
  },
  saveRate: {
    id: 'saveRate', label: 'Save Rate', category: 'persistency', unit: '%',
    thresholds: { green: [65, 100], yellow: [50, 65], red: [0, 50] },
    description: '% of retention exceptions resolved (not terminated)',
  },
  chargebackRisk: {
    id: 'chargebackRisk', label: 'Chargeback Risk', category: 'persistency', unit: '$',
    thresholds: { green: [0, 500], yellow: [500, 2000], red: [2000, Infinity] }, invertThreshold: true,
    description: 'Estimated commission at risk from early lapses',
  },

  // SECTION 6: CLIENT
  recaptureRate: {
    id: 'recaptureRate', label: 'Recapture Rate', category: 'client', unit: '%',
    thresholds: { green: [10, 100], yellow: [5, 10], red: [0, 5] },
    description: '% of Nurture/Recycle leads that return to Pipeline 1',
  },
  zombieRate: {
    id: 'zombieRate', label: 'ZOMBIE Rate', category: 'client', unit: '%',
    thresholds: { green: [5, 100], yellow: [2, 5], red: [0, 2] },
    description: '% of Recycle leads that self-reactivate',
  },
  winBackRevenue: {
    id: 'winBackRevenue', label: 'Win Back Revenue', category: 'client', unit: '$',
    thresholds: { green: [1000, Infinity], yellow: [500, 1000], red: [0, 500] },
    description: 'AP generated from recaptured leads',
  },
  nurtureResponseRate: {
    id: 'nurtureResponseRate', label: 'Nurture Response Rate', category: 'client', unit: '%',
    thresholds: { green: [15, 100], yellow: [8, 15], red: [0, 8] },
    description: 'Which nurture SMS messages get the most responses',
  },

  // SECTION 7: AUTOMATION
  automationTriggerCount: {
    id: 'automationTriggerCount', label: 'Automations Triggered', category: 'automation', unit: 'count',
    thresholds: { green: [10, Infinity], yellow: [5, 10], red: [0, 5] },
    description: 'Total automation actions executed this period',
  },
  automationSuccessRate: {
    id: 'automationSuccessRate', label: 'Automation Success Rate', category: 'automation', unit: '%',
    thresholds: { green: [90, 100], yellow: [75, 90], red: [0, 75] },
    description: '% of automations completing without error',
  },
  timeSavedByAutomation: {
    id: 'timeSavedByAutomation', label: 'Time Saved', category: 'automation', unit: 'hrs',
    thresholds: { green: [5, Infinity], yellow: [2, 5], red: [0, 2] },
    description: 'Estimated hours saved by automation this period',
  },

  // SECTION 8: MANAGER
  teamCloseRate: {
    id: 'teamCloseRate', label: 'Team Close Rate', category: 'manager', unit: '%',
    thresholds: { green: [10, 100], yellow: [6, 10], red: [0, 6] },
    description: 'Average close rate across all agents',
  },
  managerAlerts: {
    id: 'managerAlerts', label: 'Manager Alerts', category: 'manager', unit: 'count',
    thresholds: { green: [0, 3], yellow: [3, 8], red: [8, Infinity] }, invertThreshold: true,
    description: 'Escalations hitting 72h and 14d thresholds',
  },
  agentRanking: {
    id: 'agentRanking', label: 'Agent Rankings', category: 'manager', unit: 'rank',
    thresholds: { green: [0, Infinity], yellow: [0, 0], red: [0, 0] },
    description: 'Agent performance ranking across all metrics',
  },
}

export const CATEGORIES = {
  activity: { label: 'Activity & Speed', icon: '⚡', order: 1 },
  pipeline: { label: 'Pipeline Health', icon: '🔄', order: 2 },
  revenue: { label: 'Revenue & Production', icon: '💰', order: 3 },
  efficiency: { label: 'Efficiency & Approval', icon: '⚙️', order: 4 },
  persistency: { label: 'Persistency & Retention', icon: '🛡️', order: 5 },
  client: { label: 'Client & Recapture', icon: '🔁', order: 6 },
  automation: { label: 'Automation', icon: '🤖', order: 7 },
  manager: { label: 'Manager View', icon: '👔', order: 8 },
}

// Get threshold color for a metric value
export function getThresholdColor(metricId, value) {
  const def = METRIC_DEFINITIONS[metricId]
  if (!def) return 'gray'
  const { thresholds } = def
  if (value >= thresholds.green[0] && value <= thresholds.green[1]) return 'green'
  if (value >= thresholds.yellow[0] && value <= thresholds.yellow[1]) return 'yellow'
  return 'red'
}

// Calculate trend from previous vs current value
function calcTrend(current, previous) {
  if (previous === null || previous === undefined) return 'flat'
  if (current > previous * 1.02) return 'up'
  if (current < previous * 0.98) return 'down'
  return 'flat'
}

// Time filter helpers
export function filterByTimeRange(leads, range, customStart, customEnd) {
  const now = new Date()
  let start, end = now

  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay())
      d.setHours(0, 0, 0, 0)
      start = d
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      start = new Date(now.getFullYear(), q, 1)
      break
    }
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(0)
      end = customEnd ? new Date(customEnd) : now
      break
    default:
      return leads // 'all' — no filter
  }

  return leads.filter(l => {
    const d = new Date(l.createdAt || l.created_at || 0)
    return d >= start && d <= end
  })
}

// Get previous period leads for trend calculation
function getPreviousPeriodLeads(leads, range) {
  const now = new Date()
  let start, end

  switch (range) {
    case 'today': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      end = new Date(start)
      end.setDate(end.getDate() + 1)
      break
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay() - 7)
      d.setHours(0, 0, 0, 0)
      start = d
      end = new Date(d)
      end.setDate(end.getDate() + 7)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      return []
  }

  return leads.filter(l => {
    const d = new Date(l.createdAt || l.created_at || 0)
    return d >= start && d < end
  })
}

// Main calculation engine
export function calculateAllMetrics(leads, allLeads, timeRange = 'all', customStart, customEnd) {
  const filtered = filterByTimeRange(leads, timeRange, customStart, customEnd)
  const previous = getPreviousPeriodLeads(allLeads || leads, timeRange)
  const results = {}

  const total = filtered.length
  const prevTotal = previous.length

  // Helper: count leads in a stage/status
  const inStage = (arr, stage) => arr.filter(l =>
    (l.stage || '').toLowerCase() === stage.toLowerCase() ||
    (l.status || '').toLowerCase() === stage.toLowerCase()
  ).length

  const soldLeads = filtered.filter(l =>
    ['sold', 'closed_won', 'closed won', 'won'].includes((l.stage || l.status || '').toLowerCase())
  )
  const prevSold = previous.filter(l =>
    ['sold', 'closed_won', 'closed won', 'won'].includes((l.stage || l.status || '').toLowerCase())
  )

  const contactedLeads = filtered.filter(l =>
    !['new_lead', 'new'].includes((l.stage || l.status || '').toLowerCase())
  )

  const engagedLeads = filtered.filter(l =>
    ['engaged', 'qualified', 'proposal', 'sold', 'closed_won'].includes((l.stage || l.status || '').toLowerCase())
  )

  const qualifiedLeads = filtered.filter(l =>
    ['qualified', 'proposal', 'sold', 'closed_won'].includes((l.stage || l.status || '').toLowerCase())
  )

  const proposalLeads = filtered.filter(l =>
    ['proposal', 'sold', 'closed_won'].includes((l.stage || l.status || '').toLowerCase())
  )

  // Revenue calculations
  const getRevenue = (arr) => arr.reduce((s, l) => s + (Number(l.value) || Number(l.premium) || 0), 0)
  const totalRev = getRevenue(soldLeads)
  const prevRev = getRevenue(prevSold)
  const avgPrem = soldLeads.length > 0 ? totalRev / soldLeads.length : 0

  // --- Calculate each metric ---

  // Activity
  results.speedToLead = buildResult('speedToLead', 0, 0) // Needs activity timestamps
  results.avgResponseTime = buildResult('avgResponseTime', 0, 0)
  results.overdueRate = buildResult('overdueRate',
    total > 0 ? (filtered.filter(l => (l.tags || []).some(t => /overdue/i.test(t))).length / total * 100) : 0,
    prevTotal > 0 ? (previous.filter(l => (l.tags || []).some(t => /overdue/i.test(t))).length / prevTotal * 100) : 0
  )
  results.dailyCalls = buildResult('dailyCalls', 0, 0) // Needs call log data
  results.talkTime = buildResult('talkTime', 0, 0)
  results.leadsWorkedToday = buildResult('leadsWorkedToday', 0, 0)
  results.attemptsToContact = buildResult('attemptsToContact', 0, 0)
  results.dailyActivityScore = buildResult('dailyActivityScore', 0, 0)

  // Pipeline Health
  const contactRateVal = total > 0 ? (contactedLeads.length / total * 100) : 0
  const prevContactRate = prevTotal > 0 ? (previous.filter(l => !['new_lead', 'new'].includes((l.stage || l.status || '').toLowerCase())).length / prevTotal * 100) : 0
  results.contactRate = buildResult('contactRate', contactRateVal, prevContactRate)

  const engagementRateVal = contactedLeads.length > 0 ? (engagedLeads.length / total * 100) : 0
  results.engagementRate = buildResult('engagementRate', engagementRateVal, 0)

  const qualRateVal = engagedLeads.length > 0 ? (qualifiedLeads.length / engagedLeads.length * 100) : 0
  results.qualificationRate = buildResult('qualificationRate', qualRateVal, 0)

  results.pipelineVelocity = buildResult('pipelineVelocity', 0, 0) // Needs timestamps
  results.funnelDropOff = buildResult('funnelDropOff', 0, 0)

  // Stage distribution (special — value is object)
  results.stageDistribution = {
    ...METRIC_DEFINITIONS.stageDistribution,
    value: {
      new_lead: inStage(filtered, 'new_lead') + inStage(filtered, 'new'),
      contact: inStage(filtered, 'contact'),
      engaged: inStage(filtered, 'engaged'),
      qualified: inStage(filtered, 'qualified'),
      proposal: inStage(filtered, 'proposal'),
      sold: soldLeads.length,
    },
    trend: 'flat',
    color: 'green',
  }

  // Revenue
  const closeRateVal = total > 0 ? (soldLeads.length / total * 100) : 0
  const prevCloseRate = prevTotal > 0 ? (prevSold.length / prevTotal * 100) : 0
  results.closeRate = buildResult('closeRate', closeRateVal, prevCloseRate)

  const appToClose = proposalLeads.length > 0 ? (soldLeads.length / proposalLeads.length * 100) : 0
  results.appToCloseRate = buildResult('appToCloseRate', appToClose, 0)

  results.avgPremium = buildResult('avgPremium', avgPrem, 0)
  results.totalRevenue = buildResult('totalRevenue', totalRev, prevRev)
  results.revenueForecast = buildResult('revenueForecast',
    (filtered.length - soldLeads.length) * (closeRateVal / 100) * avgPrem * 12, 0
  )

  // Efficiency
  results.approvalRate = buildResult('approvalRate', 0, 0) // Needs Pipeline 2 data
  results.placementRate = buildResult('placementRate', 0, 0)
  results.avgUWTime = buildResult('avgUWTime', 0, 0)
  results.requirementsRate = buildResult('requirementsRate', 0, 0)
  results.leadSourceROI = buildResult('leadSourceROI', 0, 0)

  // Persistency
  results.persistencyRate = buildResult('persistencyRate', 0, 0) // Needs Pipeline 6 data
  results.dangerZoneSurvival = buildResult('dangerZoneSurvival', 0, 0)
  results.exceptionRate = buildResult('exceptionRate', 0, 0)
  results.saveRate = buildResult('saveRate', 0, 0)
  results.chargebackRisk = buildResult('chargebackRisk', 0, 0)

  // Client
  results.recaptureRate = buildResult('recaptureRate', 0, 0)
  results.zombieRate = buildResult('zombieRate', 0, 0)
  results.winBackRevenue = buildResult('winBackRevenue', 0, 0)
  results.nurtureResponseRate = buildResult('nurtureResponseRate', 0, 0)

  // Automation
  results.automationTriggerCount = buildResult('automationTriggerCount', 0, 0)
  results.automationSuccessRate = buildResult('automationSuccessRate', 0, 0)
  results.timeSavedByAutomation = buildResult('timeSavedByAutomation', 0, 0)

  // Manager
  results.teamCloseRate = buildResult('teamCloseRate', closeRateVal, prevCloseRate)
  results.managerAlerts = buildResult('managerAlerts', 0, 0)
  results.agentRanking = buildResult('agentRanking', 0, 0)

  return results
}

function buildResult(metricId, value, previousValue) {
  const def = METRIC_DEFINITIONS[metricId]
  if (!def) return { value, trend: 'flat', color: 'gray' }
  const rounded = typeof value === 'number' ? Math.round(value * 100) / 100 : value
  return {
    ...def,
    value: rounded,
    previousValue: previousValue != null ? Math.round(previousValue * 100) / 100 : null,
    trend: calcTrend(value, previousValue),
    color: getThresholdColor(metricId, value),
  }
}

// Get metrics by category
export function getMetricsByCategory(metrics) {
  const grouped = {}
  for (const [key, val] of Object.entries(metrics)) {
    const cat = val.category || METRIC_DEFINITIONS[key]?.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ ...val, id: key })
  }
  return grouped
}

// Format metric value for display
export function formatMetricValue(value, unit) {
  if (value === null || value === undefined) return '—'
  // Handle object values (e.g. stageDistribution)
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: ${v}`)
      .join(', ') || '—'
  }
  switch (unit) {
    case '$': return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    case '%': return `${value}%`
    case 'min': return `${value}m`
    case 'hrs': return `${value}h`
    case 'days': return `${value}d`
    case 'x': return `${value}x`
    default: return String(value)
  }
}

// Default scorecard metrics (top bar)
export const DEFAULT_SCORECARD_METRICS = [
  'closeRate', 'totalRevenue', 'contactRate', 'pipelineVelocity', 'persistencyRate', 'overdueRate'
]

// Default toggle states (all Watch by default)
export function getDefaultToggles() {
  const toggles = {}
  for (const id of Object.keys(METRIC_DEFINITIONS)) {
    toggles[id] = 'watch' // off | watch | active
  }
  return toggles
}
