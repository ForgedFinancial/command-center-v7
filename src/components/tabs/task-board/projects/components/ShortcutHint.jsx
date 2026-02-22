export default function ShortcutHint({ visible, text }) {
  if (!visible) return null
  return (
    <div
      className="shortcut-hint"
      style={{
        position: 'sticky',
        bottom: 8,
        marginTop: 'auto',
        borderRadius: 10,
        border: '1px solid rgba(0,212,255,0.35)',
        background: 'rgba(0,212,255,0.10)',
        color: '#A7F3FF',
        fontSize: 11,
        fontWeight: 600,
        padding: '8px 10px',
        lineHeight: 1.35,
      }}
    >
      {text}
    </div>
  )
}
