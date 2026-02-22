import DelayedTooltip from './components/DelayedTooltip'

function ToolButton({ label, onClick, active = false, tooltip }) {
  return (
    <DelayedTooltip label={tooltip} delay={150}>
      <button
        onClick={onClick}
        className={active ? 'toolbar-btn is-active' : 'toolbar-btn'}
        style={{
          height: 32,
          padding: '0 10px',
          borderRadius: 9,
          border: active ? '1px solid rgba(0,212,255,0.56)' : '1px solid rgba(154,167,188,0.24)',
          background: active ? 'rgba(0,212,255,0.12)' : '#0E1320',
          color: active ? '#00D4FF' : '#E6EDF7',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    </DelayedTooltip>
  )
}

export default function CanvasToolbar({
  mode = 'hub',
  title,
  search,
  onSearchChange,
  snap,
  onSnapToggle,
  zoom,
  onZoomChange,
  onZoomReset,
  onZoomFit,
  canvasBg,
  onBgChange,
  gridStyle,
  onGridStyleChange,
  showMinimap,
  onToggleMinimap,
  connectMode,
  onToggleConnect,
  onPanToggle,
  panMode,
  onNewProject,
}) {
  return (
    <div
      className={mode === 'inner' ? 'canvas-toolbar canvas-toolbar--inner' : 'canvas-toolbar canvas-toolbar--hub'}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: 'rgba(7,9,15,0.92)',
        borderBottom: mode === 'inner' ? '1px solid rgba(0,212,255,0.42)' : '1px solid rgba(154,167,188,0.24)',
      }}
    >
      <div style={{ color: '#E6EDF7', fontWeight: 700, marginRight: 4 }}>{title || (mode === 'hub' ? 'Project Hub' : 'Project Canvas')}</div>

      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search"
        style={{ height: 32, borderRadius: 9, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', width: 180, padding: '0 10px', fontSize: 12 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))} style={{ height: 32, width: 32, borderRadius: 8, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', cursor: 'pointer' }}>-</button>
        <button onClick={onZoomFit} style={{ height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', cursor: 'pointer' }}>Fit</button>
        <span style={{ color: '#9AA7BC', minWidth: 46, textAlign: 'center', fontSize: 12 }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoomChange(Math.min(3, zoom + 0.1))} style={{ height: 32, width: 32, borderRadius: 8, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', cursor: 'pointer' }}>+</button>
        <button onClick={onZoomReset} style={{ height: 32, padding: '0 8px', borderRadius: 8, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', cursor: 'pointer' }}>Reset</button>
      </div>

      {mode === 'hub' && (
        <ToolButton label="Pan" onClick={onPanToggle} active={panMode} tooltip="Pan canvas" />
      )}

      {mode === 'inner' && (
        <ToolButton label={`Snap ${snap ? 'On' : 'Off'}`} onClick={onSnapToggle} active={snap} tooltip="Snap to grid (G)" />
      )}

      <ToolButton
        label="Grid"
        onClick={() => onGridStyleChange(gridStyle === 'dots' ? 'lines' : 'dots')}
        tooltip="Toggle dot grid"
      />
      <ToolButton
        label="BG"
        onClick={() => onBgChange(canvasBg === '#07090F' ? '#0E1320' : '#07090F')}
        tooltip="Toggle background color"
      />

      {mode === 'inner' && (
        <ToolButton label="Connect" onClick={onToggleConnect} active={connectMode} tooltip="Draw connections between elements (C)" />
      )}

      <ToolButton label="Map" onClick={onToggleMinimap} active={showMinimap} tooltip="Toggle minimap" />

      {mode === 'hub' && onNewProject && (
        <button onClick={onNewProject} className="new-project-btn" style={{ marginLeft: 'auto', height: 40, minWidth: 148, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(0,212,255,0.45)', background: 'rgba(0,212,255,0.16)', color: '#00D4FF', fontWeight: 700, cursor: 'pointer' }}>+ New Project</button>
      )}
    </div>
  )
}
