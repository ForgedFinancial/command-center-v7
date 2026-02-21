import { useState, useRef, useCallback } from 'react'
import { WORKER_PROXY_URL, SYNC_API_KEY, ENDPOINTS } from '../../../../config/api'

function renderMarkdown(text) {
  if (!text) return <span style={{ color: 'var(--theme-text-secondary)' }}>—</span>
  return (
    <div style={{ fontSize: '13px', color: 'var(--theme-text-primary)', lineHeight: 1.7 }}>
      {text.split('\n').map((line, i) => {
        if (/^---+$/.test(line.trim())) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--theme-border, rgba(255,255,255,0.08))', margin: '10px 0' }} />
        if (line.startsWith('### ')) return <div key={i} style={{ fontWeight: 700, fontSize: '12px', color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 6px' }}>{parseLine(line.slice(4))}</div>
        if (line.startsWith('## ')) return <div key={i} style={{ fontWeight: 700, fontSize: '14px', color: 'var(--theme-text-primary)', margin: '14px 0 6px' }}>{parseLine(line.slice(3))}</div>
        if (/^- /.test(line)) return <div key={i} style={{ display: 'flex', gap: '6px', paddingLeft: '8px', marginBottom: '3px' }}><span style={{ color: 'var(--theme-accent, #8b5cf6)', flexShrink: 0 }}>•</span><span>{parseLine(line.slice(2))}</span></div>
        if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />
        return <div key={i}>{parseLine(line)}</div>
      })}
    </div>
  )
}

function parseLine(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ color: 'var(--theme-text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', color: 'var(--theme-accent, #8b5cf6)' }}>{part.slice(1, -1)}</code>
    return part
  })
}

import AgentBadge from '../shared/AgentBadge'
import TimeAgo from '../shared/TimeAgo'
import { STAGES, STAGE_CONFIG, AGENTS, PRIORITY_COLORS } from './pipelineConstants'
import CommentsPanel from './CommentsPanel'
import ReviewPanel from './ReviewPanel'

const TABS = ['Details', 'Attachments', 'Reviews', 'Comments']

