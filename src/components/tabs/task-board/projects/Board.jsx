import { useMemo, useRef, useState } from 'react'
import BoardCanvas from './BoardCanvas'
import BoardMinimap from './BoardMinimap'
import BoardToolbar from './BoardToolbar'
import BoardTopbar from './BoardTopbar'
import { DEFAULT_ITEMS } from './boardConstants'
import useViewport from './hooks/useViewport'

export default function Board({ projectId }) {
  const containerRef = useRef(null)
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [selectedId, setSelectedId] = useState(DEFAULT_ITEMS[0]?.id || null)
  const [activeTool, setActiveTool] = useState('select')
  const [interaction, setInteraction] = useState(null)
  const { viewport, beginPan, onPointerMove: onPanMove, endPan, onWheel, centerOnOrigin, zoomIn, zoomOut } = useViewport(containerRef)

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId])

  if (!projectId) return null

  const createItem = (type = activeTool) => {
    const id = crypto.randomUUID()
    const base = { id, x: -60 + Math.random() * 120, y: -60 + Math.random() * 120, width: 220, height: 160, rotation: 0 }
    if (type === 'sticky_note') return { ...base, type, content: 'New sticky note', style: { fillColor: 'yellow', fontSize: 14 } }
    if (type === 'shape') return { ...base, type, width: 180, height: 120, shape: 'rectangle', content: 'Shape', style: { borderColor: '#06b6d4', borderWidth: 2, color: '#f9fafb' } }
    return { ...base, type: 'text', height: 80, content: 'New text', style: { fontSize: 16, color: '#f9fafb' } }
  }

  const onRootPointerDown = (event) => {
    if (beginPan(event)) return
    if (event.target === event.currentTarget) setSelectedId(null)
  }

  const onPointerMove = (event) => {
    onPanMove(event)
    if (!interaction) return
    const dx = (event.clientX - interaction.startX) / viewport.zoom
    const dy = (event.clientY - interaction.startY) / viewport.zoom
    setItems((prev) => prev.map((item) => {
      if (item.id !== interaction.id) return item
      if (interaction.type === 'move') return { ...item, x: interaction.origin.x + dx, y: interaction.origin.y + dy }
      if (interaction.type === 'resize') return { ...item, width: Math.max(40, interaction.origin.width + dx), height: Math.max(40, interaction.origin.height + dy) }
      if (interaction.type === 'rotate') return { ...item, rotation: interaction.origin.rotation + dx * 2 }
      return item
    }))
  }

  const onPointerUp = () => {
    endPan()
    setInteraction(null)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <BoardCanvas
        viewport={viewport}
        onPointerDown={onRootPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        items={items}
        selectedId={selectedId}
        onItemPointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item) return
          setSelectedId(id)
          setInteraction({ type: 'move', id, startX: event.clientX, startY: event.clientY, origin: { x: item.x, y: item.y } })
        }}
        onHandlePointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item) return
          setInteraction({ type: 'resize', id, startX: event.clientX, startY: event.clientY, origin: { width: item.width, height: item.height } })
        }}
        onRotatePointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item) return
          setInteraction({ type: 'rotate', id, startX: event.clientX, startY: event.clientY, origin: { rotation: item.rotation || 0 } })
        }}
        onDoubleClickCanvasItem={(id) => {
          setItems((prev) => prev.map((item) => item.id === id ? { ...item, content: `${item.content}` } : item))
        }}
      />
      <BoardToolbar
        activeTool={activeTool}
        onSetTool={setActiveTool}
        onAddItem={() => {
          const next = createItem(activeTool)
          setItems((prev) => [...prev, next])
          setSelectedId(next.id)
        }}
      />
      <BoardTopbar zoom={viewport.zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={centerOnOrigin} />
      <BoardMinimap viewport={viewport} />
    </div>
  )
}
