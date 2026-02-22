import { BOARD_THEME } from './boardConstants'

export default function BoardTopbar({ zoom, onZoomIn, onZoomOut, onFit, onUndo, onRedo }) {
  return (
    <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', background: BOARD_THEME.panelBg, border: `1px solid ${BOARD_THEME.border}`, borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 100, color: BOARD_THEME.textPrimary, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <button onClick={onUndo}>Undo</button>
      <button onClick={onRedo}>Redo</button>
      <button onClick={onZoomOut}>-</button>
      <span style={{ minWidth: 58, textAlign: 'center', fontSize: 12 }}>{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn}>+</button>
      <button onClick={onFit}>Fit</button>
    </div>
  )
}
