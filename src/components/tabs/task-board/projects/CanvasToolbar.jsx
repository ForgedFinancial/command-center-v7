import { useState } from 'react'

const BG_PRESETS = [
  { id: 'dark-black', label: 'Dark', color: '#0a0a0f' },
  { id: 'lighter-black', label: 'Charcoal', color: '#1a1a24' },
  { id: 'dark-gray', label: 'Slate', color: '#2a2a35' },
  { id: 'off-white', label: 'Off-White', color: '#e8e6e1' },
  { id: 'white', label: 'White', color: '#ffffff' },
]

const GRID_OPTIONS = [
  { id: 'none', label: 'No Grid' },
  { id: 'dots', label: 'Dots' },
  { id: 'lines', label: 'Lines' },
  { id: 'cross', label: 'Crosshatch' },
]

export default function CanvasToolbar({
  search, onSearchChange,
  snap, onSnapToggle,
  zoom, onZoomChange,
  onNewProject,
  canvasBg, onBgChange,
  gridStyle, onGridStyleChange,
  showMinimap, onToggleMinimap,
  connectMode, onToggleConnect,
}) {
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [showGridPicker, setShowGridPicker] = useState(false)

  const isLight = ['#e8e6e1', '#ffffff'].includes(canvasBg)

  const controlStyle = {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--theme-text-primary)',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  }

  const dropdownStyle = {
    position: 'absolute', top: '100%', left: 0, zIndex: 40,
    marginTop: '6px', padding: '8px',
    background: 'var(--theme-surface)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    minWidth: '160px',
  }

  return (
    <div style={{
      position: 'sticky',
      top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 16px',
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)', marginRight: '8px' }}>
        Project Hub
      </h2>

      {/* Search */}
      <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search projects..."
        style={{ ...controlStyle, flex: '0 1 220px', cursor: 'text' }}
      />

      {/* Snap toggle */}
      <button onClick={onSnapToggle}
        style={{
          ...controlStyle,
          background: snap ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
          color: snap ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
          borderColor: snap ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)',
        }}
        title="Snap to grid">
        ⊞ Snap
      </button>

      {/* Background picker */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setShowBgPicker(!showBgPicker); setShowGridPicker(false) }}
          style={controlStyle} title="Canvas background">
          🎨 BG
        </button>
        {showBgPicker && (
          <div style={dropdownStyle} onMouseLeave={() => setShowBgPicker(false)}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Background
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {BG_PRESETS.map(bg => (
                <button key={bg.id} onClick={() => { onBgChange(bg.color); setShowBgPicker(false) }}
                  title={bg.label}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: bg.color, cursor: 'pointer',
                    border: canvasBg === bg.color
                      ? '2px solid var(--theme-accent)'
                      : bg.color === '#ffffff' || bg.color === '#e8e6e1'
                        ? '2px solid rgba(0,0,0,0.2)'
                        : '2px solid rgba(255,255,255,0.1)',
                    transition: 'border 0.15s',
                    position: 'relative',
                  }}>
                  {canvasBg === bg.color && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '8px' }}>
              {BG_PRESETS.find(b => b.color === canvasBg)?.label || 'Custom'}
            </div>
          </div>
        )}
      </div>

      {/* Grid style picker */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setShowGridPicker(!showGridPicker); setShowBgPicker(false) }}
          style={{
            ...controlStyle,
            background: gridStyle !== 'none' ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
            color: gridStyle !== 'none' ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
            borderColor: gridStyle !== 'none' ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)',
          }}
          title="Grid style">
          ⊞ Grid
        </button>
        {showGridPicker && (
          <div style={dropdownStyle} onMouseLeave={() => setShowGridPicker(false)}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Grid Style
            </div>
            {GRID_OPTIONS.map(opt => (
              <button key={opt.id}
                onClick={() => { onGridStyleChange(opt.id); setShowGridPicker(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', borderRadius: '6px',
                  background: gridStyle === opt.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none', color: gridStyle === opt.id ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: gridStyle === opt.id ? 600 : 400,
                }}
                onMouseOver={(e) => { if (gridStyle !== opt.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseOut={(e) => { if (gridStyle !== opt.id) e.currentTarget.style.background = 'transparent' }}
              >
                {gridStyle === opt.id ? '● ' : '○ '}{opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))} style={controlStyle}>−</button>
        <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => onZoomChange(Math.min(2, zoom + 0.1))} style={controlStyle}>+</button>
      </div>

      {/* Connect mode toggle */}
      <button
        onClick={onToggleConnect}
        style={{
          ...controlStyle,
          background: connectMode ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
          color: connectMode ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
          borderColor: connectMode ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)',
        }}
        title="Draw connector line (L)"
      >
        🔗 Connect
      </button>

      {/* Minimap toggle */}
      <button
        onClick={onToggleMinimap}
        style={{
          ...controlStyle,
          background: showMinimap ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
          color: showMinimap ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
          borderColor: showMinimap ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)',
        }}
        title="Toggle minimap (M)"
      >
        🗺 Map
      </button>

      <div style={{ flex: 1 }} />

      {/* New Project */}
      <button onClick={() => onNewProject(null)}
        style={{
          padding: '7px 16px', borderRadius: '8px',
          border: '1px solid var(--theme-accent)',
          background: 'var(--theme-accent-muted)',
          color: 'var(--theme-accent)',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        }}>
        + New Project
      </button>
    </div>
  )
}
