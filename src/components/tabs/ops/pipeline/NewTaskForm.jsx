import { useState, useRef, useCallback } from 'react'
import { PRIORITIES } from './pipelineConstants'
import { WORKER_PROXY_URL, SYNC_API_KEY, ENDPOINTS } from '../../../../config/api'

export default function NewTaskForm({ onClose, onCreate }) {
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType]       = useState('frontend')
  const [priority, setPriority]       = useState('normal')
  const [specRef, setSpecRef]         = useState('')
  const [tags, setTags]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)
  const [isBacklog, setIsBacklog]     = useState(false)

  // Attachments state
  const [pendingFiles, setPendingFiles]   = useState([])
  const [dragOver, setDragOver]           = useState(false)
  const fileInputRef                      = useRef(null)

  const canSubmit = name.trim().length > 0 && !submitting

  // ── Attachment helpers ──
  const addFiles = useCallback((fileList) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|txt|md/i
    const newEntries = Array.from(fileList)
      .filter(f => {
        const ext = f.name.split('.').pop().toLowerCase()
        return allowed.test(ext) || f.type.startsWith('image/') || f.type === 'application/pdf'
      })
      .slice(0, 5 - pendingFiles.length)
      .map(f => ({
        file: f,
        comment: '',
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        id: Math.random().toString(36).slice(2),
      }))
    if (newEntries.length) setPendingFiles(prev => [...prev, ...newEntries])
  }, [pendingFiles.length])

  const removeFile = (id) => {
    setPendingFiles(prev => {
      const entry = prev.find(e => e.id === id)
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl)
      return prev.filter(e => e.id !== id)
    })
  }

  const updateComment = (id, comment) => {
    setPendingFiles(prev => prev.map(e => e.id === id ? { ...e, comment } : e))
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const uploadAttachments = async (taskId) => {
    for (const entry of pendingFiles) {
      try {
        const fd = new FormData()
        fd.append('file', entry.file)
        fd.append('comment', entry.comment)
        fd.append('uploadedBy', 'dano')
        await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineTaskAttachments(taskId)}`, {
          method: 'POST',
          headers: { 'x-api-key': SYNC_API_KEY },
          body: fd,
        })
      } catch (uploadErr) {
        console.warn('[NewTaskForm] Attachment upload failed:', uploadErr.message)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const task = await onCreate({
        name: name.trim(),
        description: description.trim(),
        assignee: 'clawd',
        createdBy: 'dano',
        stage: isBacklog ? 'INTAKE' : 'INTAKE',
        isBacklog,
        taskType,
        priority,
        specRef: specRef.trim() || null,
        tags: [
          taskType,
          ...(tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [])
        ],
      })
      if (pendingFiles.length > 0 && task?.id) {
        await uploadAttachments(task.id)
      }
    } catch (err) {
      setError('Failed to create task. Try again.')
      setSubmitting(false)
    }
  }

  const base = {
    width: '100%', fontSize: '13px', color: 'var(--theme-text-primary)',
    backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--theme-border)',
    borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', outline: 'none',
  }
  const label = {
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
    color: 'var(--theme-text-secondary)', marginBottom: '5px', display: 'block', textTransform: 'uppercase',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{
        width: '540px', maxHeight: '90vh', overflow: 'auto',
        backgroundColor: 'var(--theme-bg, #0f0f1a)',
        border: '1px solid var(--theme-border)', borderRadius: '14px', padding: '28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
            New Task
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            All tasks route to Clawd for triage and assignment.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name */}
          <div>
            <label style={label}>Task Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="What needs to get done?" maxLength={200} style={base} autoFocus />
          </div>

          {/* Description */}
          <div>
            <label style={label}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Context, requirements, anything the agent needs…" style={{ ...base, resize: 'vertical' }} />
          </div>

          {/* Workstream + Priority side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={label}>Workstream</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'frontend', icon: '🖥', label: 'Frontend', color: '#c4b5fd', bg: 'rgba(124, 58, 237, 0.22)', border: 'rgba(167, 139, 250, 0.85)' },
                  { value: 'backend', icon: '⚙', label: 'Backend', color: '#67e8f9', bg: 'rgba(8, 145, 178, 0.22)', border: 'rgba(34, 211, 238, 0.85)' },
                ].map(ws => {
                  const active = taskType === ws.value
                  return (
                    <button key={ws.value} type="button" onClick={() => setTaskType(ws.value)} style={{
                      padding: '6px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '999px', cursor: 'pointer',
                      border: `1px solid ${active ? ws.border : 'var(--theme-border, rgba(255,255,255,0.08))'}`,
                      backgroundColor: active ? ws.bg : 'rgba(255,255,255,0.02)',
                      color: active ? ws.color : 'var(--theme-text-secondary)',
                    }}>
                      {ws.icon} {ws.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={label}>Priority</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {PRIORITIES.map(p => (
                  <label key={p.value} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                    backgroundColor: priority === p.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: priority === p.value ? p.color : 'var(--theme-text-secondary)',
                    border: priority === p.value ? `1px solid ${p.color}` : '1px solid transparent',
                    fontWeight: priority === p.value ? 600 : 400,
                  }}>
                    <input type="radio" name="priority" value={p.value} checked={priority === p.value} onChange={() => setPriority(p.value)} style={{ display: 'none' }} />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Spec ref + Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={label}>Spec Reference <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span></label>
              <input value={specRef} onChange={e => setSpecRef(e.target.value)} placeholder="plans/SPEC.md" style={base} />
            </div>
            <div>
              <label style={label}>Tags <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(comma-sep)</span></label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="cc-v7, urgent" style={base} />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={label}>Attachments <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(screenshots, docs — up to 5)</span></label>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                backgroundColor: 'rgba(139,92,246,0.15)', color: 'var(--theme-accent)',
                border: '1px solid rgba(139,92,246,0.3)', borderRadius: '5px', cursor: 'pointer',
              }}>+ Add File</button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md" style={{ display: 'none' }}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !pendingFiles.length && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px', padding: pendingFiles.length ? '10px' : '20px',
                textAlign: pendingFiles.length ? 'left' : 'center',
                cursor: pendingFiles.length ? 'default' : 'pointer',
                backgroundColor: dragOver ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.01)',
                minHeight: pendingFiles.length ? 'auto' : '70px',
                display: 'flex', flexDirection: pendingFiles.length ? 'column' : 'row',
                alignItems: pendingFiles.length ? 'stretch' : 'center',
                justifyContent: pendingFiles.length ? 'flex-start' : 'center', gap: '8px',
              }}
            >
              {pendingFiles.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>📎 Drop screenshots or files here, or click to browse</span>
              ) : (
                pendingFiles.map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px', borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {entry.previewUrl
                        ? <img src={entry.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '20px' }}>{entry.file.type === 'application/pdf' ? '📄' : '📎'}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.file.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginBottom: '5px' }}>{(entry.file.size / 1024).toFixed(0)} KB</div>
                      <input value={entry.comment} onChange={e => updateComment(entry.id, e.target.value)} placeholder="Add a comment for context…" onClick={e => e.stopPropagation()}
                        style={{ width: '100%', fontSize: '11px', color: 'var(--theme-text-primary)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px 8px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <button type="button" onClick={() => removeFile(entry.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '14px', cursor: 'pointer', padding: '0', flexShrink: 0 }}>✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Placement toggle */}
          <div>
            <label style={label}>Placement</label>
            <button type="button" onClick={() => setIsBacklog(v => !v)} style={{
              padding: '8px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '8px',
              border: `1px solid ${isBacklog ? 'rgba(0,212,255,0.45)' : 'var(--theme-border)'}`,
              background: isBacklog ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: isBacklog ? '#CFF6FF' : 'var(--theme-text-secondary)', cursor: 'pointer',
            }}>
              {isBacklog ? 'Backlog task (outside active pipeline)' : 'Active pipeline task'}
            </button>
          </div>

          {/* Routing preview */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
            fontSize: '11px', color: 'var(--theme-text-secondary)', lineHeight: '1.5',
          }}>
            🔨 All tasks route to <strong style={{ color: '#00D4FF' }}>Clawd</strong> → triaged and assigned to the right agent
            {pendingFiles.length > 0 && <span style={{ marginLeft: '8px', color: 'var(--theme-accent)' }}>· {pendingFiles.length} attachment{pendingFiles.length > 1 ? 's' : ''} will upload</span>}
          </div>
        </div>

        {error && <div style={{ marginTop: '10px', fontSize: '12px', color: '#ef4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="button" onClick={onClose} style={{
            padding: '9px 18px', fontSize: '13px', fontWeight: 500,
            backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)',
            border: '1px solid var(--theme-border)', borderRadius: '8px', cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={!canSubmit} style={{
            padding: '9px 20px', fontSize: '13px', fontWeight: 700,
            backgroundColor: canSubmit ? 'var(--theme-accent)' : 'rgba(255,255,255,0.08)',
            color: canSubmit ? '#fff' : 'var(--theme-text-secondary)',
            border: 'none', borderRadius: '8px',
            cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? (pendingFiles.length > 0 ? 'Creating + Uploading…' : 'Creating…') : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
