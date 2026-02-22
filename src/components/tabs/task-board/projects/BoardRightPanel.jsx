import { BOARD_THEME } from './boardConstants'

const notePalette = ['yellow', 'cyan', 'green', 'pink', 'orange', 'purple', 'red', 'white', 'dark']

export default function BoardRightPanel({ item, onPatch, onLayerAction }) {
  if (!item) return null

  const setNum = (field, value) => onPatch({ [field]: Number.isFinite(Number(value)) ? Number(value) : 0 })
  const setStyle = (patch) => onPatch({ style: { ...(item.style || {}), ...patch } })

  return (
    <aside style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 300, background: BOARD_THEME.panelBg, borderLeft: `1px solid ${BOARD_THEME.border}`, padding: 12, zIndex: 90, color: BOARD_THEME.textPrimary, overflowY: 'auto', fontFamily: BOARD_THEME.uiFont }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: BOARD_THEME.textSecondary, fontFamily: BOARD_THEME.monoFont }}>Properties ({item.type})</h4>

      {item.type === 'connector' ? (
        <>
          <label>Stroke Color <input value={item.style?.strokeColor || '#06b6d4'} onChange={(e) => onPatch({ style: { strokeColor: e.target.value } })} /></label>
          <label>Stroke Width <input type="number" value={item.style?.strokeWidth || 1.5} onChange={(e) => onPatch({ style: { strokeWidth: Number(e.target.value) || 1.5 } })} /></label>
          <label>Style
            <select value={item.style?.strokeStyle === 'dashed' ? 'dashed' : 'solid'} onChange={(e) => onPatch({ style: { strokeStyle: e.target.value } })}>
              <option value="solid">solid</option><option value="dashed">dashed</option>
            </select>
          </label>
          <label>Start Cap
            <select value={item.style?.startCap || 'none'} onChange={(e) => onPatch({ style: { startCap: e.target.value } })}>
              <option value="none">none</option><option value="arrow">arrow</option><option value="dot">dot</option>
            </select>
          </label>
          <label>End Cap
            <select value={item.style?.endCap || 'none'} onChange={(e) => onPatch({ style: { endCap: e.target.value } })}>
              <option value="none">none</option><option value="arrow">arrow</option><option value="dot">dot</option>
            </select>
          </label>
          <label>Routing
            <select value={item.routing || 'curved'} onChange={(e) => onPatch({ routing: e.target.value })}>
              <option value="straight">straight</option><option value="elbow">elbow</option><option value="curved">curved</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>X<input value={Math.round(item.x)} onChange={(e) => setNum('x', e.target.value)} /></label>
            <label>Y<input value={Math.round(item.y)} onChange={(e) => setNum('y', e.target.value)} /></label>
            <label>W<input value={Math.round(item.width)} onChange={(e) => setNum('width', e.target.value)} /></label>
            <label>H<input value={Math.round(item.height)} onChange={(e) => setNum('height', e.target.value)} /></label>
            <label style={{ gridColumn: 'span 2' }}>Rotation<input value={Math.round(item.rotation || 0)} onChange={(e) => setNum('rotation', e.target.value)} /></label>
          </div>

          {(item.type === 'sticky_note' || item.type === 'text' || item.type === 'shape' || item.type === 'card') && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block' }}>Text / Content</label>
              <textarea value={item.content || ''} onChange={(e) => onPatch({ content: e.target.value })} style={{ width: '100%', minHeight: 90 }} />
            </div>
          )}

          {item.type === 'sticky_note' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <label>Color
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {notePalette.map((c) => <button key={c} onClick={() => setStyle({ fillColor: c })} style={{ width: 24, height: 24, borderRadius: 999, border: item.style?.fillColor === c ? `2px solid ${BOARD_THEME.accentCyan}` : '1px solid rgba(255,255,255,0.2)' }}>{c[0].toUpperCase()}</button>)}
                </div>
              </label>
              <label>Font Size<input type="number" value={item.style?.fontSize || 14} onChange={(e) => setStyle({ fontSize: Number(e.target.value) || 14 })} /></label>
              <label>Text Align<select value={item.style?.textAlign || 'left'} onChange={(e) => setStyle({ textAlign: e.target.value })}><option value="left">left</option><option value="center">center</option><option value="right">right</option></select></label>
            </div>
          )}

          {item.type === 'text' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <label>Font Family<input value={item.style?.fontFamily || BOARD_THEME.uiFont} onChange={(e) => setStyle({ fontFamily: e.target.value })} /></label>
              <label>Font Size<input type="number" value={item.style?.fontSize || 16} onChange={(e) => setStyle({ fontSize: Number(e.target.value) || 16 })} /></label>
              <label>Font Weight<select value={String(item.style?.fontWeight || 400)} onChange={(e) => setStyle({ fontWeight: Number(e.target.value) })}><option value="400">400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option></select></label>
              <label>Color<input value={item.style?.color || '#f9fafb'} onChange={(e) => setStyle({ color: e.target.value })} /></label>
              <label>Text Align<select value={item.style?.textAlign || 'left'} onChange={(e) => setStyle({ textAlign: e.target.value })}><option value="left">left</option><option value="center">center</option><option value="right">right</option></select></label>
            </div>
          )}

          {item.type === 'shape' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <label>Shape<select value={item.shape || 'rectangle'} onChange={(e) => onPatch({ shape: e.target.value })}><option value="rectangle">rectangle</option><option value="ellipse">ellipse</option></select></label>
              <label>Fill Color<input value={item.style?.fillColor || 'rgba(6,182,212,0.1)'} onChange={(e) => setStyle({ fillColor: e.target.value })} /></label>
              <label>Border Color<input value={item.style?.borderColor || '#06b6d4'} onChange={(e) => setStyle({ borderColor: e.target.value })} /></label>
              <label>Border Width<input type="number" value={item.style?.borderWidth || 2} onChange={(e) => setStyle({ borderWidth: Number(e.target.value) || 1 })} /></label>
              <label>Border Style<select value={item.style?.borderStyle || 'solid'} onChange={(e) => setStyle({ borderStyle: e.target.value })}><option value="solid">solid</option><option value="dashed">dashed</option></select></label>
            </div>
          )}

          {item.type === 'card' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <label>Status<select value={item.status || 'todo'} onChange={(e) => onPatch({ status: e.target.value })}><option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option></select></label>
              <label>Theme<input value={item.theme || 'default'} onChange={(e) => onPatch({ theme: e.target.value })} /></label>
              <label>Due Date<input type="date" value={item.dueDate || ''} onChange={(e) => onPatch({ dueDate: e.target.value })} /></label>
              <label>Assignee<input value={item.assignee || ''} onChange={(e) => onPatch({ assignee: e.target.value })} /></label>
              <label>Tags (comma separated)<input value={(item.tags || []).join(', ')} onChange={(e) => onPatch({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} /></label>
            </div>
          )}

          {item.type === 'frame' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <label>Title<input value={item.content || ''} onChange={(e) => onPatch({ content: e.target.value })} /></label>
              <label>Fill Color<input value={item.style?.fillColor || 'transparent'} onChange={(e) => setStyle({ fillColor: e.target.value })} /></label>
              <label>Border Color<input value={item.style?.borderColor || '#06b6d4'} onChange={(e) => setStyle({ borderColor: e.target.value })} /></label>
            </div>
          )}

          {item.type === 'document' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <label>Title<input value={item.content || ''} onChange={(e) => onPatch({ content: e.target.value })} /></label>
              <button onClick={() => onPatch({ _expandDoc: true })}>Edit Content</button>
            </div>
          )}

          {item.type === 'image' && <label>Image URL <input value={item.src || ''} onChange={(e) => onPatch({ src: e.target.value })} /></label>}

          <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
            <button onClick={() => onPatch({ locked: !item.locked })}>{item.locked ? 'Unlock' : 'Lock'} Item</button>
            <button onClick={() => onLayerAction?.('bringFront')}>Bring to Front</button>
            <button onClick={() => onLayerAction?.('bringForward')}>Bring Forward</button>
            <button onClick={() => onLayerAction?.('sendBackward')}>Send Backward</button>
            <button onClick={() => onLayerAction?.('sendBack')}>Send to Back</button>
          </div>
        </>
      )}
    </aside>
  )
}
