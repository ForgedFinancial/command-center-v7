import { BOARD_THEME } from './boardConstants'

export default function BoardMinimap({ viewport, items = [], onPanTo }) {
  const w = 180
  const h = 110
  const bounds = items.length
    ? {
      minX: Math.min(...items.map((i) => i.x)),
      minY: Math.min(...items.map((i) => i.y)),
      maxX: Math.max(...items.map((i) => i.x + i.width)),
      maxY: Math.max(...items.map((i) => i.y + i.height)),
    }
    : { minX: -600, minY: -400, maxX: 600, maxY: 400 }
  const bw = Math.max(1, bounds.maxX - bounds.minX)
  const bh = Math.max(1, bounds.maxY - bounds.minY)
  const scale = Math.min((w - 16) / bw, (h - 16) / bh)

  const viewportRect = {
    x: ((-viewport.x / viewport.zoom) - bounds.minX) * scale + 8,
    y: ((-viewport.y / viewport.zoom) - bounds.minY) * scale + 8,
    width: Math.max(18, (400 / viewport.zoom) * scale),
    height: Math.max(14, (260 / viewport.zoom) * scale),
  }

  const handleDrag = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const canvasX = (x - 8) / scale + bounds.minX
    const canvasY = (y - 8) / scale + bounds.minY
    onPanTo?.(canvasX, canvasY)
  }

  return (
    <div onPointerDown={handleDrag} onPointerMove={(e) => e.buttons === 1 && handleDrag(e)} style={{
      position: 'fixed', left: 16, bottom: 16, width: w, height: h, background: BOARD_THEME.panelBg,
      border: `1px solid ${BOARD_THEME.border}`, borderRadius: 10, zIndex: 100, overflow: 'hidden', cursor: 'grab',
    }}>
      <div style={{ position: 'absolute', inset: 8, border: `1px solid ${BOARD_THEME.border}`, borderRadius: 8, background: '#0d0d0d' }} />
      {items.map((item) => (
        <div key={item.id} style={{
          position: 'absolute',
          left: (item.x - bounds.minX) * scale + 8,
          top: (item.y - bounds.minY) * scale + 8,
          width: Math.max(2, item.width * scale),
          height: Math.max(2, item.height * scale),
          background: item.type === 'sticky_note' ? 'rgba(251,191,36,0.8)' : item.type === 'shape' ? 'rgba(6,182,212,0.7)' : 'rgba(148,163,184,0.7)',
          borderRadius: 2,
        }} />
      ))}
      <div style={{
        position: 'absolute', left: viewportRect.x, top: viewportRect.y, width: viewportRect.width, height: viewportRect.height,
        border: `1px solid ${BOARD_THEME.accentBlue}`, boxShadow: '0 0 12px rgba(59,130,246,0.3)', borderRadius: 4,
      }} />
    </div>
  )
}
