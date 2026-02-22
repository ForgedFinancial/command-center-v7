import TimeAgo from '../shared/TimeAgo'
import { STAGE_CONFIG, PRIORITY_COLORS, resolveWorkstream, WORKSTREAM_TYPES } from './pipelineConstants'

const blockerKeyframes = `
@keyframes blockerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.2); }
}
`

export default function TaskCard({ task, onClick }) {
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal
  const commentCount = (task.comments || []).length
  const reviewCount = (task.reviews || []).length
  const isDone = STAGE_CONFIG[task.stage]?.muted
  const workstream = resolveWorkstream(task)
  const workstreamInfo = workstream ? WORKSTREAM_TYPES[workstream] : null

  return (
    <>
      <style>{blockerKeyframes}</style>
      <div
        onClick={onClick}
        style={{
          padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
          backgroundColor: '#0E1320',
          border: '1px solid rgba(148,163,184,0.24)',
          transition: 'transform 140ms cubic-bezier(0.2,0.8,0.2,1), border-color 140ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 140ms cubic-bezier(0.2,0.8,0.2,1)',
          animation: task.blocked ? 'blockerPulse 2s ease-in-out infinite' : 'none',
          opacity: isDone ? 0.7 : 1,
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = 'rgba(0,212,255,0.55)'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.38)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'rgba(148,163,184,0.24)'
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', lineHeight: 1.35, minWidth: 0, flex: 1 }}>
            {task.name}
          </div>
          {workstreamInfo && (
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              padding: '2px 8px',
              borderRadius: '999px',
              border: `1px solid ${workstreamInfo.border}`,
              backgroundColor: workstreamInfo.fill,
              color: workstreamInfo.color,
              lineHeight: 1.2,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {workstreamInfo.icon} {workstreamInfo.label}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
            backgroundColor: priorityColor + '20', color: priorityColor,
          }}>
            {(task.priority || 'normal').toUpperCase()}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClick?.() }}
            style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '999px',
              border: '1px solid rgba(0,212,255,0.35)',
              background: 'rgba(0,212,255,0.12)',
              color: '#B9F3FF',
              cursor: 'pointer',
            }}
          >
            View Report
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <TimeAgo date={task.stageEnteredAt} showColor />
          {task.blocked && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: '4px',
            }}>BLOCKED</span>
          )}
        </div>

        {(commentCount > 0 || (task.stage === 'REVIEW' && reviewCount > 0)) && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            {commentCount > 0 && (
              <span style={{ fontSize: '10px', color: '#94A3B8' }}>💬 {commentCount}</span>
            )}
            {task.stage === 'REVIEW' && (
              <span style={{ fontSize: '10px', color: '#94A3B8' }}>👁️ {reviewCount}/4</span>
            )}
          </div>
        )}
      </div>
    </>
  )
}
