import { useState } from 'react'

const dotColors = {
  active: { background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' },
  idle: { background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.3)' },
  waiting: { background: '#6b7280', boxShadow: 'none' },
}

export default function PipelineBanner({ pipelineState }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const stages = pipelineState?.stages || []
  const context = pipelineState?.context || ''
  const startTime = pipelineState?.startTime || null
  const initiator = pipelineState?.initiator || ''

  const formatTime = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })
    } catch { return '' }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        marginBottom: '20px',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '12px 28px',
      }}>
        {stages.map((stage, i) => {
          const dot = dotColors[stage?.status] || dotColors.waiting
          const taskText = stage?.status === 'active' ? (stage?.task || 'Active') : (stage?.status === 'idle' ? 'Idle' : 'Waiting')
          const taskColor = stage?.status === 'active' ? '#4ade80' : 'rgba(255,255,255,0.4)'
          return (
            <div key={stage?.agent || i} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', ...dot }} />
                <span>{stage?.name || stage?.agent}:</span>
                <span style={{ color: taskColor, fontSize: stage?.status === 'active' ? '13px' : '11px' }}>{taskText}</span>
              </div>
              {i < stages.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>→</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Expand hint */}
      <div style={{
        fontSize: '9px',
        color: 'rgba(255,255,255,0.2)',
        textAlign: 'center',
        paddingBottom: '6px',
        letterSpacing: '1px',
      }}>CLICK TO EXPAND / COLLAPSE</div>

      {/* Detail section */}
      <div style={{
        maxHeight: expanded ? '200px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, padding 0.3s ease',
        padding: expanded ? '14px 28px' : '0 28px',
        borderTop: expanded ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}>
        {context && (
          <div style={{ fontSize: '11px', lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>
            {context}
          </div>
        )}
        {startTime && initiator && (
          <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
            Pipeline started {formatTime(startTime)} CT — initiated by {initiator}
          </div>
        )}
      </div>
    </div>
  )
}
