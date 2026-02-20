import { useState } from 'react'
import { AGENTS } from './pipelineConstants'
import { ENDPOINTS, getSyncHeaders } from '../../../../config/api'

const REVIEWERS = ['clawd', 'soren', 'mason', 'sentinel']

export default function ReviewPanel({ task, onTaskUpdate }) {
  const [submitting, setSubmitting] = useState(null)
  const reviews = task.reviews || []

  const getReview = (agentId) => reviews.find(r => r.agentId === agentId)
  const approvedCount = reviews.filter(r => r.approved).length
  const clawidApproved = reviews.some(r => r.agentId === 'clawd' && r.approved)
  const canMoveToBuilding = clawidApproved && approvedCount >= 2

  const handleReview = async (agentId, approved) => {
    setSubmitting(agentId)
    try {
      const res = await fetch(ENDPOINTS.opsPipelineTaskReviews(task.id), {
        method: 'POST', headers: getSyncHeaders(),
        body: JSON.stringify({ agentId, approved, note: '' }),
      })
      if (res.ok) {
        const updated = await res.json()
        onTaskUpdate(updated)
      }
    } catch (e) { /* silent */ }
    setSubmitting(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', marginBottom: '4px' }}>
        {approvedCount}/{REVIEWERS.length} reviewed
        {canMoveToBuilding && <span style={{ color: '#10b981', fontWeight: 600 }}> — Ready to advance ✓</span>}
        {!clawidApproved && approvedCount > 0 && <span style={{ color: '#f59e0b' }}> — Needs Clawd approval</span>}
      </div>

      {REVIEWERS.map(agentId => {
        const agent = AGENTS[agentId] || { label: agentId, color: '#6b7280', icon: '👤' }
        const review = getReview(agentId)
        return (
          <div key={agentId} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: `1px solid ${review ? (review.approved ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--theme-border, rgba(255,255,255,0.06))'}`,
          }}>
            <span style={{ fontSize: '16px' }}>{agent.icon}</span>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: agent.color }}>{agent.label}</span>

            {review ? (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px',
                backgroundColor: review.approved ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: review.approved ? '#10b981' : '#ef4444',
              }}>
                {review.approved ? '✓ Approved' : '✕ Rejected'}
              </span>
            ) : (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => handleReview(agentId, true)}
                  disabled={submitting === agentId}
                  style={{
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981',
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                  }}
                >✓</button>
                <button
                  onClick={() => handleReview(agentId, false)}
                  disabled={submitting === agentId}
                  style={{
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                  }}
                >✕</button>
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}
