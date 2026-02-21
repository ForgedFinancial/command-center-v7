import { TEMPLATE_LIST } from '../../../../config/projectTemplates'

export default function CanvasToolbar({
  search, onSearchChange,
  snap, onSnapToggle,
  zoom, onZoomChange,
  onNewProject,
}) {
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

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 16px',
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Title */}
      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)', marginRight: '8px' }}>
        Project Hub
      </h2>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search projects..."
        style={{ ...controlStyle, flex: '0 1 220px', cursor: 'text' }}
      />

      {/* Snap toggle */}
      <button
        onClick={onSnapToggle}
        style={{
          ...controlStyle,
          background: snap ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
          color: snap ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
          borderColor: snap ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)',
        }}
        title="Snap to grid"
      >
        ⊞ Snap
      </button>

      {/* Zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))} style={controlStyle}>−</button>
        <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => onZoomChange(Math.min(2, zoom + 0.1))} style={controlStyle}>+</button>
      </div>

      <div style={{ flex: 1 }} />

      {/* New Project */}
      <button
        onClick={() => onNewProject(null)}
        style={{
          padding: '7px 16px',
          borderRadius: '8px',
          border: '1px solid var(--theme-accent)',
          background: 'var(--theme-accent-muted)',
          color: 'var(--theme-accent)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + New Project
      </button>
    </div>
  )
}
