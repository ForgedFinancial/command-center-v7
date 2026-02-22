function point(item, side) {
  const cx = item.x + item.width / 2
  const cy = item.y + item.height / 2
  if (side === 'top') return { x: cx, y: item.y }
  if (side === 'bottom') return { x: cx, y: item.y + item.height }
  if (side === 'left') return { x: item.x, y: cy }
  if (side === 'right') return { x: item.x + item.width, y: cy }
  return { x: cx, y: cy }
}

function path(start, end, routing) {
  if (routing === 'straight') return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
  if (routing === 'elbow') {
    const midX = (start.x + end.x) / 2
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
  }
  const dx = Math.abs(end.x - start.x)
  const cp1 = { x: start.x + dx * 0.5, y: start.y }
  const cp2 = { x: end.x - dx * 0.5, y: end.y }
  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`
}

export default function ConnectorLayer({ items, connectors, selectedId, onSelect }) {
  const byId = new Map(items.map((i) => [i.id, i]))
  return (
    <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {connectors.map((connector) => {
        const from = byId.get(connector.startItem.id)
        const to = byId.get(connector.endItem.id)
        if (!from || !to) return null
        const start = point(from, connector.startItem.snapTo || 'auto')
        const end = point(to, connector.endItem.snapTo || 'auto')
        return (
          <path
            key={connector.id}
            d={path(start, end, connector.routing || 'curved')}
            stroke={connector.style?.strokeColor || '#06b6d4'}
            strokeWidth={connector.style?.strokeWidth || 1.5}
            strokeDasharray={connector.style?.strokeStyle === 'dashed' ? '6 4' : undefined}
            fill="none"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onSelect(connector.id) }}
            opacity={selectedId === connector.id ? 1 : 0.9}
          />
        )
      })}
    </svg>
  )
}
