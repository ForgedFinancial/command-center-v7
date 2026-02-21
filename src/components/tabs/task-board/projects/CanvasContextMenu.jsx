import { useState } from 'react'

const STICKY_COLORS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Pink', color: '#fda4af' },
  { name: 'Blue', color: '#93c5fd' },
  { name: 'Green', color: '#86efac' },
  { name: 'Orange', color: '#fdba74' },
  { name: 'Purple', color: '#c4b5fd' },
]

const PROJECT_COLORS = ['#00d4ff', '#3b82f6', '#8b5cf6', '#a855f7', '#ef4444', '#f59e0b', '#f97316', '#4ade80', '#10b981', '#71717a']

const SEP = '---'

function MenuItem({ icon, label, onClick, color, disabled }) {
  if (label === SEP) return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
      padding: '7px 14px', background: 'none', border: 'none',
      color: disabled ? 'rgba(255,255,255,0.2)' : (color || 'var(--theme-text-primary)'),
      fontSize: '12px', cursor: disabled ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit',
      borderRadius: '4px', opacity: disabled ? 0.5 : 1,
    }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseOut={(e) => { e.currentTarget.style.background = 'none' }}
    >
      <span style={{ width: '18px', textAlign: 'center' }}>{icon}</span>
      {label}
    </button>
  )
}

function ColorSubmenu({ colors, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px 14px', maxWidth: '180px' }}>
      {colors.map(c => {
        const col = typeof c === 'string' ? c : c.color
        return (
          <div key={col} onClick={() => onSelect(col)} style={{
            width: '22px', height: '22px', borderRadius: '4px', background: col, cursor: 'pointer',
            border: '2px solid transparent', transition: 'border 0.1s',
          }}
            onMouseOver={(e) => e.currentTarget.style.border = '2px solid #fff'}
            onMouseOut={(e) => e.currentTarget.style.border = '2px solid transparent'}
          />
        )
      })}
    </div>
  )
}

export default function CanvasContextMenu({ x, y, target, onClose, onAction }) {
  const [submenu, setSubmenu] = useState(null)

  const handle = (action, data) => {
    onAction(action, data)
    onClose()
  }

  let items = []

  if (!target || target.type === 'canvas') {
    items = [
      { icon: '📝', label: 'Add Sticky Note', action: 'addSticky' },
      { icon: '📋', label: 'Add Frame', action: 'addFrame' },
      { icon: '✏️', label: 'Add Text Label', action: 'addText' },
      { icon: '🔗', label: 'Draw Connector', action: 'addConnector' },
      { icon: '', label: SEP },
      { icon: '📁', label: 'New Project', action: 'newProject' },
      { icon: '🔲', label: 'Select All', action: 'selectAll' },
    ]
  } else if (target.type === 'project') {
    items = [
      { icon: '📂', label: 'Open Project', action: 'openProject' },
      { icon: '🎨', label: 'Change Color', action: 'showColorSubmenu', submenu: 'projectColor' },
      { icon: '📋', label: 'Duplicate', action: 'duplicate' },
    ]
  } else if (target.type === 'sticky') {
    items = [
      { icon: '✏️', label: 'Edit', action: 'editSticky' },
      { icon: '🎨', label: 'Change Color', action: 'showColorSubmenu', submenu: 'stickyColor' },
      { icon: '🗑️', label: 'Delete', action: 'deleteObject', color: '#ef4444' },
    ]
  } else if (target.type === 'frame') {
    items = [
      { icon: '✏️', label: 'Rename', action: 'editFrame' },
      { icon: '🗑️', label: 'Delete Frame', action: 'deleteObject', color: '#ef4444' },
    ]
  } else if (target.type === 'text') {
    items = [
      { icon: '✏️', label: 'Edit', action: 'editText' },
      { icon: '🗑️', label: 'Delete', action: 'deleteObject', color: '#ef4444' },
    ]
  } else if (target.type === 'connector') {
    const connData = target.data?.data || {}
    items = [
      {
        icon: '〰', label: `Style: ${connData.style || 'curved'}`, action: 'showStyleSubmenu',
        submenu: 'connectorStyle',
      },
      {
        icon: '➡', label: `Arrows: ${connData.arrow || 'end'}`, action: 'showArrowSubmenu',
        submenu: 'connectorArrow',
      },
      { icon: '', label: SEP },
      { icon: '🗑️', label: 'Delete Connector', action: 'deleteObject', color: '#ef4444' },
    ]
  }

  const clampX = Math.min(x, window.innerWidth - 210)
  const clampY = Math.min(y, window.innerHeight - items.length * 32 - 30)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
      <div style={{
        position: 'fixed', left: clampX, top: clampY, zIndex: 999,
        minWidth: '190px', padding: '6px 0',
        background: 'var(--theme-surface)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }}>
        {items.map((item, i) => {
          if (item.label === SEP) return <MenuItem key={i} label={SEP} />
          if (item.submenu) {
            // Connector style submenu
            if (item.submenu === 'connectorStyle') {
              return (
                <div key={i}>
                  <MenuItem icon={item.icon} label={item.label}
                    onClick={() => setSubmenu(submenu === item.submenu ? null : item.submenu)} />
                  {submenu === item.submenu && (
                    <div style={{ paddingLeft: '14px', paddingBottom: '4px' }}>
                      {['straight', 'curved', 'step'].map(s => (
                        <MenuItem key={s} icon="→" label={s.charAt(0).toUpperCase() + s.slice(1)}
                          onClick={() => handle('updateConnector', { style: s })} />
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            if (item.submenu === 'connectorArrow') {
              return (
                <div key={i}>
                  <MenuItem icon={item.icon} label={item.label}
                    onClick={() => setSubmenu(submenu === item.submenu ? null : item.submenu)} />
                  {submenu === item.submenu && (
                    <div style={{ paddingLeft: '14px', paddingBottom: '4px' }}>
                      {[{ val: 'none', label: 'No arrows' }, { val: 'end', label: 'Arrow at end →' }, { val: 'both', label: '↔ Both ends' }].map(opt => (
                        <MenuItem key={opt.val} icon="•" label={opt.label}
                          onClick={() => handle('updateConnector', { arrow: opt.val })} />
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            // Color submenus
            return (
              <div key={i}>
                <MenuItem icon={item.icon} label={item.label}
                  onClick={() => setSubmenu(submenu === item.submenu ? null : item.submenu)} />
                {submenu === item.submenu && (
                  <ColorSubmenu
                    colors={item.submenu === 'stickyColor' ? STICKY_COLORS : PROJECT_COLORS}
                    onSelect={(c) => handle('changeColor', { color: c })}
                  />
                )}
              </div>
            )
          }
          return (
            <MenuItem key={i} icon={item.icon} label={item.label} color={item.color}
              onClick={() => handle(item.action, item.data)} />
          )
        })}
      </div>
    </>
  )
}
