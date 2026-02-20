import { useState } from 'react'
import { AGENTS, TASK_TYPES, PRIORITIES, TIERS, AGENT_STAGE_ROUTING } from './pipelineConstants'

export default function NewTaskForm({ onClose, onCreate }) {
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [type, setType]               = useState('build')
  const [priority, setPriority]       = useState('normal')
  const [assignee, setAssignee]       = useState('clawd')
  const [tier, setTier]               = useState('build')
  const [specRef, setSpecRef]         = useState('')
  const [tags, setTags]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)

  const canSubmit = name.trim().length > 0 && !submitting
  const routedStage = AGENT_STAGE_ROUTING[assignee] || 'INTAKE'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        assignee,
        createdBy: 'dano',
        stage: routedStage,
        type,
        priority,
        specRef: specRef.trim() || null,
        tags: [
          type, tier,
          ...(tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [])
        ],
      })
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
  const label = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
    color: 'var(--theme-text-secondary)', marginBottom: '5px', display: 'block', textTransform: 'uppercase' }

  const agentInfo = AGENTS[assignee] || { label: assignee, color: '#6b7280', icon: '👤' }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{
        width: '520px', maxHeight: '90vh', overflow: 'auto',
        backgroundColor: 'var(--theme-bg, #0f0f1a)',
        border: '1px solid var(--theme-border)', borderRadius: '14px', padding: '28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
            New Task
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            Pick an agent — task auto-routes to the right stage.
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

          {/* Assignee picker */}
          <div>
            <label style={label}>Assign To</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(AGENTS).map(([id, a]) => (
                <button key={id} type="button" onClick={() => setAssignee(id)} style={{
                  padding: '6px 12px', fontSize: '12px', fontWeight: assignee === id ? 700 : 400,
                  backgroundColor: assignee === id ? a.color + '25' : 'transparent',
                  color: assignee === id ? a.color : 'var(--theme-text-secondary)',
                  border: `1px solid ${assignee === id ? a.color : 'var(--theme-border, rgba(255,255,255,0.08))'}`,
                  borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier + Type + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={label}>Tier</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {TIERS.map(t => (
                  <label key={t.value} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                    backgroundColor: tier === t.value ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: tier === t.value ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
                    fontWeight: tier === t.value ? 600 : 400,
                  }}>
                    <input type="radio" name="tier" value={t.value} checked={tier === t.value} onChange={() => setTier(t.value)} style={{ display: 'none' }} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={label}>Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {TASK_TYPES.map(t => (
                  <label key={t.value} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
                    backgroundColor: type === t.value ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: type === t.value ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
                    fontWeight: type === t.value ? 600 : 400,
                  }}>
                    <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} style={{ display: 'none' }} />
                    {t.label}
                  </label>
                ))}
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

          {/* Routing preview */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px',
            backgroundColor: agentInfo.color + '10', border: `1px solid ${agentInfo.color}30`,
            fontSize: '11px', color: 'var(--theme-text-secondary)', lineHeight: '1.5',
          }}>
            {agentInfo.icon} Assigned to <strong style={{ color: agentInfo.color }}>{agentInfo.label}</strong> → routes to <strong style={{ color: 'var(--theme-text-primary)' }}>{routedStage}</strong> stage
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
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
