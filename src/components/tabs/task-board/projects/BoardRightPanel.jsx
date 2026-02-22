import { BOARD_THEME } from './boardConstants'

export default function BoardRightPanel({ item, onPatch, onLayerAction }) {
  if (!item) return null

  const setNum = (field, value) => onPatch({ [field]: Number.isFinite(Number(value)) ? Number(value) : 0 })

  return (
    <aside style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 280, background: BOARD_THEME.panelBg, borderLeft: `1px solid ${BOARD_THEME.border}`, padding: 12, zIndex: 90, color: BOARD_THEME.textPrimary, overflowY: 'auto' }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: BOARD_THEME.textSecondary }}>Properties ({item.type})</h4>

      {item.type === 'connector' ? (
        <>
          <label>Routing
            <select value={item.routing || 'curved'} onChange={(e) => onPatch({ routing: e.target.value })}>
              <option value="straight">straight</option>
              <option value="elbow">elbow</option>
              <option value="curved">curved</option>
            </select>
          </label>
          <label>Stroke Color <input value={item.style?.strokeColor || '#06b6d4'} onChange={(e) => onPatch({ style: { strokeColor: e.target.value } })} /></label>
          <label>Stroke Width <input type="number" value={item.style?.strokeWidth || 1.5} onChange={(e) => onPatch({ style: { strokeWidth: Number(e.target.value) || 1.5 } })} /></label>
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
          {item.type === 'image' && <label>Image URL <input value={item.src || ''} onChange={(e) => onPatch({ src: e.target.value })} /></label>}
          {item.type === 'shape' && <label>Shape
            <select value={item.shape || 'rectangle'} onChange={(e) => onPatch({ shape: e.target.value })}><option value="rectangle">rectangle</option><option value="ellipse">ellipse</option></select>
          </label>}
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
