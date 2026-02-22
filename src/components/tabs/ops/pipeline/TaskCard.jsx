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
          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
          backgroundColor: 'var(--theme-bg, #0a0a0f)',
          border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
          transition: 'all 0.2s ease',
          animation: task.blocked ? 'blockerPulse 2s ease-in-out infinite' : 'none',
          opacity: isDone ? 0.7 : 1,
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--theme-accent, #8b5cf6)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'var(--theme-border, rgba(255,255,255,0.06))'
          e.currentTarget.style.transform = 'none'
        }}
      >
        {/* Title + Workstream */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', lineHeight: 1.3, minWidth: 0, flex: 1 }}>
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

        {/* Priority row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
            backgroundColor: priorityColor + '20', color: priorityColor,
          }}>
            {(task.priority || 'normal').toUpperCase()}
          </span>
        </div>

        {/* Time row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <TimeAgo date={task.stageEnteredAt} showColor />
          {task.blocked && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: '4px',
            }}>BLOCKED</span>
          )}
        </div>

        {/* Badges row */}
        {(commentCount > 0 || (task.stage === 'REVIEW' && reviewCount > 0)) && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            {commentCount > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>💬 {commentCount}</span>
            )}
            {task.stage === 'REVIEW' && (
              <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>👁️ {reviewCount}/4</span>
            )}
          </div>
        )}
      </div>
    </>
  )
}
