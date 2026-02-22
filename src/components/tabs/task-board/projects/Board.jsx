import { useEffect, useMemo, useRef, useState } from 'react'
import BoardCanvas from './BoardCanvas'
import BoardMinimap from './BoardMinimap'
import BoardToolbar from './BoardToolbar'
import BoardTopbar from './BoardTopbar'
import BoardRightPanel from './BoardRightPanel'
import BoardContextMenu from './BoardContextMenu'
import BoardAIPanel from './BoardAIPanel'
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
  const [connectors, setConnectors] = useState([])
  const [selectedConnectorId, setSelectedConnectorId] = useState(null)
  const [interaction, setInteraction] = useState(null)
  const [selectionBox, setSelectionBox] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [expandedDocId, setExpandedDocId] = useState(null)
  const [history, setHistory] = useState({ past: [], future: [] })
  const [historyLock, setHistoryLock] = useState(false)
  const { viewport, beginPan, onPointerMove: onPanMove, endPan, onWheel, centerOnOrigin, zoomIn, zoomOut } = useViewport(containerRef)

  const selectedItem = useMemo(() => items.find((item) => selectedIds.has(item.id)), [items, selectedIds])

  useEffect(() => {
    const key = `board_${projectId}`
    const load = async () => {
      try {
        const resp = await fetch(`/api/projects/${projectId}/board`)
        if (!resp.ok) throw new Error('load failed')
        const data = await resp.json()
        setItems(data.items || [])
        setConnectors(data.connectors || [])
      } catch {
        const local = localStorage.getItem(key)
        if (local) {
          const data = JSON.parse(local)
          setItems(data.items || [])
          setConnectors(data.connectors || [])
        }
      }
    }
    load()
  }, [projectId])

  useEffect(() => {
    if (historyLock) return
    const snapshot = JSON.stringify({ items, connectors })
    setHistory((prev) => {
      if (prev.past[prev.past.length - 1] === snapshot) return prev
      const past = [...prev.past, snapshot].slice(-50)
      return { past, future: [] }
    })
  }, [items, connectors, historyLock])

  useEffect(() => {
    const key = `board_${projectId}`
    const payload = { items, connectors, viewport }
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/projects/${projectId}/board`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {}
      localStorage.setItem(key, JSON.stringify(payload))
    }, 500)
    return () => clearTimeout(timer)
  }, [projectId, items, connectors])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target?.closest('input,textarea,[contenteditable="true"]')) return
      const ctrl = event.metaKey || event.ctrlKey
      if (ctrl && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setSelectedIds(new Set(items.map((item) => item.id)))
      }
      if (ctrl && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        setHistoryLock(true)
        setHistory((prev) => {
          if (event.shiftKey) {
            if (!prev.future.length) return prev
            const next = prev.future[0]
            const parsed = JSON.parse(next)
            setItems(parsed.items || [])
            setConnectors(parsed.connectors || [])
            return { past: [...prev.past, next].slice(-50), future: prev.future.slice(1) }
          }
          if (prev.past.length < 2) return prev
          const current = prev.past[prev.past.length - 1]
          const back = prev.past[prev.past.length - 2]
          const parsed = JSON.parse(back)
          setItems(parsed.items || [])
          setConnectors(parsed.connectors || [])
          return { past: prev.past.slice(0, -1), future: [current, ...prev.future].slice(0, 50) }
        })
        setTimeout(() => setHistoryLock(false), 0)
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
      if (event.key.toLowerCase() === 'x') setActiveTool('connector')
      if (event.key.toLowerCase() === 'f') setActiveTool('frame')
      if (event.key.toLowerCase() === 'c') setActiveTool('card')
      if (event.key.toLowerCase() === 'a') setAiOpen(true)
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
    if (type === 'frame') return { ...base, type, width: 340, height: 240, content: 'Frame', childrenIds: [] }
    if (type === 'card') return { ...base, type, width: 280, height: 160, content: 'Task card', description: 'Describe work' }
    if (type === 'document') return { ...base, type, width: 320, height: 240, content: 'Document', markdown: '# Notes\nStart writing...' }
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
    if (interaction?.type === 'move') {
      setItems((prev) => {
        const frames = prev.filter((i) => i.type === 'frame')
        return prev.map((item) => {
          if (item.type === 'frame' || !interaction.ids.has(item.id)) return item
          const owner = frames.find((f) => item.x > f.x && item.y > f.y && item.x + item.width < f.x + f.width && item.y + item.height < f.y + f.height)
          return { ...item, parentId: owner?.id }
        }).map((item) => item.type === 'frame' ? { ...item, childrenIds: prev.filter((c) => c.parentId === item.id).map((c) => c.id) } : item)
      })
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
        connectors={connectors}
        selectedIds={selectedIds}
        selectedConnectorId={selectedConnectorId}
        onSelectConnector={setSelectedConnectorId}
        selectionBox={selectionBox}
        onItemPointerDown={(event, id) => {
          event.stopPropagation()
          setContextMenu(null)
          const item = items.find((it) => it.id === id)
          if (!item) return

          if (activeTool === 'connector') {
            if (interaction?.type === 'connect' && interaction.fromId !== id) {
              setConnectors((prev) => [...prev, {
                id: crypto.randomUUID(),
                type: 'connector',
                startItem: { id: interaction.fromId, snapTo: 'auto' },
                endItem: { id, snapTo: 'auto' },
                routing: 'curved',
                style: { strokeColor: '#06b6d4', strokeWidth: 1.5, strokeStyle: 'normal' },
              }])
              setInteraction(null)
            } else {
              setInteraction({ type: 'connect', fromId: id })
            }
            return
          }

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
        onItemContextMenu={(event, id) => {
          event.preventDefault()
          event.stopPropagation()
          setSelectedIds(new Set([id]))
          setContextMenu({ x: event.clientX, y: event.clientY, id })
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
        onItemContentChange={(id, content) => setItems((prev) => prev.map((item) => item.id === id ? { ...item, content } : item))}
        onAiAction={(action, aiItem) => {
          if (action === 'dismiss') setItems((prev) => prev.filter((item) => item.id !== aiItem.id))
          if (action === 'accept') setItems((prev) => prev.map((item) => item.id === aiItem.id ? { ...item, type: aiItem.outputMode === 'task_cards' ? 'card' : 'text' } : item))
        }}
        onDocumentExpand={(item) => setExpandedDocId(item.id)}
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
      <BoardTopbar
        zoom={viewport.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={centerOnOrigin}
        onUndo={() => {
          setHistoryLock(true)
          setHistory((prev) => {
            if (prev.past.length < 2) return prev
            const current = prev.past[prev.past.length - 1]
            const back = prev.past[prev.past.length - 2]
            const parsed = JSON.parse(back)
            setItems(parsed.items || [])
            setConnectors(parsed.connectors || [])
            return { past: prev.past.slice(0, -1), future: [current, ...prev.future].slice(0, 50) }
          })
          setTimeout(() => setHistoryLock(false), 0)
        }}
        onRedo={() => {
          setHistoryLock(true)
          setHistory((prev) => {
            if (!prev.future.length) return prev
            const next = prev.future[0]
            const parsed = JSON.parse(next)
            setItems(parsed.items || [])
            setConnectors(parsed.connectors || [])
            return { past: [...prev.past, next].slice(-50), future: prev.future.slice(1) }
          })
          setTimeout(() => setHistoryLock(false), 0)
        }}
      />
      <BoardMinimap viewport={viewport} />
      <BoardAIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={({ prompt, mode }) => {
          setItems((prev) => [...prev, {
            id: crypto.randomUUID(),
            type: 'ai_suggestion',
            x: -20,
            y: -20,
            width: 300,
            height: 180,
            rotation: 0,
            content: prompt || 'AI suggestion',
            outputMode: mode,
            agentId: 'mason',
          }])
          setAiOpen(false)
        }}
      />
      {expandedDocId && (() => {
        const doc = items.find((i) => i.id === expandedDocId)
        if (!doc) return null
        return (
          <div style={{ position: 'fixed', inset: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, zIndex: 130, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 10 }}>
            <textarea value={doc.markdown || ''} onChange={(e) => setItems((prev) => prev.map((item) => item.id === doc.id ? { ...item, markdown: e.target.value } : item))} style={{ width: '100%', height: '100%' }} />
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#f9fafb' }}>{doc.markdown}</pre>
            <button onClick={() => setExpandedDocId(null)} style={{ position: 'absolute', right: 12, top: 12 }}>Close</button>
          </div>
        )
      })()}
      <BoardContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAction={(action) => {
          if (!contextMenu?.id) return
          setItems((prev) => {
            const idx = prev.findIndex((i) => i.id === contextMenu.id)
            if (idx === -1) return prev
            const copy = [...prev]
            const [item] = copy.splice(idx, 1)
            if (action === 'bringFront') copy.push(item)
            else if (action === 'sendBack') copy.unshift(item)
            else if (action === 'bringForward') copy.splice(Math.min(copy.length, idx + 1), 0, item)
            else if (action === 'sendBackward') copy.splice(Math.max(0, idx - 1), 0, item)
            return copy
          })
          setContextMenu(null)
        }}
      />
      <BoardRightPanel
        item={selectedConnectorId ? connectors.find((c) => c.id === selectedConnectorId) : selectedItem}
        onPatch={(patch) => {
          if (selectedConnectorId) {
            setConnectors((prev) => prev.map((c) => c.id === selectedConnectorId ? { ...c, ...patch, style: { ...c.style, ...patch.style } } : c))
            return
          }
          if (!selectedItem) return
          setItems((prev) => prev.map((item) => item.id === selectedItem.id ? { ...item, ...patch } : item))
        }}
      />
    </div>
  )
}
