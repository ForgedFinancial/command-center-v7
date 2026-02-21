const COLORS = ['#00d4ff', '#3b82f6', '#8b5cf6', '#a855f7', '#ef4444', '#f59e0b', '#f97316', '#4ade80', '#10b981', '#71717a']

export default function ColumnEditor({ columnId, onSelectColor, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        padding: '20px', borderRadius: '12px',
        background: 'var(--theme-surface)', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '12px' }}>
          Column Color
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '200px' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => onSelectColor(c)}
              style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: c, cursor: 'pointer',
                border: '2px solid transparent',
                transition: 'border 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.border = '2px solid #fff' }}
              onMouseOut={(e) => { e.currentTarget.style.border = '2px solid transparent' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
