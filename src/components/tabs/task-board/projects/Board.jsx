import { useEffect, useMemo, useRef, useState } from 'react'
import BoardCanvas from './BoardCanvas'
import BoardMinimap from './BoardMinimap'
import BoardToolbar from './BoardToolbar'
import BoardTopbar from './BoardTopbar'
import BoardRightPanel from './BoardRightPanel'
import BoardContextMenu from './BoardContextMenu'
import BoardAIPanel from './BoardAIPanel'
import { BOARD_THEME, DEFAULT_ITEMS } from './boardConstants'
import useViewport from './hooks/useViewport'
import { screenToCanvas } from './boardUtils'

const SNAP_THRESHOLD = 6

function intersects(item, box) {
  const left = Math.min(box.x1, box.x2)
  const right = Math.max(box.x1, box.x2)
  const top = Math.min(box.y1, box.y2)
  const bottom = Math.max(box.y1, box.y2)
  return item.x < right && item.x + item.width > left && item.y < bottom && item.y + item.height > top
}

function moveByLayer(action, selectedSet, prev) {
  if (!selectedSet?.size) return prev
  if (action === 'bringFront') return [...prev.filter(i => !selectedSet.has(i.id)), ...prev.filter(i => selectedSet.has(i.id))]
  if (action === 'sendBack') return [...prev.filter(i => selectedSet.has(i.id)), ...prev.filter(i => !selectedSet.has(i.id))]
  if (selectedSet.size !== 1) return prev
  const id = [...selectedSet][0]
  const idx = prev.findIndex((i) => i.id === id)
  if (idx === -1) return prev
  const copy = [...prev]
  const [item] = copy.splice(idx, 1)
  if (action === 'bringForward') copy.splice(Math.min(copy.length, idx + 1), 0, item)
  if (action === 'sendBackward') copy.splice(Math.max(0, idx - 1), 0, item)
  return copy
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
  const [aiSeedPrompt, setAiSeedPrompt] = useState('')
  const [expandedDocId, setExpandedDocId] = useState(null)
  const [connectorDraft, setConnectorDraft] = useState(null)
  const [history, setHistory] = useState({ past: [], future: [] })
  const [historyLock, setHistoryLock] = useState(false)
  const [clipboard, setClipboard] = useState([])
  const [alignmentGuides, setAlignmentGuides] = useState([])
  const [highlightFrameId, setHighlightFrameId] = useState(null)
  const { viewport, setViewport, beginPan, onPointerMove: onPanMove, endPan, onWheel, centerOnOrigin, zoomIn, zoomOut } = useViewport(containerRef)

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
        if (data.viewport) setViewport(data.viewport)
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
  }, [projectId, setViewport])

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
  }, [projectId, items, connectors, viewport])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target?.closest('input,textarea,[contenteditable="true"]')) return
      const ctrl = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (ctrl && key === 'a') {
        event.preventDefault()
        setSelectedIds(new Set(items.map((item) => item.id)))
        return
      }
      if (ctrl && key === 'z') {
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
        return
      }
      if (ctrl && key === 'c') {
        event.preventDefault()
        setClipboard(items.filter((i) => selectedIds.has(i.id)).map((i) => ({ ...i })))
        return
      }
      if (ctrl && key === 'v') {
        event.preventDefault()
        if (!clipboard.length) return
        const map = new Map()
        const pasted = clipboard.map((i) => {
          const id = crypto.randomUUID()
          map.set(i.id, id)
          return { ...i, id, x: i.x + 20, y: i.y + 20 }
        }).map((i) => ({ ...i, parentId: i.parentId ? map.get(i.parentId) || i.parentId : i.parentId, childrenIds: i.childrenIds?.map((cid) => map.get(cid) || cid) }))
        setItems((prev) => [...prev, ...pasted])
        setSelectedIds(new Set(pasted.map((i) => i.id)))
        return
      }
      if (ctrl && key === 'd') { event.preventDefault(); setItems((prev) => ([...prev, ...prev.filter(i => selectedIds.has(i.id)).map(i => ({ ...i, id: crypto.randomUUID(), x: i.x + 24, y: i.y + 24 }))])); return }
      if (ctrl && key === 'g') { event.preventDefault(); if (event.shiftKey) setItems((prev) => prev.filter((i) => i.type !== 'group' || !selectedIds.has(i.id))); else {
        const members = items.filter((i) => selectedIds.has(i.id)); if (!members.length) return
        const minX = Math.min(...members.map(i => i.x)); const minY = Math.min(...members.map(i => i.y)); const maxX = Math.max(...members.map(i => i.x + i.width)); const maxY = Math.max(...members.map(i => i.y + i.height))
        const gid = crypto.randomUUID(); setItems((prev) => [...prev, { id: gid, type: 'group', x: minX - 16, y: minY - 24, width: maxX - minX + 32, height: maxY - minY + 40, content: 'Group', memberIds: members.map(m => m.id) }]); setSelectedIds(new Set([gid]))
      }; return }
      if (key === ']') { event.preventDefault(); setItems((prev) => moveByLayer('bringForward', selectedIds, prev)); return }
      if (key === '[') { event.preventDefault(); setItems((prev) => moveByLayer('sendBackward', selectedIds, prev)); return }
      if (ctrl && event.shiftKey && key === 'h') { event.preventDefault(); setSelectedIds(new Set()); return }
      if (['1', '2', '3', '4', '5'].includes(key)) {
        const zoomMap = { '1': 0.5, '2': 0.75, '3': 1, '4': 1.5, '5': 2 }
        setViewport((v) => ({ ...v, zoom: zoomMap[key] || v.zoom }))
      }
      if (event.key === 'Escape') {
        setSelectedIds(new Set())
        setActiveTool('select')
        setAiOpen(false)
        setAiSeedPrompt('')
        setContextMenu(null)
        setExpandedDocId(null)
        setSelectedConnectorId(null)
        setInteraction(null)
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)))
        setSelectedIds(new Set())
      }
      if (key === 'v') setActiveTool('select')
      if (key === 'h') setActiveTool('hand')
      if (key === 's') setActiveTool('sticky_note')
      if (key === 't') setActiveTool('text')
      if (key === 'r') setActiveTool('shape')
      if (key === 'c') setActiveTool('card')
      if (key === 'f') setActiveTool('frame')
      if (key === 'x') setActiveTool('connector')
      if (key === 'i') setActiveTool('image')
      if (key === 'm') setActiveTool('mindmap')
      if (key === 'a' && !ctrl) setAiOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items, selectedIds, clipboard, setViewport])

  if (!projectId) return null

  const createItem = (type = activeTool) => {
    const id = crypto.randomUUID()
    const base = { id, x: -60 + Math.random() * 120, y: -60 + Math.random() * 120, width: 220, height: 160, rotation: 0 }
    if (type === 'sticky_note') return { ...base, type, content: 'New sticky note', style: { fillColor: 'yellow', fontSize: 14 } }
    if (type === 'shape') return { ...base, type, width: 180, height: 120, shape: 'rectangle', content: 'Shape', style: { borderColor: '#06b6d4', borderWidth: 2, color: '#f9fafb' } }
    if (type === 'frame') return { ...base, type, width: 340, height: 240, content: 'Frame', childrenIds: [] }
    if (type === 'card') return { ...base, type, width: 280, height: 160, content: 'Card name', description: 'Describe work' }
    if (type === 'document') return { ...base, type, width: 320, height: 240, content: 'Document', markdown: '# Notes\nStart writing...' }
    if (type === 'image') return { ...base, type, width: 300, height: 180, name: 'Image', src: 'https://placehold.co/600x360/111827/f9fafb?text=Image' }
    if (type === 'ai_suggestion') return { ...base, type, width: 300, height: 180, content: 'AI suggestion', outputMode: 'text', agentId: 'mason' }
    if (type === 'group') return { ...base, type, width: 360, height: 260, content: 'Group', memberIds: [] }
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
    if (interaction?.type === 'connect-drag') {
      const point = screenToCanvas(event.clientX, event.clientY, viewport)
      setConnectorDraft((prev) => prev ? { ...prev, end: point } : prev)
      return
    }
    if (!interaction) return

    if (interaction.type === 'box') {
      const point = screenToCanvas(event.clientX, event.clientY, viewport)
      setSelectionBox((prev) => prev ? { ...prev, x2: point.x, y2: point.y } : prev)
      return
    }

    const dx = (event.clientX - interaction.startX) / viewport.zoom
    const dy = (event.clientY - interaction.startY) / viewport.zoom
    if (interaction.type === 'move') {
      let guides = []
      setItems((prev) => {
        const movedIds = interaction.ids
        const movedFrames = prev.filter((i) => i.type === 'frame' && movedIds.has(i.id))
        const movedChildren = new Set(movedFrames.flatMap((f) => f.childrenIds || []))
        const mutableIds = new Set([...movedIds, ...movedChildren])
        const moved = prev.map((item) => {
          if (!mutableIds.has(item.id) || item.locked) return item
          const origin = interaction.origins[item.id]
          if (!origin) return item
          return { ...item, x: origin.x + dx, y: origin.y + dy }
        })

        const anchorId = [...movedIds][0]
        const anchor = moved.find((i) => i.id === anchorId)
        if (!anchor) return moved
        const others = moved.filter((i) => !mutableIds.has(i.id))
        const a = { left: anchor.x, centerX: anchor.x + anchor.width / 2, right: anchor.x + anchor.width, top: anchor.y, centerY: anchor.y + anchor.height / 2, bottom: anchor.y + anchor.height }
        let snapX = 0
        let snapY = 0
        let minX = SNAP_THRESHOLD + 1
        let minY = SNAP_THRESHOLD + 1
        for (const other of others) {
          const b = { left: other.x, centerX: other.x + other.width / 2, right: other.x + other.width, top: other.y, centerY: other.y + other.height / 2, bottom: other.y + other.height }
          ;[['left', 'left'], ['centerX', 'centerX'], ['right', 'right']].forEach(([ka, kb]) => {
            const d = b[kb] - a[ka]
            if (Math.abs(d) < minX && Math.abs(d) <= SNAP_THRESHOLD) { minX = Math.abs(d); snapX = d; guides = [...guides.filter(g => g.axis !== 'x'), { axis: 'x', value: b[kb] }] }
          })
          ;[['top', 'top'], ['centerY', 'centerY'], ['bottom', 'bottom']].forEach(([ka, kb]) => {
            const d = b[kb] - a[ka]
            if (Math.abs(d) < minY && Math.abs(d) <= SNAP_THRESHOLD) { minY = Math.abs(d); snapY = d; guides = [...guides.filter(g => g.axis !== 'y'), { axis: 'y', value: b[kb] }] }
          })
        }
        if (!snapX && !snapY) return moved
        return moved.map((it) => mutableIds.has(it.id) ? { ...it, x: it.x + snapX, y: it.y + snapY } : it)
      })
      setAlignmentGuides(guides)

      const dragged = items.find((i) => interaction.ids.has(i.id))
      if (dragged && dragged.type !== 'frame') {
        const frame = items
          .filter((i) => i.type === 'frame' && !interaction.ids.has(i.id))
          .find((f) => dragged.x + dx > f.x && dragged.y + dy > f.y && dragged.x + dx + dragged.width < f.x + f.width && dragged.y + dy + dragged.height < f.y + f.height)
        setHighlightFrameId(frame?.id || null)
      }
      return
    }

    setItems((prev) => prev.map((item) => {
      if (!interaction.ids.has(item.id) || item.locked) return item
      const origin = interaction.origins[item.id]
      if (interaction.type === 'resize') return { ...item, width: Math.max(40, origin.width + dx), height: Math.max(40, origin.height + dy) }
      if (interaction.type === 'rotate') return { ...item, rotation: origin.rotation + dx * 2 }
      return item
    }))
  }

  const onPointerUp = () => {
    endPan()
    if (interaction?.type === 'connect-drag' && connectorDraft) {
      const target = items
        .filter((i) => i.id !== interaction.fromId)
        .map((i) => ({ i, d: Math.hypot((i.x + i.width / 2) - connectorDraft.end.x, (i.y + i.height / 2) - connectorDraft.end.y) }))
        .sort((a, b) => a.d - b.d)[0]
      if (target && target.d < 220) {
        setConnectors((prev) => [...prev, {
          id: crypto.randomUUID(),
          type: 'connector',
          startItem: { id: interaction.fromId, snapTo: interaction.fromSide || 'auto' },
          endItem: { id: target.i.id, snapTo: 'auto' },
          routing: 'curved',
          style: { strokeColor: '#06b6d4', strokeWidth: 1.5, strokeStyle: 'normal' },
        }])
      }
      setConnectorDraft(null)
    }
    if (interaction?.type === 'box' && selectionBox) {
      setSelectedIds(new Set(items.filter((item) => intersects(item, selectionBox)).map((item) => item.id)))
      setSelectionBox(null)
    }
    if (interaction?.type === 'move') {
      setItems((prev) => {
        const frames = prev.filter((i) => i.type === 'frame')
        const movedIds = interaction.ids
        const updated = prev.map((item) => {
          if (item.type === 'frame' || !movedIds.has(item.id)) return item
          const owner = frames.find((f) => item.x > f.x && item.y > f.y && item.x + item.width < f.x + f.width && item.y + item.height < f.y + f.height)
          return { ...item, parentId: owner?.id }
        })
        return updated.map((item) => item.type === 'frame' ? { ...item, childrenIds: updated.filter((c) => c.parentId === item.id).map((c) => c.id) } : item)
      })
    }
    setAlignmentGuides([])
    setHighlightFrameId(null)
    setInteraction(null)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', fontFamily: BOARD_THEME.uiFont }}>
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
        connectorDraft={connectorDraft}
        alignmentGuides={alignmentGuides}
        highlightFrameId={highlightFrameId}
        onStartConnector={(event, id, side) => {
          if (items.find((it) => it.id === id)?.locked) return
          const startItem = items.find((it) => it.id === id)
          if (!startItem) return
          const start = { x: startItem.x + startItem.width / 2, y: startItem.y + startItem.height / 2 }
          const point = screenToCanvas(event.clientX, event.clientY, viewport)
          setConnectorDraft({ start, end: point })
          setInteraction({ type: 'connect-drag', fromId: id, fromSide: side })
        }}
        onItemPointerDown={(event, id) => {
          event.stopPropagation()
          setContextMenu(null)
          const item = items.find((it) => it.id === id)
          if (!item || item.locked) return

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

          const memberOwner = items.find((candidate) => candidate.type === 'group' && candidate.memberIds?.includes(id))
          const clickIds = new Set(memberOwner ? [memberOwner.id, ...(memberOwner.memberIds || [])] : [id])
          const next = new Set(selectedIds)
          if (event.shiftKey) clickIds.forEach((cid) => { if (next.has(cid)) next.delete(cid); else next.add(cid) })
          else { next.clear(); clickIds.forEach((cid) => next.add(cid)) }

          const baseIds = next.size ? next : clickIds
          const withFrameChildren = new Set(baseIds)
          items.filter((i) => i.type === 'frame' && baseIds.has(i.id)).forEach((f) => (f.childrenIds || []).forEach((cid) => withFrameChildren.add(cid)))
          setSelectedIds(baseIds)

          const origins = {}
          withFrameChildren.forEach((sid) => {
            const target = items.find((it) => it.id === sid)
            if (target) origins[sid] = { x: target.x, y: target.y, width: target.width, height: target.height, rotation: target.rotation || 0 }
          })
          setInteraction({ type: 'move', ids: withFrameChildren, startX: event.clientX, startY: event.clientY, origins })
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
          if (!item || item.locked) return
          setInteraction({ type: 'resize', ids: new Set([id]), startX: event.clientX, startY: event.clientY, origins: { [id]: { width: item.width, height: item.height } } })
        }}
        onRotatePointerDown={(event, id) => {
          event.stopPropagation()
          const item = items.find((it) => it.id === id)
          if (!item || item.locked) return
          setInteraction({ type: 'rotate', ids: new Set([id]), startX: event.clientX, startY: event.clientY, origins: { [id]: { rotation: item.rotation || 0 } } })
        }}
        onItemContentChange={(id, content) => setItems((prev) => prev.map((item) => item.id === id ? { ...item, content } : item))}
        onAiAction={(action, aiItem) => {
          if (action === 'dismiss') setItems((prev) => prev.filter((item) => item.id !== aiItem.id))
          if (action === 'accept') setItems((prev) => prev.map((item) => item.id === aiItem.id ? { ...item, type: aiItem.outputMode === 'task_cards' ? 'card' : 'text' } : item))
          if (action === 'refine') { setAiSeedPrompt(aiItem.sourcePrompt || aiItem.content || ''); setAiOpen(true) }
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
      <BoardMinimap viewport={viewport} items={items} onPanTo={(canvasX, canvasY) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        setViewport((v) => ({ ...v, x: rect.width / 2 - canvasX * v.zoom, y: rect.height / 2 - canvasY * v.zoom }))
      }} />
      <BoardAIPanel
        open={aiOpen}
        initialPrompt={aiSeedPrompt}
        onClose={() => { setAiOpen(false); setAiSeedPrompt('') }}
        onGenerate={async ({ prompt, mode }) => {
          const contextItems = items.filter((i) => selectedIds.has(i.id)).map((i) => ({ id: i.id, type: i.type, content: i.content, x: i.x, y: i.y }))
          const resp = await fetch('/api/projects/ai-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, prompt, agentId: 'mason', outputMode: mode, contextItems }),
          })
          if (!resp.ok) return
          const data = await resp.json()
          const incoming = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [data])
          const generated = incoming.filter(Boolean).map((entry, idx) => ({
            id: crypto.randomUUID(),
            type: 'ai_suggestion',
            x: -20 + idx * 24,
            y: -20 + idx * 18,
            width: 300,
            height: 180,
            rotation: 0,
            content: entry.content || entry.text || prompt || 'AI suggestion',
            outputMode: entry.outputMode || mode,
            agentId: entry.agentId || 'mason',
            sourcePrompt: prompt,
            meta: entry,
          }))
          if (generated.length) setItems((prev) => [...prev, ...generated])
          setAiOpen(false)
          setAiSeedPrompt('')
        }}
      />
      {expandedDocId && (() => {
        const doc = items.find((i) => i.id === expandedDocId)
        if (!doc) return null
        return (
          <div style={{ position: 'fixed', inset: 20, background: BOARD_THEME.secondaryBg, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, zIndex: 130, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 10, fontFamily: BOARD_THEME.uiFont }}>
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
          const targetId = contextMenu?.id || selectedItem?.id
          if (!targetId) return
          setItems((prev) => moveByLayer(action, new Set([targetId]), prev))
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
          if (patch._expandDoc) { setExpandedDocId(selectedItem.id); return }
          setItems((prev) => prev.map((item) => item.id === selectedItem.id ? { ...item, ...patch } : item))
        }}
        onLayerAction={(action) => {
          if (!selectedItem) return
          setItems((prev) => moveByLayer(action, new Set([selectedItem.id]), prev))
        }}
      />
    </div>
  )
}
