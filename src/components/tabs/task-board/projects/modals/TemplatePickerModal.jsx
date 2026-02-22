import { TEMPLATE_DATA } from '../templates/templateData'

export default function TemplatePickerModal({ open, onClose, onApply }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(7,9,15,0.72)' }}>
      <div style={{ width: 820, maxWidth: 'calc(100% - 32px)', margin: '70px auto 0', background: '#0E1320', border: '1px solid rgba(148,163,184,0.24)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#E2E8F0', marginBottom: 10 }}><b>Apply Template</b><button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>✕</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {TEMPLATE_DATA.map(t => (
            <button key={t.id} onClick={() => onApply(t)} style={{ height: 136, textAlign: 'left', border: '1px solid rgba(148,163,184,0.24)', borderTop: '2px solid #00D4FF', background: '#0E1320', borderRadius: 10, padding: 10, color: '#E2E8F0', cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
