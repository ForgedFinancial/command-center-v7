import { useState } from 'react'
import AgentBadge from '../shared/AgentBadge'
import TimeAgo from '../shared/TimeAgo'
import { STAGES, STAGE_CONFIG, AGENTS, PRIORITY_COLORS } from './pipelineConstants'
import CommentsPanel from './CommentsPanel'
import ReviewPanel from './ReviewPanel'

const TABS = ['Details', 'Reviews', 'Comments']

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState('Details')
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description || '')
  const [blockerReason, setBlockerReason] = useState(task.blockerReason || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    onUpdate(task.id, { name, description })
    setEditMode(false)
  }

  const handleToggleBlocker = () => {
    if (task.blocked) {
      onUpdate(task.id, { blocked: false })
    } else {
      onUpdate(task.id, { blocked: true, blockerReason: blockerReason || 'Blocked' })
    }
  }

  const handleTaskUpdate = (updated) => {
    onUpdate(task.id, updated)
  }

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal
  const commentCount = (task.comments || []).length

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '600px', maxHeight: '85vh', overflow: 'auto',
        backgroundColor: 'var(--theme-bg, #0f0f1a)',
        border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
        borderRadius: '12px', padding: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          {editMode ? (
            <input value={name} onChange={e => setName(e.target.value)} style={{
              flex: 1, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)',
              backgroundColor: 'transparent', border: '1px solid var(--theme-border)',
              borderRadius: '6px', padding: '4px 8px', marginRight: '8px',
            }} />
          ) : (
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)', flex: 1 }}>
              {task.name}
            </h3>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '18px', cursor: 'pointer', padding: '0 4px',
          }}>×</button>
        </div>

        {/* Meta bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
            backgroundColor: STAGE_CONFIG[task.stage]?.color + '20',
            color: STAGE_CONFIG[task.stage]?.color,
          }}>
            {STAGE_CONFIG[task.stage]?.icon} {STAGE_CONFIG[task.stage]?.label}
          </span>
          <AgentBadge agent={task.assignee} />
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
            backgroundColor: priorityColor + '20', color: priorityColor,
          }}>
            {(task.priority || 'normal').toUpperCase()}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
            in stage: <TimeAgo date={task.stageEnteredAt} showColor />
          </span>
          {task.blocked && <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>⚠ BLOCKED</span>}
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: '2px', marginBottom: '16px', padding: '3px',
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
        }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '7px 12px', fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400,
              backgroundColor: activeTab === tab ? 'var(--theme-accent-muted, rgba(139,92,246,0.15))' : 'transparent',
              color: activeTab === tab ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)',
              border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {tab}{tab === 'Comments' && commentCount > 0 ? ` (${commentCount})` : ''}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Details' && (
          <div>
            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '4px', display: 'block' }}>Description</label>
              {editMode ? (
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{
                  width: '100%', fontSize: '13px', color: 'var(--theme-text-primary)',
                  backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border)',
                  borderRadius: '6px', padding: '8px', resize: 'vertical', fontFamily: 'inherit',
                }} />
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-primary)', lineHeight: 1.5 }}>
                  {task.description || '—'}
                </p>
              )}
            </div>

            {task.specRef && (
              <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                📄 Spec: <span style={{ color: 'var(--theme-accent)' }}>{task.specRef}</span>
              </div>
            )}

            {task.tags && task.tags.length > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {task.tags.map((tag, i) => (
                  <span key={i} style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                    backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)',
                  }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Stage move */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px', display: 'block' }}>Move to stage</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STAGES.filter(s => s !== task.stage).map(s => (
                  <button key={s} onClick={() => onUpdate(task.id, { stage: s })} style={{
                    padding: '4px 12px', fontSize: '11px', fontWeight: 500,
                    backgroundColor: STAGE_CONFIG[s].color + '15', color: STAGE_CONFIG[s].color,
                    border: `1px solid ${STAGE_CONFIG[s].color}40`, borderRadius: '6px', cursor: 'pointer',
                  }}>{STAGE_CONFIG[s].icon} {STAGE_CONFIG[s].label}</button>
                ))}
              </div>
            </div>

            {/* Blocker */}
            <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--theme-border)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <button onClick={handleToggleBlocker} style={{
                  padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                  backgroundColor: task.blocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  color: task.blocked ? '#10b981' : '#ef4444',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                }}>{task.blocked ? '✓ Unblock' : '⚠ Mark Blocked'}</button>
              </div>
              {!task.blocked && (
                <input value={blockerReason} onChange={e => setBlockerReason(e.target.value)} placeholder="Reason for blocking…"
                  style={{ width: '100%', fontSize: '12px', color: 'var(--theme-text-primary)', backgroundColor: 'transparent', border: '1px solid var(--theme-border)', borderRadius: '4px', padding: '6px 8px' }} />
              )}
            </div>

            {/* History */}
            {task.history && task.history.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px', display: 'block' }}>History</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[...task.history].reverse().map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: STAGE_CONFIG[h.stage]?.color }}>{STAGE_CONFIG[h.stage]?.icon || '📋'}</span>
                      <span style={{ color: 'var(--theme-text-secondary)' }}>{STAGE_CONFIG[h.stage]?.label || h.stage}</span>
                      <AgentBadge agent={h.agent} />
                      <span style={{ color: 'var(--theme-text-secondary)' }}>{new Date(h.enteredAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Reviews' && <ReviewPanel task={task} onTaskUpdate={handleTaskUpdate} />}
        {activeTab === 'Comments' && <CommentsPanel task={task} onTaskUpdate={handleTaskUpdate} />}

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--theme-border)', marginTop: '16px' }}>
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} style={btnStyle('ghost')}>Cancel</button>
              <button onClick={handleSave} style={btnStyle('primary')}>Save</button>
            </>
          ) : (
            <>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: '12px', color: '#ef4444', alignSelf: 'center' }}>Delete permanently?</span>
                  <button onClick={() => setConfirmDelete(false)} style={btnStyle('ghost')}>No</button>
                  <button onClick={() => onDelete(task.id)} style={btnStyle('danger')}>Yes, Delete</button>
                </>
              ) : (
                <>
                  <button onClick={() => setConfirmDelete(true)} style={btnStyle('danger')}>Delete</button>
                  <button onClick={() => setEditMode(true)} style={btnStyle('ghost')}>Edit</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function btnStyle(variant) {
  const base = { padding: '6px 14px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', cursor: 'pointer', border: 'none', transition: 'all 0.15s' }
  if (variant === 'primary') return { ...base, backgroundColor: 'var(--theme-accent)', color: '#fff' }
  if (variant === 'danger') return { ...base, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }
  return { ...base, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)' }
}
