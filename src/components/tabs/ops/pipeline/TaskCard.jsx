import AgentBadge from '../shared/AgentBadge'
import TimeAgo from '../shared/TimeAgo'
import { STAGES, STAGE_CONFIG, AGENTS, PRIORITY_COLORS, TASK_TYPES } from './pipelineConstants'

const blockerKeyframes = `
@keyframes blockerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.2); }
}
`

export default function TaskCard({ task, stageIdx, onClick, onMoveTask }) {
  const prevStage = stageIdx > 0 ? STAGES[stageIdx - 1] : null
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null
  const agentInfo = AGENTS[task.assignee] || { color: '#6b7280' }
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal
  const typeInfo = TASK_TYPES.find(t => t.value === task.type)
  const commentCount = (task.comments || []).length
  const reviewCount = (task.reviews || []).length
  const isDone = STAGE_CONFIG[task.stage]?.muted

  return (
    <>
      <style>{blockerKeyframes}</style>
      <div
        onClick={onClick}
        style={{
          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
          backgroundColor: 'var(--theme-bg, #0a0a0f)',
          borderLeft: `3px solid ${agentInfo.color}`,
          borderTop: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
          borderRight: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
          borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
          transition: 'all 0.2s ease',
          animation: task.blocked ? 'blockerPulse 2s ease-in-out infinite' : 'none',
          opacity: isDone ? 0.7 : 1,
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--theme-accent, #8b5cf6)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'var(--theme-border, rgba(255,255,255,0.06))'
          e.currentTarget.style.borderLeftColor = agentInfo.color
          e.currentTarget.style.transform = 'none'
        }}
      >
        {/* Title */}
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
          {task.name}
        </div>

        {/* Type + Priority row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
          {typeInfo && (
            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)' }}>
              {typeInfo.label}
            </span>
          )}
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
            backgroundColor: priorityColor + '20', color: priorityColor,
          }}>
            {(task.priority || 'normal').toUpperCase()}
          </span>
        </div>

        {/* Agent + Time row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <AgentBadge agent={task.assignee} />
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

        {/* Stage move buttons */}
        {!isDone && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }} onClick={e => e.stopPropagation()}>
            {task.stage === 'BOSS_REVIEW' ? (
              <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                <button
                  onClick={() => onMoveTask(task.id, 'DONE')}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: '10px', fontWeight: 700,
                    backgroundColor: '#10b981', color: '#fff',
                    border: 'none', borderRadius: '5px', cursor: 'pointer',
                    boxShadow: '0 0 8px rgba(16,185,129,0.3)', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#10b981'}
                >✓ Approve</button>
                <button
                  onClick={onClick}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: '10px', fontWeight: 700,
                    backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.3)', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.25)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.15)'}
                >✏ Modify</button>
                <button
                  onClick={onClick}
                  style={{
                    flex: 1, padding: '5px 0', fontSize: '10px', fontWeight: 700,
                    backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.25)', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.22)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'}
                >✗ Decline</button>
              </div>
            ) : (
              <>
                {prevStage && (
                  <button
                    onClick={() => onMoveTask(task.id, prevStage)}
                    title={`Move to ${STAGE_CONFIG[prevStage].label}`}
                    style={{
                      padding: '2px 8px', fontSize: '10px', fontWeight: 500,
                      backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)',
                      border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                      borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--theme-accent)'; e.currentTarget.style.color = 'var(--theme-text-primary)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--theme-border, rgba(255,255,255,0.08))'; e.currentTarget.style.color = 'var(--theme-text-secondary)' }}
                  >← {STAGE_CONFIG[prevStage].icon}</button>
                )}
                {nextStage && (
                  <button
                    onClick={() => onMoveTask(task.id, nextStage)}
                    title={`Move to ${STAGE_CONFIG[nextStage].label}`}
                    style={{
                      padding: '2px 8px', fontSize: '10px', fontWeight: 500,
                      backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)',
                      border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                      borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s', marginLeft: 'auto',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--theme-accent)'; e.currentTarget.style.color = 'var(--theme-text-primary)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--theme-border, rgba(255,255,255,0.08))'; e.currentTarget.style.color = 'var(--theme-text-secondary)' }}
                  >{STAGE_CONFIG[nextStage].icon} →</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
