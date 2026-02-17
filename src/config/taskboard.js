// ========================================
// Task Board Constants
// Stage config, priorities, document categories
// ========================================

export const TASK_STAGES = {
  SUGGESTIONS: 'suggestions',
  NEW_TASK: 'new_task',
  BACKLOG: 'backlog',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
}

export const STAGE_ORDER = [
  'suggestions', 'new_task', 'backlog', 'in_progress', 'review', 'completed'
]

export const STAGE_CONFIG = {
  suggestions:  { label: 'Suggestions',  color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)', who: 'Clawd proposes' },
  new_task:     { label: 'New Task',     color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)',   who: 'Boss creates' },
  backlog:      { label: 'Backlog',      color: '#9ca3af', borderColor: 'rgba(107,114,128,0.3)', who: 'Clawd classifies' },
  in_progress:  { label: 'In Progress',  color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)',  who: 'Agent builds' },
  review:       { label: 'Review',       color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)',  who: 'Boss reviews' },
  completed:    { label: 'Completed',    color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)',  who: 'Done + filed' },
}

export const PRIORITIES = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }

export const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  low:    { label: 'Low',    color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
}

export const DOC_CATEGORIES = { REPORT: 'report', BRIEF: 'brief', RESEARCH: 'research', ATTACHMENT: 'attachment' }

export const DOC_CATEGORY_CONFIG = {
  report:     { label: 'Report',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  brief:      { label: 'Brief',      color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  research:   { label: 'Research',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  attachment: { label: 'Attachment', color: '#9ca3af', bg: 'rgba(107,114,128,0.12)' },
}

export const TASK_BOARD_VIEWS = { BOARD: 'board', PROJECTS: 'projects', TASKS: 'tasks', DOCUMENTS: 'documents' }

export const AGENT_COLORS = { mason: '#a855f7', sentinel: '#3b82f6', architect: '#f59e0b', clawd: '#4ade80' }