// ── Attachments Panel ─────────────────────────────────────────────────────
function AttachmentsPanel({ task, onAttachmentAdded, onAttachmentDeleted }) {
  const [dragOver, setDragOver]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [newComment, setNewComment] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [lightbox, setLightbox]     = useState(null) // {url, name}
  const fileInputRef                = useRef(null)
  const attachments                 = task.attachments || []

  const isImage = (att) => att.mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.filename || '')

  const handleFilePick = (file) => {
    if (!file) return
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setPendingFile({ file, preview, comment: '' })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFilePick(f)
  }

  const handleUpload = async () => {
    if (!pendingFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', pendingFile.file)
      fd.append('comment', pendingFile.comment || '')
      fd.append('uploadedBy', 'dano')
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineTaskAttachments(task.id)}`, {
        method: 'POST',
        headers: { 'x-api-key': SYNC_API_KEY },
        body: fd,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (pendingFile.preview) URL.revokeObjectURL(pendingFile.preview)
      setPendingFile(null)
      onAttachmentAdded(data.attachment)
    } catch (err) {
      console.error('[Attachments] Upload failed:', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (att) => {
    try {
      await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineTaskAttachment(task.id, att.id)}`, {
        method: 'DELETE',
        headers: { 'x-api-key': SYNC_API_KEY, 'Content-Type': 'application/json' },
      })
      onAttachmentDeleted(att.id)
    } catch (err) {
      console.error('[Attachments] Delete failed:', err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Upload zone ── */}
      {!pendingFile ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px', padding: '18px', textAlign: 'center', cursor: 'pointer',
            backgroundColor: dragOver ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.01)',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: '22px', marginBottom: '4px' }}>📎</div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            Drop a screenshot or file, or click to browse
          </div>
          <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '3px', opacity: 0.6 }}>
            Images, PDF, TXT, MD — max 20MB
          </div>
          <input
            ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md"
            style={{ display: 'none' }}
            onChange={e => { handleFilePick(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>
      ) : (
        /* ── Pending file preview ── */
        <div style={{
          border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', padding: '12px',
          backgroundColor: 'rgba(139,92,246,0.05)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pendingFile.preview
                ? <img src={pendingFile.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '28px' }}>📄</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
                {pendingFile.file.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '8px' }}>
                {(pendingFile.file.size / 1024).toFixed(0)} KB
              </div>
              <input
                value={pendingFile.comment}
                onChange={e => setPendingFile(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Add a comment for context (optional)…"
                style={{
                  width: '100%', fontSize: '12px', color: 'var(--theme-text-primary)',
                  backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '5px', padding: '6px 10px', fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button onClick={() => { if (pendingFile.preview) URL.revokeObjectURL(pendingFile.preview); setPendingFile(null) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '16px', cursor: 'pointer', padding: '0', flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => { if (pendingFile.preview) URL.revokeObjectURL(pendingFile.preview); setPendingFile(null) }}
              style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)', border: '1px solid var(--theme-border)', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleUpload} disabled={uploading}
              style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--theme-accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Uploading…' : '⬆ Upload'}
            </button>
          </div>
        </div>
      )}

      {/* ── Existing attachments ── */}
      {attachments.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', textAlign: 'center', padding: '12px 0' }}>
          No attachments yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {attachments.map(att => (
            <div key={att.id} style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              padding: '10px', borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Thumbnail / icon */}
              <div
                onClick={() => isImage(att) && setLightbox({ url: `${WORKER_PROXY_URL}${att.url}`, name: att.originalName })}
                style={{
                  width: '72px', height: '72px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden',
                  backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isImage(att) ? 'zoom-in' : 'default',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {isImage(att)
                  ? <img src={`${WORKER_PROXY_URL}${att.url}`} alt={att.originalName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '28px' }}>{att.mimeType === 'application/pdf' ? '📄' : '📎'}</span>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                  {att.originalName}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>
                  {(att.size / 1024).toFixed(0)} KB · {new Date(att.uploadedAt).toLocaleString()}
                </div>
                {att.comment && (
                  <div style={{
                    fontSize: '12px', color: 'var(--theme-text-primary)', fontStyle: 'italic',
                    padding: '6px 10px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    "{att.comment}"
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                <a
                  href={`${WORKER_PROXY_URL}${att.url}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--theme-text-secondary)', textDecoration: 'none', textAlign: 'center' }}
                >
                  ↗ Open
                </a>
                <button onClick={() => handleDelete(att)} style={{
                  fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                  backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer',
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }} />
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {lightbox.name} — <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setLightbox(null)}>Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export default function TaskDetailModal({ task: initialTask, onClose, onUpdate, onDelete }) {
  const [task, setTask]           = useState(initialTask)
  const [activeTab, setActiveTab] = useState('Details')
  const [editMode, setEditMode]   = useState(false)
  const [name, setName]           = useState(task.name)
  const [description, setDescription] = useState(task.description || '')
  const [blockerReason, setBlockerReason] = useState(task.blockerReason || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Boss Review actions
  const [reviewAction, setReviewAction] = useState(null) // null | 'modify' | 'reject'
  const [reviewNotes, setReviewNotes]   = useState('')
  const [advancing, setAdvancing]       = useState(false)

  const callAdvance = async (action, notes) => {
    setAdvancing(true)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineTaskAdvance(task.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': SYNC_API_KEY },
        body: JSON.stringify({ agent: 'dano', action, summary: notes || '', rejection_notes: notes || '' }),
      })
      if (res.ok) {
        const updated = await res.json()
        if (updated && updated.stage) {
          setTask(prev => ({ ...prev, ...updated }))
          onUpdate(task.id, updated)
        }
      }
      onClose()
    } catch (err) {
      console.error('[TaskDetailModal] advance failed:', err.message)
      setAdvancing(false)
    }
  }

  const attachmentCount = (task.attachments || []).length

  const handleSave = () => {
    onUpdate(task.id, { name, description })
    setTask(prev => ({ ...prev, name, description }))
    setEditMode(false)
  }

  const handleToggleBlocker = () => {
    const patch = task.blocked
      ? { blocked: false }
      : { blocked: true, blockerReason: blockerReason || 'Blocked' }
    onUpdate(task.id, patch)
    setTask(prev => ({ ...prev, ...patch }))
  }

  const handleTaskUpdate = (updated) => {
    onUpdate(task.id, updated)
    setTask(prev => ({ ...prev, ...updated }))
  }

  // Attachment callbacks — update local task state immediately
  const handleAttachmentAdded = (att) => {
    setTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), att] }))
  }

  const handleAttachmentDeleted = (attId) => {
    setTask(prev => ({ ...prev, attachments: (prev.attachments || []).filter(a => a.id !== attId) }))
  }

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '620px', maxHeight: '88vh', overflow: 'auto',
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
            backgroundColor: (STAGE_CONFIG[task.stage]?.color || '#666') + '20',
            color: STAGE_CONFIG[task.stage]?.color || '#888',
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
          {TABS.map(tab => {
            let badge = null
            if (tab === 'Comments') badge = (task.comments || []).length || null
            if (tab === 'Attachments') badge = attachmentCount || null
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: '7px 10px', fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400,
                backgroundColor: activeTab === tab ? 'var(--theme-accent-muted, rgba(139,92,246,0.15))' : 'transparent',
                color: activeTab === tab ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)',
                border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative',
              }}>
                {tab}{badge ? ` (${badge})` : ''}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'Details' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '4px', display: 'block' }}>Description</label>
              {editMode ? (
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{
                  width: '100%', fontSize: '13px', color: 'var(--theme-text-primary)',
                  backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border)',
                  borderRadius: '6px', padding: '8px', resize: 'vertical', fontFamily: 'inherit',
                }} />
              ) : (
                <div style={{ margin: 0 }}>{renderMarkdown(task.description)}</div>
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
                  <button key={s} onClick={() => { onUpdate(task.id, { stage: s }); setTask(prev => ({ ...prev, stage: s })) }} style={{
                    padding: '4px 12px', fontSize: '11px', fontWeight: 500,
                    backgroundColor: (STAGE_CONFIG[s]?.color || '#666') + '15',
                    color: STAGE_CONFIG[s]?.color || '#888',
                    border: `1px solid ${(STAGE_CONFIG[s]?.color || '#666')}40`,
                    borderRadius: '6px', cursor: 'pointer',
                  }}>{STAGE_CONFIG[s]?.icon} {STAGE_CONFIG[s]?.label}</button>
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

        {activeTab === 'Attachments' && (
          <AttachmentsPanel
            task={task}
            onAttachmentAdded={handleAttachmentAdded}
            onAttachmentDeleted={handleAttachmentDeleted}
          />
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
                  {task.stage === 'BOSS_REVIEW' && !reviewAction && (
                    <>
                      <button onClick={() => callAdvance('approve', '')} disabled={advancing} style={{
                        padding: '7px 18px', fontSize: '12px', fontWeight: 700,
                        backgroundColor: '#10b981', color: '#fff', border: 'none',
                        borderRadius: '6px', cursor: advancing ? 'default' : 'pointer',
                        boxShadow: '0 0 10px rgba(16,185,129,0.35)', marginRight: 'auto',
                        opacity: advancing ? 0.6 : 1,
                      }}>✓ Approve</button>
                      <button onClick={() => { setReviewAction('modify'); setReviewNotes('') }} style={{
                        padding: '7px 16px', fontSize: '12px', fontWeight: 600,
                        backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', cursor: 'pointer',
                      }}>✏ Modify</button>
                      <button onClick={() => { setReviewAction('reject'); setReviewNotes('') }} style={{
                        padding: '7px 16px', fontSize: '12px', fontWeight: 600,
                        backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', cursor: 'pointer',
                      }}>✗ Decline</button>
                    </>
                  )}
                  {task.stage === 'BOSS_REVIEW' && reviewAction && (
                    <div style={{ width: '100%' }}>
                      <div style={{
                        padding: '12px', borderRadius: '8px', marginBottom: '10px',
                        backgroundColor: reviewAction === 'modify' ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)',
                        border: `1px solid ${reviewAction === 'modify' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: reviewAction === 'modify' ? '#f59e0b' : '#ef4444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {reviewAction === 'modify' ? '✏ What needs to be modified?' : '✗ Reason for declining?'}
                        </div>
                        <textarea
                          autoFocus
                          value={reviewNotes}
                          onChange={e => setReviewNotes(e.target.value)}
                          placeholder={reviewAction === 'modify' ? 'Describe what the agent should change or fix…' : 'Tell the agent why this was declined and what to redo…'}
                          rows={3}
                          style={{
                            width: '100%', fontSize: '12px', color: 'var(--theme-text-primary)',
                            backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px', padding: '8px', resize: 'vertical',
                            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setReviewAction(null)} style={btnStyle('ghost')}>Cancel</button>
                        <button
                          onClick={() => callAdvance(reviewAction, reviewNotes)}
                          disabled={advancing}
                          style={{
                            padding: '6px 18px', fontSize: '12px', fontWeight: 700,
                            backgroundColor: reviewAction === 'modify' ? '#f59e0b' : '#ef4444',
                            color: '#fff', border: 'none', borderRadius: '6px',
                            cursor: advancing ? 'default' : 'pointer', opacity: advancing ? 0.6 : 1,
                          }}>
                          {advancing ? 'Sending…' : reviewAction === 'modify' ? '✏ Send to Agent' : '✗ Decline & Send'}
                        </button>
                      </div>
                    </div>
                  )}
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
