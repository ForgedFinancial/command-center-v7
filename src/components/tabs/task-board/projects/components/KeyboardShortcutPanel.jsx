const SHORTCUTS = [
  ['V', 'Select tool'],
  ['T', 'Task tool'],
  ['N', 'Note tool'],
  ['S', 'Shape tool'],
  ['Esc', 'Cancel placement'],
  ['Ctrl/Cmd + Z', 'Undo last object action'],
  ['G', 'Snap to grid'],
  ['C', 'Connect mode'],
  ['?', 'Open shortcuts'],
]

export default function KeyboardShortcutPanel({ open, onClose }) {
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(7,9,15,0.80)' }}>
      <div style={{ width: 480, maxWidth: 'calc(100% - 32px)', margin: '92px auto 0', borderRadius: 16, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', boxShadow: '0 18px 40px rgba(0,0,0,0.46)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(154,167,188,0.20)' }}>
          <strong style={{ fontSize: 14, color: '#E6EDF7' }}>Keyboard Shortcuts</strong>
          <button onClick={onClose} style={{ border: '1px solid rgba(154,167,188,0.24)', background: 'transparent', color: '#9AA7BC', width: 28, height: 28, borderRadius: 8, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 8 }}>
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(154,167,188,0.18)', borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ color: '#E6EDF7', fontSize: 12 }}>{label}</span>
              <kbd style={{ fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, monospace', fontSize: 11, color: '#00D4FF', background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 6, padding: '2px 8px' }}>{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
