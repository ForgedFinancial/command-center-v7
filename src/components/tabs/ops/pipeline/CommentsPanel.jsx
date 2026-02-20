import { useState } from 'react'
import AgentBadge from '../shared/AgentBadge'
import { ENDPOINTS, getSyncHeaders } from '../../../../config/api'

export default function CommentsPanel({ task, onTaskUpdate }) {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const comments = task.comments || []

  const handleSubmit = async () => {
    if (!draft.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(ENDPOINTS.opsPipelineTaskComments(task.id), {
        method: 'POST', headers: getSyncHeaders(),
        body: JSON.stringify({ agentId: 'dano', message: draft.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        onTaskUpdate(updated)
        setDraft('')
      }
    } catch (e) { /* silent */ }
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {comments.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
          No comments yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflow: 'auto' }}>
          {comments.map((c, i) => (
            <div key={i} style={{
              padding: '8px 10px', borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
            }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                <AgentBadge agent={c.agentId} />
                <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {c.message}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Add a comment…"
          maxLength={2000}
          style={{
            flex: 1, padding: '8px 10px', fontSize: '12px',
            backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border)', borderRadius: '6px', outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || submitting}
          style={{
            padding: '8px 14px', fontSize: '12px', fontWeight: 600,
            backgroundColor: draft.trim() ? 'var(--theme-accent)' : 'rgba(255,255,255,0.05)',
            color: draft.trim() ? '#fff' : 'var(--theme-text-secondary)',
            border: 'none', borderRadius: '6px', cursor: draft.trim() ? 'pointer' : 'default',
          }}
        >
          {submitting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
