import { useState } from 'react'
import { ALL_CARD_FIELDS, DEFAULT_CARD_FIELDS, MAX_CUSTOM_FIELDS } from './pipelineHelpers'

export default function CardFieldSettings({ fields, allFields, onSave, onClose, currentMode }) {
  const ALL_FIELDS = allFields || ALL_CARD_FIELDS
  const [selected, setSelected] = useState([...fields])
  const isSelected = (key) => selected.includes(key)
  const toggle = (key) => {
    if (isSelected(key)) setSelected(selected.filter(k => k !== key))
    else if (selected.length < MAX_CUSTOM_FIELDS) setSelected([...selected, key])
  }
  const moveUp = (idx) => { if (idx <= 0) return; const next = [...selected]; [next[idx-1], next[idx]] = [next[idx], next[idx-1]]; setSelected(next) }
  const moveDown = (idx) => { if (idx >= selected.length - 1) return; const next = [...selected]; [next[idx], next[idx+1]] = [next[idx+1], next[idx]]; setSelected(next) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '440px', maxHeight: '80vh', overflow: 'auto', background: 'var(--theme-surface)', borderRadius: '16px', border: '1px solid var(--theme-border)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>⚙️ Card Fields <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--theme-accent)', marginLeft: '8px' }}>({currentMode === 'new' ? '🆕 New Leads' : currentMode === 'aged' ? '📜 Aged Leads' : '📋 All Leads'})</span></h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '12px' }}>
          Select up to {MAX_CUSTOM_FIELDS} fields. Name is always shown.
        </div>
        {selected.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active ({selected.length}/{MAX_CUSTOM_FIELDS})</div>
            {selected.map((key, idx) => {
              const field = ALL_FIELDS.find(f => f.key === key)
              if (!field) return null
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--theme-accent-muted)', border: '1px solid var(--theme-accent)', borderRadius: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px' }}>{field.icon}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>{field.label}</span>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#71717a', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '2px 4px' }}>▲</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === selected.length - 1} style={{ background: 'none', border: 'none', color: idx === selected.length - 1 ? '#333' : '#71717a', cursor: idx === selected.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '2px 4px' }}>▼</button>
                  <button onClick={() => toggle(key)} style={{ background: 'none', border: 'none', color: 'var(--theme-error)', cursor: 'pointer', fontSize: '12px', padding: '2px 4px' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</div>
        {ALL_FIELDS.filter(f => !isSelected(f.key)).map(field => (
          <div key={field.key} onClick={() => toggle(field.key)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
            background: 'var(--theme-bg)', border: '1px solid var(--theme-border-subtle)',
            borderRadius: '8px', marginBottom: '4px', cursor: selected.length >= MAX_CUSTOM_FIELDS ? 'default' : 'pointer',
            opacity: selected.length >= MAX_CUSTOM_FIELDS ? 0.4 : 1,
          }}>
            <span style={{ fontSize: '13px' }}>{field.icon}</span>
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--theme-text-secondary)' }}>{field.label}</span>
            <span style={{ fontSize: '11px', color: 'var(--theme-success)' }}>+ Add</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { onSave(selected.length > 0 ? selected : DEFAULT_CARD_FIELDS) }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}
