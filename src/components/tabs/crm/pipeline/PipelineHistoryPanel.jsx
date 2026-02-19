import { useState, useEffect } from 'react'
import crmClient from '../../../../api/crmClient'

/**
 * Timeline view of all pipeline transitions for a lead
 */
export default function PipelineHistoryPanel({ leadId, compact = false }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leadId) return
    setLoading(true)
    crmClient.getHistory(leadId)
      .then(res => {
        const items = res.history || res.data || res || []
        setHistory(Array.isArray(items) ? items : [])
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [leadId])

  if (loading) {
    return (
      <div style={{ padding: compact ? '8px' : '16px', color: 'var(--theme-text-secondary)', fontSize: '12px' }}>
        Loading history...
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: compact ? '8px' : '16px', color: 'var(--theme-text-secondary)', fontSize: '12px' }}>
        No transition history yet
      </div>
    )
  }

  return (
    <div style={{ padding: compact ? '0' : '8px 0' }}>
      {!compact && (
        <div style={{
          fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)',
          marginBottom: '12px',
        }}>
          📜 Pipeline History
        </div>
      )}
      <div style={{ position: 'relative' }}>
        {history.map((entry, idx) => {
          const isCross = entry.from_pipeline_id !== entry.to_pipeline_id
          const date = entry.created_at || entry.createdAt || entry.timestamp
          return (
            <div key={entry.id || idx} style={{
              display: 'flex', gap: '12px', marginBottom: idx < history.length - 1 ? '0' : '0',
              position: 'relative',
            }}>
              {/* Timeline line */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: isCross ? '#a855f7' : 'var(--theme-accent)',
                  border: '2px solid var(--theme-surface)',
                }} />
                {idx < history.length - 1 && (
                  <div style={{
                    width: '2px', flex: 1, minHeight: '24px',
                    background: 'var(--theme-border)',
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>
                  {isCross && <span style={{ color: '#a855f7', marginRight: '4px' }}>🔄</span>}
                  {entry.from_stage_name || entry.fromStageName || '—'}
                  <span style={{ color: 'var(--theme-text-secondary)', margin: '0 4px' }}>→</span>
                  <span style={{ fontWeight: 600 }}>{entry.to_stage_name || entry.toStageName || '—'}</span>
                </div>
                {isCross && (
                  <div style={{ fontSize: '10px', color: '#a855f7', marginTop: '2px' }}>
                    {entry.from_pipeline_name || 'Pipeline'} → {entry.to_pipeline_name || 'Pipeline'}
                  </div>
                )}
                {entry.reason && (
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
                    {entry.reason}
                  </div>
                )}
                {date && (
                  <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
                    {formatHistoryDate(date)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatHistoryDate(dateStr) {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  } catch {
    return dateStr
  }
}
