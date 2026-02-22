import { BOARD_THEME } from './boardConstants'

export default function BoardContextMenu({ menu, onAction, onClose }) {
  if (!menu) return null
  const actions = [
    ['bringFront', 'Bring to Front'],
    ['bringForward', 'Bring Forward'],
    ['sendBackward', 'Send Backward'],
    ['sendBack', 'Send to Back'],
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 110 }}>
      <div style={{ position: 'absolute', left: menu.x, top: menu.y, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', padding: 6, minWidth: 160 }}>
        {actions.map(([key, label]) => <button key={key} onClick={() => onAction(key)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', background: 'transparent', color: BOARD_THEME.textPrimary, border: 'none' }}>{label}</button>)}
      </div>
    </div>
  )
}
