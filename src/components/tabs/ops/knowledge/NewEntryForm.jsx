import { useState } from 'react'
import { CATEGORIES, CATEGORY_CONFIG, SEVERITIES } from './knowledgeConstants'

export default function NewEntryForm({ onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [severity, setSeverity] = useState('MEDIUM')
  const [description, setDescription] = useState('')
  const [discoveredBy, setDiscoveredBy] = useState('mason')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = title.trim() && description.trim() && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        title: title.trim(),
        category,
        severity,
        description: description.trim(),
        discoveredBy,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
    } catch {
      setError('Failed to create entry')
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', fontSize: '13px', color: 'var(--theme-text-primary)',
    backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border)',
    borderRadius: '6px', padding: '8px 10px', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '4px', display: 'block' }
  const optStyle = { backgroundColor: '#1a1f2e', color: '#e2e8f0' }
  const agents = ['dano', 'clawd', 'soren', 'mason', 'sentinel']

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{
        width: '480px', backgroundColor: 'var(--theme-bg, #0f0f1a)',
        border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
          New Knowledge Entry
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What did you discover?" maxLength={300} style={inputStyle} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}>
                {CATEGORIES.map(c => <option key={c} value={c} style={optStyle}>{CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}>
                {SEVERITIES.map(s => <option key={s} value={s} style={optStyle}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Detailed explanation…" maxLength={5000} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelStyle}>Discovered By *</label>
              <select value={discoveredBy} onChange={e => setDiscoveredBy(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', colorScheme: 'dark' }}>
                {agents.map(a => <option key={a} value={a} style={optStyle}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="proxy, ssl" style={inputStyle} />
            </div>
          </div>
        </div>

        {error && <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 16px', fontSize: '12px', fontWeight: 500,
            backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={!canSubmit} style={{
            padding: '8px 16px', fontSize: '12px', fontWeight: 600,
            backgroundColor: canSubmit ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)',
            color: canSubmit ? '#fff' : 'var(--theme-text-secondary)',
            border: 'none', borderRadius: '6px', cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? 'Creating…' : 'Create Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}
