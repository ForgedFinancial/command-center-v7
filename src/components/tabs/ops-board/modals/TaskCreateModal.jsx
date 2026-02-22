import { useState } from 'react'
import { OPS_CLASSIFICATIONS, OPS_PRIORITIES } from '../../../../config/opsBoard'

const initialForm = {
  title: '',
  description: '',
  classification: 'FULLSTACK',
  priority: 'medium',
  spec: '',
}

export default function TaskCreateModal({ open, onClose, onCreate, syncing }) {
  const [form, setForm] = useState(initialForm)

  if (!open) return null

  const setValue = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!form.title.trim()) return

    await onCreate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
    })

    setForm(initialForm)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: '16px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={event => event.stopPropagation()}
        style={{
          width: 'min(640px, 100%)',
          borderRadius: '12px',
          border: '1px solid var(--theme-border)',
          backgroundColor: 'var(--theme-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--theme-text-primary)' }}>Create Ops Task</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--theme-text-primary)', fontSize: '18px', cursor: 'pointer' }}>×</button>
        </header>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Title
          <input
            value={form.title}
            onChange={event => setValue('title', event.target.value)}
            required
            style={{ height: '34px', borderRadius: '8px', border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', padding: '0 10px' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Description
          <textarea
            value={form.description}
            onChange={event => setValue('description', event.target.value)}
            rows={3}
            style={{ borderRadius: '8px', border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', padding: '8px 10px', resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            Classification
            <select
              value={form.classification}
              onChange={event => setValue('classification', event.target.value)}
              style={{ height: '34px', borderRadius: '8px', border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', padding: '0 10px' }}
            >
              {OPS_CLASSIFICATIONS.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            Priority
            <select
              value={form.priority}
              onChange={event => setValue('priority', event.target.value)}
              style={{ height: '34px', borderRadius: '8px', border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', padding: '0 10px' }}
            >
              {OPS_PRIORITIES.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
          Initial SPEC Content
          <textarea
            value={form.spec}
            onChange={event => setValue('spec', event.target.value)}
            rows={5}
            placeholder="User story, requirements, acceptance criteria..."
            style={{ borderRadius: '8px', border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', padding: '8px 10px', resize: 'vertical' }}
          />
        </label>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} style={{ height: '34px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-primary)', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={syncing} style={{ height: '34px', padding: '0 14px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--theme-accent)', color: '#fff', fontWeight: 700, cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.7 : 1 }}>
            {syncing ? 'Creating...' : 'Create Task'}
          </button>
        </footer>
      </form>
    </div>
  )
}

