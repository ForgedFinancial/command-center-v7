// ========================================
// Smart Call Queue — Phase 3C
// Priority-scored lead queue with "Next Lead" functionality
// Optional/toggleable as per Boss requirement
// ========================================
import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'
import { usePhone } from '../../../../context/PhoneContext'

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Unknown'
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function calculatePriority(lead) {
  let score = 0
  const now = Date.now()
  
  // New leads (< 5 min old): +50 points
  if (lead.created_at && (now - new Date(lead.created_at).getTime()) < 300000) {
    score += 50
  }
  
  // Scheduled callbacks (within window): +40 points
  if (lead.callback_scheduled && lead.callback_time) {
    const callbackTime = new Date(lead.callback_time).getTime()
    const windowStart = callbackTime - 900000 // 15 min before
    const windowEnd = callbackTime + 900000   // 15 min after
    if (now >= windowStart && now <= windowEnd) {
      score += 40
    }
  }
  
  // Follow-ups overdue: +30 points
  if (lead.followup_due && new Date(lead.followup_due).getTime() < now) {
    score += 30
  }
  
  // Best time match (simplified): +20 points for business hours
  const hour = new Date().getHours()
  if (hour >= 9 && hour <= 17) {
    score += 20
  }
  
  // No previous attempt: +10 points
  if (!lead.last_called || lead.call_attempts === 0) {
    score += 10
  }
  
  return Math.max(score, 1) // Minimum score of 1
}

function getPriorityBadgeColor(score) {
  if (score >= 80) return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Urgent' }
  if (score >= 60) return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'High' }
  if (score >= 40) return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Med' }
  return { bg: 'rgba(113,113,122,0.15)', color: '#71717a', label: 'Low' }
}

export default function CallQueue({ onLeadSelected }) {
  const { makeCall, makeMultiLineCalls, multiLineMode } = usePhone()
  const [queueEnabled, setQueueEnabled] = useState(() => {
    return localStorage.getItem('forgedos_queue_enabled') === 'true'
  })
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set())

  useEffect(() => {
    localStorage.setItem('forgedos_queue_enabled', queueEnabled.toString())
  }, [queueEnabled])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Empty state — will populate from real CRM pipeline data
      setLeads([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (queueEnabled) {
      fetchLeads()
      const interval = setInterval(fetchLeads, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  }, [queueEnabled, fetchLeads])

  const handleNextLead = useCallback(async () => {
    const nextLead = leads.find(lead => !selectedLeadIds.has(lead.id))
    if (!nextLead) return

    try {
      if (multiLineMode) {
        // Get top 3 unselected leads for multi-line
        const multiLeads = leads
          .filter(lead => !selectedLeadIds.has(lead.id))
          .slice(0, 3)
        await makeMultiLineCalls(multiLeads)
        setSelectedLeadIds(prev => {
          const newSet = new Set(prev)
          multiLeads.forEach(lead => newSet.add(lead.id))
          return newSet
        })
      } else {
        await makeCall(nextLead)
        setSelectedLeadIds(prev => new Set(prev).add(nextLead.id))
      }
      
      if (onLeadSelected) onLeadSelected(nextLead)
    } catch (err) {
      setError(err.message)
    }
  }, [leads, selectedLeadIds, multiLineMode, makeCall, makeMultiLineCalls, onLeadSelected])

  const handleDialLead = useCallback(async (lead) => {
    try {
      await makeCall(lead)
      setSelectedLeadIds(prev => new Set(prev).add(lead.id))
      if (onLeadSelected) onLeadSelected(lead)
    } catch (err) {
      setError(err.message)
    }
  }, [makeCall, onLeadSelected])

  if (!queueEnabled) {
    return (
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#e4e4e7' }}>
          Smart Call Queue
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#71717a', lineHeight: 1.5 }}>
          Automatically prioritizes leads by urgency: new leads, scheduled callbacks, overdue follow-ups, and optimal timing.
        </p>
        <button
          onClick={() => setQueueEnabled(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(74,222,128,0.3)',
            background: 'rgba(74,222,128,0.1)',
            color: '#4ade80',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Enable Smart Queue
        </button>
      </div>
    )
  }

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e4e4e7' }}>
          📋 Smart Call Queue
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchLeads}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#a1a1aa',
              fontSize: '11px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </button>
          <button
            onClick={() => setQueueEnabled(false)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#71717a',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Disable Queue
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444',
          fontSize: '12px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Next Lead Button */}
      {leads.length > 0 && (
        <button
          onClick={handleNextLead}
          disabled={leads.every(lead => selectedLeadIds.has(lead.id))}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '2px solid rgba(74,222,128,0.3)',
            background: 'rgba(74,222,128,0.1)',
            color: '#4ade80',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          📞 Next Lead {multiLineMode ? '(Multi-Line)' : ''}
        </button>
      )}

      {/* Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
        {leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#71717a', fontSize: '12px' }}>
            No leads in queue
          </div>
        ) : (
          leads.map((lead, idx) => {
            const isSelected = selectedLeadIds.has(lead.id)
            const priority = getPriorityBadgeColor(lead.priorityScore)
            
            return (
              <div
                key={lead.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(255,255,255,0.04)',
                  opacity: isSelected ? 0.6 : 1,
                }}
              >
                {/* Lead Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#52525b',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      minWidth: '20px',
                      textAlign: 'center',
                    }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>
                      {lead.name}
                    </span>
                    <div style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: priority.color,
                      background: priority.bg,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}>
                      {priority.label} {lead.priorityScore}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>
                    {formatPhone(lead.phone)} · {lead.state} · {lead.lead_type}
                    {lead.call_attempts > 0 && ` · ${lead.call_attempts} attempts`}
                    {lead.last_called && ` · ${timeAgo(lead.last_called)}`}
                  </div>
                </div>

                {/* Action Button */}
                {!isSelected && (
                  <button
                    onClick={() => handleDialLead(lead)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(59,130,246,0.3)',
                      background: 'rgba(59,130,246,0.1)',
                      color: '#3b82f6',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Call Now
                  </button>
                )}

                {isSelected && (
                  <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>
                    ✓ Called
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}