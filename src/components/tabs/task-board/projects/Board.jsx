import { useEffect, useMemo, useRef, useState } from 'react'
import BoardCanvas from './BoardCanvas'
import BoardMinimap from './BoardMinimap'
import BoardToolbar from './BoardToolbar'
import BoardTopbar from './BoardTopbar'
import { DEFAULT_ITEMS } from './boardConstants'
import useViewport from './hooks/useViewport'
import { screenToCanvas } from './boardUtils'

function intersects(item, box) {
  const left = Math.min(box.x1, box.x2)
  const right = Math.max(box.x1, box.x2)
  const top = Math.min(box.y1, box.y2)
  const bottom = Math.max(box.y1, box.y2)
  return item.x < right && item.x + item.width > left && item.y < bottom && item.y + item.height > top
}

export default function Board({ projectId }) {
  const containerRef = useRef(null)
  const [items, setItems] = useState(DEFAULT_ITEMS)
  const [selectedIds, setSelectedIds] = useState(new Set(DEFAULT_ITEMS[0]?.id ? [DEFAULT_ITEMS[0].id] : []))
  const [activeTool, setActiveTool] = useState('select')
  const [interaction, setInteraction] = useState(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const { viewport, beginPan, onPointerMove: onPanMove, endPan, onWheel, centerOnOrigin, zoomIn, zoomOut } = useViewport(containerRef)

  const selectedItem = useMemo(() => items.find((item) => selectedIds.has(item.id)), [items, selectedIds])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target?.closest('input,textarea,[contenteditable="true"]')) return
      const ctrl = event.metaKey || event.ctrlKey
      if (ctrl && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setSelectedIds(new Set(items.map((item) => item.id)))
      }
      if (event.key === 'Escape') setSelectedIds(new Set())
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)))
        setSelectedIds(new Set())
      }
      if (event.key.toLowerCase() === 'v') setActiveTool('select')
      if (event.key.toLowerCase() === 's') setActiveTool('sticky_note')
      if (event.key.toLowerCase() === 'r') setActiveTool('shape')
      if (event.key.toLowerCase() === 't') setActiveTool('text')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items, selectedIds])

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
    if (event.target === event.currentTarget) {
      const start = screenToCanvas(event.clientX, event.clientY, viewport)
      setSelectionBox({ x1: start.x, y1: start.y, x2: start.x, y2: start.y })
      setSelectedIds(new Set())
      setInteraction({ type: 'box' })
    }
  }

  const onPointerMove = (event) => {
    onPanMove(event)
    if (!interaction) return

    if (interaction.type === 'box') {
      const point = screenToCanvas(event.clientX, event.clientY, viewport)
      setSelectionBox((prev) => prev ? { ...prev, x2: point.x, y2: point.y } : prev)
      return
    }

    const dx = (event.clientX - interaction.startX) / viewport.zoom
    const dy = (event.clientY - interaction.startY) / viewport.zoom
    setItems((prev) => prev.map((item) => {
      if (!interaction.ids.has(item.id)) return item
      const origin = interaction.origins[item.id]
      if (interaction.type === 'move') return { ...item, x: origin.x + dx, y: origin.y + dy }
      if (interaction.type === 'resize') return { ...item, width: Math.max(40, origin.width + dx), height: Math.max(40, origin.height + dy) }
      if (interaction.type === 'rotate') return { ...item, rotation: origin.rotation + dx * 2 }
      return item
    }))
  }

  const onPointerUp = () => {
    endPan()
    if (interaction?.type === 'box' && selectionBox) {
      setSelectedIds(new Set(items.filter((item) => intersects(item, selectionBox)).map((item) => item.id)))
      setSelectionBox(null)
    }
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
        selectedIds={selectedIds}
        selectionBox={selectionBox}
        onItemPointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item) return
          const next = new Set(selectedIds)
          if (event.shiftKey) {
            if (next.has(id)) next.delete(id)
            else next.add(id)
          } else {
            next.clear()
            next.add(id)
          }
          setSelectedIds(next)
          const ids = next.size ? next : new Set([id])
          const origins = {}
          ids.forEach((sid) => {
            const target = items.find((it) => it.id === sid)
            if (target) origins[sid] = { x: target.x, y: target.y, width: target.width, height: target.height, rotation: target.rotation || 0 }
          })
          setInteraction({ type: 'move', ids, startX: event.clientX, startY: event.clientY, origins })
        }}
        onHandlePointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item) return
          setInteraction({ type: 'resize', ids: new Set([id]), startX: event.clientX, startY: event.clientY, origins: { [id]: { width: item.width, height: item.height } } })
        }}
        onRotatePointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item) return
          setInteraction({ type: 'rotate', ids: new Set([id]), startX: event.clientX, startY: event.clientY, origins: { [id]: { rotation: item.rotation || 0 } } })
        }}
        onDoubleClickCanvasItem={() => {}}
      />
      <BoardToolbar
        activeTool={activeTool}
        onSetTool={setActiveTool}
        onAddItem={() => {
          const next = createItem(activeTool)
          setItems((prev) => [...prev, next])
          setSelectedIds(new Set([next.id]))
        }}
      />
      <BoardTopbar zoom={viewport.zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={centerOnOrigin} />
      <BoardMinimap viewport={viewport} />
    </div>
  )
}
