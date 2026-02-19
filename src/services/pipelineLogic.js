// ========================================
// Pipeline Logic — Central Module
// Phase 2: Core pipeline logic for all 7 pipelines
// ========================================

// ========================================
// Stage Transition Validation
// ========================================

/**
 * Validate if a lead can move to a target stage
 * @param {Object} lead - The lead object
 * @param {Object} targetStage - The target stage (from API, includes required_fields)
 * @returns {{ valid: boolean, missingFields: Array<{key: string, label: string, type: string}> }}
 */
export function validateTransition(lead, targetStage) {
  if (!targetStage) return { valid: false, missingFields: [], error: 'Invalid target stage' }

  const requiredFields = parseRequiredFields(targetStage.required_fields || targetStage.requiredFields)
  if (!requiredFields || requiredFields.length === 0) return { valid: true, missingFields: [] }

  const missingFields = requiredFields.filter(field => {
    const val = lead[field.key] || lead[toSnakeCase(field.key)]
    return val === undefined || val === null || val === ''
  })

  return { valid: missingFields.length === 0, missingFields }
}

/**
 * Parse required_fields from stage config (stored as JSON string or array)
 */
export function parseRequiredFields(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ========================================
// Auto-Timer Configuration
// ========================================

/**
 * Get timer config for a stage
 * Timer configs come from the stages table or timer_configs table
 */
export function getTimerConfig(stage) {
  if (!stage) return null
  const timerDays = stage.timer_days || stage.timerDays
  const timerAction = stage.timer_action || stage.timerAction
  if (!timerDays) return null
  return {
    days: Number(timerDays),
    action: timerAction || 'auto_move', // auto_move | notify | sms
    targetStageId: stage.timer_target_stage_id || stage.timerTargetStageId,
    targetPipelineId: stage.timer_target_pipeline_id || stage.timerTargetPipelineId,
    smsTemplate: stage.timer_sms_template || stage.timerSmsTemplate,
  }
}

/**
 * Check if a lead is overdue based on stage timer
 * @param {Object} lead - Lead with stage_entered_at or stageEnteredAt
 * @param {Object} stage - Stage with timer config
 * @returns {{ overdue: boolean, daysInStage: number, daysRemaining: number }}
 */
export function checkOverdue(lead, stage) {
  const timer = getTimerConfig(stage)
  if (!timer) return { overdue: false, daysInStage: 0, daysRemaining: Infinity }

  const enteredAt = lead.stage_entered_at || lead.stageEnteredAt || lead.updated_at || lead.createdAt
  if (!enteredAt) return { overdue: false, daysInStage: 0, daysRemaining: timer.days }

  const msInStage = Date.now() - new Date(enteredAt).getTime()
  const daysInStage = msInStage / (1000 * 60 * 60 * 24)
  const daysRemaining = Math.max(0, timer.days - daysInStage)

  return {
    overdue: daysInStage >= timer.days,
    daysInStage: Math.floor(daysInStage),
    daysRemaining: Math.ceil(daysRemaining),
    timerDays: timer.days,
  }
}

// ========================================
// Cross-Pipeline Transfer Logic
// ========================================

/**
 * Determine the appropriate cross-pipeline transition
 * Returns transition details based on pipeline slug and context
 */
export function getCrossPipelineTransitions(pipelineSlug, stageSlug, lead) {
  const transitions = []

  switch (pipelineSlug) {
    case 'lead-management':
    case 'lm':
      if (stageSlug === 'closed-won' || stageSlug === 'closed_won') {
        transitions.push({
          label: 'Submit to Approval',
          targetPipeline: 'approval-process',
          targetStage: 'submitted',
          auto: true,
          reason: 'Closed Won → AP Submitted',
        })
      }
      // Any stage can go to Nurture
      transitions.push({
        label: 'Move to Nurture',
        targetPipeline: 'nurture',
        targetStage: 'nurture-start',
        auto: false,
        reason: 'Lead went cold',
      })
      break

    case 'approval-process':
    case 'ap':
      transitions.push({
        label: 'Approved → Policy Lifecycle',
        targetPipeline: 'policy-lifecycle',
        targetStage: 'approved',
        auto: false,
        reason: 'Carrier approved',
      })
      transitions.push({
        label: 'Declined → Rewrite',
        targetPipeline: 'rewrite-rejected',
        targetStage: 'rewrite',
        auto: false,
        reason: 'Carrier declined',
      })
      break

    case 'policy-lifecycle':
    case 'pl':
      if (stageSlug === 'in-force' || stageSlug === 'in_force') {
        transitions.push({
          label: 'In Force → Active Month 1',
          targetPipeline: 'active-inforce',
          targetStage: 'month-1',
          auto: true,
          reason: 'Policy in force',
        })
      }
      // Draft fail
      transitions.push({
        label: 'Draft Failed → Retention Exception',
        targetPipeline: 'retention-exceptions',
        targetStage: 'new-exception',
        auto: false,
        reason: 'Draft failed',
      })
      break

    case 'retention-exceptions':
    case 're':
      if (stageSlug === 'resolved') {
        transitions.push({
          label: 'Resolved → Return to Active',
          targetPipeline: 'active-inforce',
          targetStage: null, // Calculated based on in_force_date
          auto: true,
          reason: 'Exception resolved',
          calculateStage: true,
        })
      }
      if (stageSlug === 'terminated') {
        transitions.push({
          label: 'Terminated → Rewrite',
          targetPipeline: 'rewrite-rejected',
          targetStage: 'rewrite',
          auto: true,
          reason: 'Policy terminated',
        })
      }
      break

    case 'rewrite-rejected':
    case 'rw':
      transitions.push({
        label: 'Viable Rewrite → Lead Management',
        targetPipeline: 'lead-management',
        targetStage: 'application-process',
        auto: false,
        reason: 'Rewrite viable',
      })
      break

    case 'active-inforce':
    case 'active':
      // Negative response or cancel
      transitions.push({
        label: 'Issue Detected → Retention Exception',
        targetPipeline: 'retention-exceptions',
        targetStage: 'new-exception',
        auto: false,
        reason: 'Client issue detected',
      })
      break

    case 'nurture':
      transitions.push({
        label: 'Positive Reply → Lead Management',
        targetPipeline: 'lead-management',
        targetStage: 'engaged-interest',
        auto: false,
        reason: 'Nurture re-engagement',
      })
      transitions.push({
        label: 'Exhausted → Recycle',
        targetPipeline: 'rewrite-rejected',
        targetStage: 'recycle',
        auto: false,
        reason: 'Nurture exhausted (180 days)',
      })
      break
  }

  return transitions
}

// ========================================
// Tag Management
// ========================================

/**
 * Get tags to apply when entering a stage
 */
export function getStageEntryTags(stage) {
  if (!stage) return []
  const tagOnEntry = stage.tag_on_entry || stage.tagOnEntry
  if (!tagOnEntry) return []
  if (Array.isArray(tagOnEntry)) return tagOnEntry
  try {
    return JSON.parse(tagOnEntry)
  } catch {
    return [tagOnEntry]
  }
}

/**
 * Apply stage entry tags to a lead's existing tags
 * Replaces previous stage tags, preserves escalation tags
 */
export function applyStageEntryTags(existingTags, newStageTags) {
  const existing = Array.isArray(existingTags) ? existingTags : parseTags(existingTags)

  // Escalation tags are preserved (not replaced)
  const escalationTags = existing.filter(t => isEscalationTag(t))
  // Non-stage, non-escalation tags are preserved
  const otherTags = existing.filter(t => !isStageTag(t) && !isEscalationTag(t))

  return [...new Set([...otherTags, ...escalationTags, ...newStageTags])]
}

const ESCALATION_TAGS = [
  'Overdue-24h', 'Overdue-48h', 'Overdue-72h',
  'Client Risk', 'URGENT', 'Lapse Risk', 'Unreachable',
  'REPLY NEEDED', 'ZOMBIE',
]

const STAGE_TAGS = [
  'New Lead', 'Contact', 'Engaged Interest', 'Qualified Interest',
  'Application Process', 'Closed', 'Submitted', 'UW & Requirements',
  'Approved', 'Draft Cleared', 'Delivered', 'In Force',
  'New Exception', 'Active Recovery', 'Resolved', 'Terminated',
  'Rewrite', 'Recycle', 'Uninsurable',
  'Month 1', 'Month 3', 'Month 6', 'Month 12', 'Client Contact Needed',
  'Nurture',
]

export function isEscalationTag(tag) {
  return ESCALATION_TAGS.includes(tag)
}

export function isStageTag(tag) {
  return STAGE_TAGS.includes(tag)
}

export function parseTags(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try { return JSON.parse(tags) } catch { return [] }
}

/**
 * Remove escalation tags (on resolution)
 */
export function removeEscalationTags(tags) {
  const existing = parseTags(tags)
  return existing.filter(t => !isEscalationTag(t))
}

// ========================================
// ZOMBIE Detection (Pipeline 5 - Recycle)
// ========================================

/**
 * Check if a lead in Recycle stage has client-initiated contact (ZOMBIE)
 * @param {Object} lead - Lead object
 * @param {Array} activities - Recent activity log entries
 * @returns {{ isZombie: boolean }}
 */
export function detectZombie(lead, activities = []) {
  if (!activities || activities.length === 0) return { isZombie: false }

  // Look for client-initiated contact (inbound calls, inbound SMS, client replies)
  const clientActivity = activities.find(a => {
    const type = a.type || a.activity_type
    const direction = a.direction || a.metadata?.direction
    return (
      (type === 'sms_received' || type === 'call_received' || type === 'reply') ||
      (direction === 'inbound')
    )
  })

  return { isZombie: !!clientActivity }
}

// ========================================
// P6 Active/Inforce — Month Stage Calculation
// ========================================

/**
 * Calculate which month stage a client should be in based on in_force_date
 * Used for P6 return after exception
 */
export function calculateActiveStage(inForceDate, activeStages) {
  if (!inForceDate || !activeStages?.length) return activeStages?.[0] || null

  const monthsSince = Math.floor(
    (Date.now() - new Date(inForceDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  )

  // Map months to stage thresholds
  // Month 1: 0-1, Month 3: 1-3, Month 6: 3-6, Month 12: 6-12, then cycle
  const cycleMonths = monthsSince % 12 // Annual cycle
  if (cycleMonths < 1) return findStageBySlug(activeStages, 'month-1')
  if (cycleMonths < 3) return findStageBySlug(activeStages, 'month-3')
  if (cycleMonths < 6) return findStageBySlug(activeStages, 'month-6')
  return findStageBySlug(activeStages, 'month-12')
}

function findStageBySlug(stages, slug) {
  return stages.find(s => {
    const name = (s.slug || s.name || '').toLowerCase().replace(/\s+/g, '-')
    return name.includes(slug)
  }) || stages[0]
}

// ========================================
// Nurture Drip Schedule
// ========================================

export const NURTURE_DRIP_SCHEDULE = [
  { day: 7, smsNumber: 1, template: 'nurture_sms_1' },
  { day: 45, smsNumber: 2, template: 'nurture_sms_2' },
  { day: 60, smsNumber: 3, template: 'nurture_sms_3' },
  { day: 90, smsNumber: 4, template: 'nurture_sms_4' },
  { day: 135, smsNumber: 5, template: 'nurture_sms_5' },
  { day: 180, smsNumber: 6, template: 'nurture_sms_6' },
]

/**
 * Get next drip SMS for a nurture lead
 */
export function getNurtureDripStatus(lead) {
  const enteredAt = lead.stage_entered_at || lead.stageEnteredAt || lead.createdAt
  if (!enteredAt) return { nextSms: NURTURE_DRIP_SCHEDULE[0], daysInNurture: 0, completed: false }

  const daysInNurture = Math.floor((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60 * 24))
  const sentCount = lead.nurture_sms_sent || 0
  const nextSms = NURTURE_DRIP_SCHEDULE.find(s => s.day > daysInNurture && s.smsNumber > sentCount)

  return {
    daysInNurture,
    nextSms: nextSms || null,
    completed: daysInNurture >= 180 && sentCount >= 6,
    sentCount,
    schedule: NURTURE_DRIP_SCHEDULE,
  }
}

// ========================================
// Recycle Timer Schedule (P5)
// ========================================

export const RECYCLE_SCHEDULE = [
  { day: 1, action: 'sms_agent', label: 'Day 1: Re-contact reminder' },
  { day: 15, action: 'sms_agent', label: 'Day 15: Second re-contact' },
  { day: 30, action: 'sms_agent', label: 'Day 30: Final attempt' },
  { day: 45, action: 'auto_move', label: 'Day 45: Move to Uninsurable', targetStage: 'uninsurable' },
]

/**
 * Get recycle status for a lead in P5 Recycle
 */
export function getRecycleStatus(lead) {
  const enteredAt = lead.stage_entered_at || lead.stageEnteredAt || lead.createdAt
  if (!enteredAt) return { daysInRecycle: 0, nextAction: RECYCLE_SCHEDULE[0] }

  const daysInRecycle = Math.floor((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60 * 24))
  const nextAction = RECYCLE_SCHEDULE.find(s => s.day > daysInRecycle)

  return { daysInRecycle, nextAction, schedule: RECYCLE_SCHEDULE }
}

// ========================================
// Escalation Tags (P4 Active Recovery)
// ========================================

export const ESCALATION_SCHEDULE = [
  { hours: 24, tag: 'Overdue-24h' },
  { hours: 48, tag: 'Overdue-48h' },
  { hours: 72, tag: 'Overdue-72h', managerAlert: true },
  { hours: 168, tag: 'Client Risk' }, // 7 days
  { hours: 336, tag: 'URGENT', managerAlert: true }, // 14 days
  { hours: 720, action: 'auto_move', targetStage: 'terminated' }, // 30 days
]

/**
 * Get applicable escalation tags for a lead in Active Recovery
 */
export function getEscalationStatus(lead) {
  const enteredAt = lead.stage_entered_at || lead.stageEnteredAt || lead.createdAt
  if (!enteredAt) return { hoursInStage: 0, applicableTags: [], shouldTerminate: false }

  const hoursInStage = (Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60)
  const applicableTags = ESCALATION_SCHEDULE
    .filter(e => e.tag && hoursInStage >= e.hours)
    .map(e => e.tag)

  const shouldTerminate = hoursInStage >= 720 // 30 days

  return { hoursInStage: Math.floor(hoursInStage), applicableTags, shouldTerminate }
}

// ========================================
// Pipeline Transition Builder
// ========================================

/**
 * Build a complete transition payload for API
 */
export function buildTransitionPayload(lead, fromStage, toStage, toPipelineId, reason) {
  const fromPipelineId = lead.pipeline_id || lead.pipelineId

  return {
    lead_id: lead.id,
    from_pipeline_id: fromPipelineId,
    from_stage_id: fromStage?.id || lead.stage_id || lead.stageId,
    to_pipeline_id: toPipelineId || fromPipelineId,
    to_stage_id: toStage.id,
    reason: reason || `Stage transition: ${fromStage?.name || 'unknown'} → ${toStage.name}`,
    tags: getStageEntryTags(toStage),
    timestamp: new Date().toISOString(),
  }
}

// ========================================
// Utilities
// ========================================

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

/**
 * Format days remaining as human-readable
 */
export function formatTimeRemaining(days) {
  if (days <= 0) return 'Overdue'
  if (days === 1) return '1 day left'
  if (days < 7) return `${days} days left`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week left' : `${weeks} weeks left`
}

/**
 * Get urgency color based on days remaining
 */
export function getUrgencyColor(daysRemaining, totalDays) {
  if (daysRemaining <= 0) return '#ef4444' // red
  const ratio = daysRemaining / totalDays
  if (ratio <= 0.25) return '#f97316' // orange
  if (ratio <= 0.5) return '#f59e0b' // yellow
  return '#4ade80' // green
}
