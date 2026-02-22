export default function CanvasToolbar({
  search, onSearchChange,
  snap, onSnapToggle,
  zoom, onZoomChange,
  onZoomReset,
  onZoomFit,
  canvasBg, onBgChange,
  gridStyle, onGridStyleChange,
  showMinimap, onToggleMinimap,
  connectMode, onToggleConnect,
}) {
  const btn = { padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.24)', background: '#0E1320', color: '#E2E8F0', fontSize: 12, cursor: 'pointer' }
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(7,9,15,0.92)', borderBottom: '1px solid rgba(148,163,184,0.24)' }}>
      <div style={{ color: '#E2E8F0', fontWeight: 700 }}>Project Hub</div>
      <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder='Search' style={{ ...btn, width: 180 }} />
      <button onClick={onSnapToggle} style={btn}>Snap {snap ? 'On' : 'Off'}</button>
      <button onClick={() => onBgChange(canvasBg === '#07090F' ? '#0E1320' : '#07090F')} style={btn}>BG</button>
      <button onClick={() => onGridStyleChange(gridStyle === 'dots' ? 'lines' : 'dots')} style={btn}>Grid</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))} style={btn}>-</button>
        <button onClick={onZoomFit} style={btn}>Fit</button>
        <span style={{ color: '#94A3B8', minWidth: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoomChange(Math.min(3, zoom + 0.1))} style={btn}>+</button>
        <button onClick={onZoomReset} style={btn}>Reset</button>
      </div>
      <button onClick={onToggleConnect} style={{ ...btn, color: connectMode ? '#00D4FF' : '#E2E8F0' }}>Connect</button>
      <button onClick={onToggleMinimap} style={{ ...btn, color: showMinimap ? '#00D4FF' : '#E2E8F0' }}>Map</button>
    </div>
  )
}
