// ========================================
// Disposition Tags — Stackable lead tags
// These follow leads around and can be added/removed
// ========================================

export const DISPOSITION_TAGS = [
  { id: 'new_lead', label: 'New Lead', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { id: 'called', label: 'Called', color: '#3b82f6', bg: 'rgba(59,130,246,0.18)' },
  { id: 'follow_up', label: 'Follow-Up', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'appt_booked', label: 'Appointment Booked', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { id: 'appt_no_show', label: 'Appointment - No Show', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'pitched', label: 'Pitched - Not Sold', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  { id: 'sold', label: 'Sold', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { id: 'not_interested', label: 'Not Interested', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { id: 'bad_number', label: 'Bad Number', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
  { id: 'nurture', label: 'Nurture', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  { id: 'req_replacement', label: 'Request Replacement', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'replace_submitted', label: 'Lead Replacement Submitted', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { id: 'dnc', label: 'Add To DNC', color: '#991b1b', bg: 'rgba(153,27,27,0.15)' },
  { id: 'approved_applied', label: 'Approved As Applied', color: '#16a34a', bg: 'rgba(22,163,74,0.20)' },
]

export function getTagById(id) {
  return DISPOSITION_TAGS.find(t => t.id === id)
}

export function getTagByLabel(label) {
  return DISPOSITION_TAGS.find(t => t.label.toLowerCase() === label.toLowerCase())
}
