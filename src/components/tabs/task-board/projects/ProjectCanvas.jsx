import { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasToolbar from './CanvasToolbar'
import CanvasGrid from './CanvasGrid'
import ProjectFolderCard from './ProjectFolderCard'
import ProjectCreateModal from './ProjectCreateModal'
import CanvasContextMenu from './CanvasContextMenu'
import CanvasStickyNote from './CanvasStickyNote'
import CanvasFrame from './CanvasFrame'
import CanvasTextLabel from './CanvasTextLabel'
import CanvasConnector from './CanvasConnector'
import CanvasMinimap from './CanvasMinimap'

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyCanvas({ onNewProject }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 5,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '2px dashed rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px 56px',
        maxWidth: '560px',
        textAlign: 'center',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗂️</div>
        <h2 style={{
          margin: '0 0 8px', fontSize: '20px', fontWeight: 700,
          color: 'var(--theme-text-primary)',
        }}>
          Welcome to Project Hub
        </h2>
        <p style={{
          margin: '0 0 24px', fontSize: '13px', lineHeight: 1.7,
          color: 'var(--theme-text-secondary)',
        }}>
          This is your visual workspace — like a digital whiteboard for organizing projects.
          Create project folders, drag them anywhere on the canvas, and open each one
          to reveal its own custom kanban board, files, and notes.
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
          marginBottom: '28px', textAlign: 'left',
        }}>
          {[
            { icon: '📁', title: 'Create Projects', desc: 'Choose from industry templates or start blank' },
            { icon: '🖱️', title: 'Drag & Arrange', desc: 'Position cards anywhere — snap-to-grid keeps things tidy' },
            { icon: '📝', title: 'Sticky Notes', desc: 'Right-click to add notes, reminders, and context' },
            { icon: '🔗', title: 'Connect & Frame', desc: 'Draw lines between projects and group with frames' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '12px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onNewProject}
          style={{
            padding: '12px 32px', borderRadius: '10px', border: 'none',
            background: 'var(--theme-accent)', color: '#fff',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,212,255,0.3)',
          }}
        >
          + Create Your First Project
        </button>
        <p style={{ margin: '16px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          Tip: Right-click for sticky notes & frames • Ctrl+Scroll to zoom • Drag empty space to pan
        </p>
      </div>
    </div>
  )
}

// ─── Lasso rectangle ─────────────────────────────────────────────────────────
function LassoRect({ lasso }) {
  if (!lasso) return null
  const x = Math.min(lasso.startX, lasso.curX)
  const y = Math.min(lasso.startY, lasso.curY)
  const w = Math.abs(lasso.curX - lasso.startX)
  const h = Math.abs(lasso.curY - lasso.startY)
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y, width: w, height: h,
      border: '2px dashed rgba(0,212,255,0.7)',
      background: 'rgba(0,212,255,0.05)',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: 100,
    }} />
  )
}

// ─── Selection count badge ────────────────────────────────────────────────────
function SelectionBadge({ count }) {
  if (count < 2) return null
  return (
    <div style={{
      position: 'fixed',
      top: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      padding: '6px 16px',
      borderRadius: '20px',
      background: 'var(--theme-accent)',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 700,
      boxShadow: '0 4px 16px rgba(0,212,255,0.4)',
      pointerEvents: 'none',
    }}>
      {count} items selected — Delete to remove • Drag to move
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProjectCanvas() {
  const { state, actions } = useTaskBoard()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [snap, setSnap] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [canvasBg, setCanvasBg] = useState(() => localStorage.getItem('projecthub-bg') || '#0a0a0f')
  const [gridStyle, setGridStyle] = useState(() => localStorage.getItem('projecthub-grid') || 'dots')
  const [contextMenu, setContextMenu] = useState(null)
  const [showMinimap, setShowMinimap] = useState(true)

  // ── Multi-select state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lasso, setLasso] = useState(null) // { startX, startY, curX, curY } in screen px (relative to canvas container)
  const isLassoing = useRef(false)
  const lassoStart = useRef({ x: 0, y: 0 })
  // Per-object positions at drag start (for group move)
  const groupDragBaseline = useRef(null) // { [id]: {x, y} }

  // ── Connect mode state ──────────────────────────────────────────────────────
  const [connectMode, setConnectMode] = useState({ active: false, sourceId: null })
  const [cursorPos, setCursorPos] = useState(null) // canvas logical coords

  // ── Pan state ───────────────────────────────────────────────────────────────
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartOffset = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  const viewportSize = useRef({ w: 0, h: 0 })

  // ── Undo/Redo stack ─────────────────────────────────────────────────────────
  const undoStack = useRef([]) // array of { undo, redo } action pairs
  const redoStack = useRef([])
  const MAX_STACK = 50

  function pushUndo(undoFn, redoFn) {
    undoStack.current.push({ undo: undoFn, redo: redoFn })
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift()
    redoStack.current = [] // clear redo on new action
  }

  const GRID_SIZE = 20

  const handleBgChange = (color) => { setCanvasBg(color); localStorage.setItem('projecthub-bg', color) }
  const handleGridChange = (style) => { setGridStyle(style); localStorage.setItem('projecthub-grid', style) }

  const projects = state.projects.filter(p => p.status !== 'archived')
  const canvasObjects = state.canvasObjects || []
  const stickies = canvasObjects.filter(o => o.type === 'sticky')
  const frames = canvasObjects.filter(o => o.type === 'frame')
  const textLabels = canvasObjects.filter(o => o.type === 'text')
  const connectors = canvasObjects.filter(o => o.type === 'connector')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // ── Viewport size tracking ─────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (canvasRef.current) {
        const r = canvasRef.current.getBoundingClientRect()
        viewportSize.current = { w: r.width, h: r.height }
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom(z => Math.min(2, Math.max(0.5, z - e.deltaY * 0.001)))
    }
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ── Helper: screen px → canvas logical coords ──────────────────────────────
  const screenToCanvas = useCallback((screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    }
  }, [pan, zoom])

  // ── Helper: check object bounding box ─────────────────────────────────────
  const getObjectBounds = useCallback((id) => {
    const p = projects.find(pr => pr.id === id)
    if (p) return { x: p.canvasPosition?.x || 0, y: p.canvasPosition?.y || 0, w: 260, h: 160 }
    const o = canvasObjects.find(co => co.id === id)
    if (o) return { x: o.position?.x || 0, y: o.position?.y || 0, w: o.size?.width || 180, h: o.size?.height || 180 }
    return null
  }, [projects, canvasObjects])

  // ── Lasso hit test ────────────────────────────────────────────────────────
  const computeLassoSelection = useCallback((lassoRect) => {
    // lassoRect is in screen px relative to canvas container origin
    // convert to canvas logical coords
    const lx1 = (lassoRect.x1 - pan.x) / zoom
    const ly1 = (lassoRect.y1 - pan.y) / zoom
    const lx2 = (lassoRect.x2 - pan.x) / zoom
    const ly2 = (lassoRect.y2 - pan.y) / zoom
    const rx = Math.min(lx1, lx2)
    const ry = Math.min(ly1, ly2)
    const rw = Math.abs(lx2 - lx1)
    const rh = Math.abs(ly2 - ly1)

    const hits = new Set()
    const overlaps = (ox, oy, ow, oh) =>
      ox < rx + rw && ox + ow > rx && oy < ry + rh && oy + oh > ry

    projects.forEach(p => {
      const px = p.canvasPosition?.x || 0
      const py = p.canvasPosition?.y || 0
      if (overlaps(px, py, 260, 160)) hits.add(p.id)
    })
    canvasObjects.filter(o => o.type !== 'connector').forEach(o => {
      const ox = o.position?.x || 0
      const oy = o.position?.y || 0
      const ow = o.size?.width || 180
      const oh = o.size?.height || 180
      if (overlaps(ox, oy, ow, oh)) hits.add(o.id)
    })
    return hits
  }, [pan, zoom, projects, canvasObjects])

  // ── Mouse down ────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return

    const isEmptyCanvas =
      e.target === e.currentTarget ||
      e.target.closest('.canvas-content-inner') === e.target ||
      (e.target.closest('.canvas-content-inner') && !e.target.closest('.folder-card, .canvas-sticky, .canvas-frame, .canvas-text-label'))

    if (!isEmptyCanvas) return

    // Shift held → start lasso
    if (e.shiftKey) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      isLassoing.current = true
      lassoStart.current = { x: sx, y: sy }
      setLasso({ startX: sx, startY: sy, curX: sx, curY: sy })
      return
    }

    // No shift → pan
    if (isEmptyCanvas) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panStartOffset.current = { ...pan }
      e.currentTarget.style.cursor = 'grabbing'
      // Clicking empty canvas deselects
      setSelectedIds(new Set())
    }
  }, [pan])

  // ── Mouse move ────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    // Update cursor pos for connector ghost line
    if (connectMode.active) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      setCursorPos(pos)
    }

    if (isLassoing.current) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setLasso(l => l ? { ...l, curX: cx, curY: cy } : null)
      return
    }

    if (isPanning.current) {
      setPan({
        x: panStartOffset.current.x + (e.clientX - panStart.current.x),
        y: panStartOffset.current.y + (e.clientY - panStart.current.y),
      })
    }
  }, [connectMode.active, screenToCanvas])

  // ── Mouse up ──────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback((e) => {
    if (isLassoing.current && lasso) {
      isLassoing.current = false
      const rect = canvasRef.current?.getBoundingClientRect()
      const cx = rect ? e.clientX - rect.left : lasso.curX
      const cy = rect ? e.clientY - rect.top : lasso.curY
      const finalLasso = { ...lasso, curX: cx, curY: cy }
      const hits = computeLassoSelection({
        x1: finalLasso.startX, y1: finalLasso.startY,
        x2: finalLasso.curX, y2: finalLasso.curY,
      })
      setSelectedIds(hits)
      setLasso(null)
      return
    }

    if (isPanning.current) {
      isPanning.current = false
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }
  }, [lasso, computeLassoSelection])

  // ── Right-click ───────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    setContextMenu({
      x: e.clientX, y: e.clientY,
      canvasPos,
      target: { type: 'canvas' },
    })
  }, [screenToCanvas])

  const handleObjectContextMenu = useCallback((e, target) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    setContextMenu({
      x: e.clientX, y: e.clientY,
      canvasPos,
      target,
    })
  }, [screenToCanvas])

  // ── Handle object click (for connect mode) ────────────────────────────────
  const handleObjectClick = useCallback(async (targetId) => {
    if (!connectMode.active) return
    if (connectMode.sourceId === null) {
      // First click — set source
      setConnectMode({ active: true, sourceId: targetId })
      return
    }
    if (connectMode.sourceId === targetId) {
      // Clicked same object — cancel
      setConnectMode({ active: false, sourceId: null })
      setCursorPos(null)
      return
    }
    // Second click — create connector
    const sourceId = connectMode.sourceId
    setConnectMode({ active: false, sourceId: null })
    setCursorPos(null)

    const res = await taskboardClient.createCanvasObject({
      type: 'connector',
      position: { x: 0, y: 0 },
      color: '#71717a',
      data: { sourceId, targetId, style: 'curved', arrow: 'end', label: '' },
    })
    if (res.ok) actions.addCanvasObject(res.data)
  }, [connectMode, actions])

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleContextAction = useCallback(async (action, data) => {
    const pos = contextMenu?.canvasPos || { x: 200, y: 200 }
    const snappedPos = snap
      ? { x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE, y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE }
      : pos

    switch (action) {
      case 'addSticky': {
        const res = await taskboardClient.createCanvasObject({
          type: 'sticky', position: snappedPos,
          size: { width: 180, height: 180 }, color: '#fef08a', data: { text: '' },
        })
        if (res.ok) actions.addCanvasObject(res.data)
        break
      }
      case 'addFrame': {
        const res = await taskboardClient.createCanvasObject({
          type: 'frame', position: snappedPos,
          size: { width: 500, height: 350 }, color: 'rgba(0,212,255,0.04)',
          data: { title: 'Untitled Section', borderColor: 'rgba(0,212,255,0.15)' },
        })
        if (res.ok) actions.addCanvasObject(res.data)
        break
      }
      case 'addText': {
        const res = await taskboardClient.createCanvasObject({
          type: 'text', position: snappedPos, data: { text: 'Label', fontSize: 24 },
        })
        if (res.ok) actions.addCanvasObject(res.data)
        break
      }
      case 'addConnector': {
        // Activate connect mode — user needs to click source then target
        setConnectMode({ active: true, sourceId: null })
        break
      }
      case 'newProject':
        setShowCreate(true)
        break
      case 'openProject': {
        const proj = projects.find(p => p.id === contextMenu?.target?.id)
        if (proj) { actions.setSelectedProject(proj); actions.setProjectTab('board') }
        break
      }
      case 'deleteObject': {
        const id = contextMenu?.target?.id
        if (!id) break
        const oldObj = canvasObjects.find(o => o.id === id)
        actions.removeCanvasObject(id)
        taskboardClient.deleteCanvasObject(id).catch(() => {})
        if (oldObj) {
          pushUndo(
            async () => { const r = await taskboardClient.createCanvasObject(oldObj); if (r.ok) actions.addCanvasObject(r.data) },
            async () => { actions.removeCanvasObject(id); taskboardClient.deleteCanvasObject(id).catch(() => {}) },
          )
        }
        break
      }
      case 'changeColor': {
        const id = contextMenu?.target?.id
        const type = contextMenu?.target?.type
        if (id && data?.color) {
          if (type === 'project') {
            actions.updateProject({ id, color: data.color })
            taskboardClient.updateProject(id, { color: data.color }).catch(() => {})
          } else {
            actions.updateCanvasObject({ id, color: data.color })
            taskboardClient.updateCanvasObject(id, { color: data.color }).catch(() => {})
          }
        }
        break
      }
      case 'updateConnector': {
        const id = contextMenu?.target?.id
        if (id && data) {
          const existing = canvasObjects.find(o => o.id === id)
          const merged = { ...existing, data: { ...existing?.data, ...data } }
          actions.updateCanvasObject(merged)
          taskboardClient.updateCanvasObject(id, merged).catch(() => {})
        }
        break
      }
      case 'selectAll': {
        const allIds = new Set([
          ...projects.map(p => p.id),
          ...canvasObjects.filter(o => o.type !== 'connector').map(o => o.id),
        ])
        setSelectedIds(allIds)
        break
      }
      default:
        break
    }
  }, [contextMenu, snap, actions, projects, canvasObjects])

  // ── DnD handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((event) => {
    const id = event.active.id
    setActiveId(id)

    // If dragging a selected item in a group, snapshot all positions
    if (selectedIds.has(id) && selectedIds.size > 1) {
      const baseline = {}
      selectedIds.forEach(sid => {
        const p = projects.find(pr => pr.id === sid)
        if (p) { baseline[sid] = { ...p.canvasPosition } || { x: 0, y: 0 }; return }
        const o = canvasObjects.find(co => co.id === sid)
        if (o) baseline[sid] = { ...o.position } || { x: 0, y: 0 }
      })
      groupDragBaseline.current = baseline
    } else {
      groupDragBaseline.current = null
    }
  }, [selectedIds, projects, canvasObjects])

  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event
    setActiveId(null)

    if (!delta || (delta.x === 0 && delta.y === 0)) {
      groupDragBaseline.current = null
      return
    }

    const dx = delta.x / zoom
    const dy = delta.y / zoom

    const applySnap = (v) => snap ? Math.round(v / GRID_SIZE) * GRID_SIZE : v

    // Group move
    if (groupDragBaseline.current && selectedIds.has(active.id) && selectedIds.size > 1) {
      const baseline = groupDragBaseline.current
      selectedIds.forEach(sid => {
        const base = baseline[sid]
        if (!base) return
        const newPos = {
          x: Math.max(0, applySnap(base.x + dx)),
          y: Math.max(0, applySnap(base.y + dy)),
        }
        const isProject = projects.some(p => p.id === sid)
        if (isProject) {
          actions.updateProject({ id: sid, canvasPosition: newPos })
          taskboardClient.updateProject(sid, { canvasPosition: newPos }).catch(() => {})
        } else {
          actions.updateCanvasObject({ id: sid, position: newPos })
          taskboardClient.updateCanvasObject(sid, { position: newPos }).catch(() => {})
        }
      })
      groupDragBaseline.current = null
      return
    }

    // Single move
    const project = projects.find(p => p.id === active.id)
    const canvasObj = canvasObjects.find(o => o.id === active.id)

    if (project) {
      const pos = project.canvasPosition || { x: 0, y: 0 }
      const newPos = { x: Math.max(0, applySnap(pos.x + dx)), y: Math.max(0, applySnap(pos.y + dy)) }
      const oldPos = { ...pos }
      actions.updateProject({ id: project.id, canvasPosition: newPos })
      taskboardClient.updateProject(project.id, { canvasPosition: newPos }).catch(() => {})
      pushUndo(
        () => { actions.updateProject({ id: project.id, canvasPosition: oldPos }); taskboardClient.updateProject(project.id, { canvasPosition: oldPos }).catch(() => {}) },
        () => { actions.updateProject({ id: project.id, canvasPosition: newPos }); taskboardClient.updateProject(project.id, { canvasPosition: newPos }).catch(() => {}) },
      )
    } else if (canvasObj) {
      const pos = canvasObj.position || { x: 0, y: 0 }
      const newPos = { x: Math.max(0, applySnap(pos.x + dx)), y: Math.max(0, applySnap(pos.y + dy)) }
      const oldPos = { ...pos }
      actions.updateCanvasObject({ id: canvasObj.id, position: newPos })
      taskboardClient.updateCanvasObject(canvasObj.id, { position: newPos }).catch(() => {})
      pushUndo(
        () => { actions.updateCanvasObject({ id: canvasObj.id, position: oldPos }); taskboardClient.updateCanvasObject(canvasObj.id, { position: oldPos }).catch(() => {}) },
        () => { actions.updateCanvasObject({ id: canvasObj.id, position: newPos }); taskboardClient.updateCanvasObject(canvasObj.id, { position: newPos }).catch(() => {}) },
      )
    }
  }, [projects, canvasObjects, zoom, snap, actions, selectedIds])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const rect = canvasRef.current?.getBoundingClientRect()
      const canvasX = rect ? (cx - rect.left - pan.x) / zoom : 200
      const canvasY = rect ? (cy - rect.top - pan.y) / zoom : 200

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        const res = await taskboardClient.createCanvasObject({
          type: 'sticky', position: { x: canvasX, y: canvasY },
          size: { width: 180, height: 180 }, color: '#fef08a', data: { text: '' },
        })
        if (res.ok) actions.addCanvasObject(res.data)
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        const res = await taskboardClient.createCanvasObject({
          type: 'frame', position: { x: canvasX, y: canvasY },
          size: { width: 500, height: 350 }, color: 'rgba(0,212,255,0.04)',
          data: { title: 'Untitled Section', borderColor: 'rgba(0,212,255,0.15)' },
        })
        if (res.ok) actions.addCanvasObject(res.data)
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const res = await taskboardClient.createCanvasObject({
          type: 'text', position: { x: canvasX, y: canvasY },
          data: { text: 'Label', fontSize: 24 },
        })
        if (res.ok) actions.addCanvasObject(res.data)
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        setConnectMode(m => m.active ? { active: false, sourceId: null } : { active: true, sourceId: null })
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setShowMinimap(v => !v)
      }
      if (e.key === '0') { e.preventDefault(); setZoom(1) }
      if (e.key === '1') {
        e.preventDefault()
        // Zoom-to-fit: compute bounds and set zoom/pan
        const allX = [
          ...projects.map(p => (p.canvasPosition?.x || 0) + 260),
          ...canvasObjects.filter(o => o.type !== 'connector').map(o => (o.position?.x || 0) + (o.size?.width || 180)),
        ]
        const allY = [
          ...projects.map(p => (p.canvasPosition?.y || 0) + 160),
          ...canvasObjects.filter(o => o.type !== 'connector').map(o => (o.position?.y || 0) + (o.size?.height || 180)),
        ]
        if (allX.length === 0) return
        const minX = 0, minY = 0
        const maxX = Math.max(...allX), maxY = Math.max(...allY)
        const vw = viewportSize.current.w || window.innerWidth
        const vh = viewportSize.current.h || window.innerHeight - 60
        const fz = Math.min(2, Math.max(0.5, Math.min(vw / (maxX - minX + 80), vh / (maxY - minY + 80))))
        setZoom(fz)
        setPan({ x: 40 * fz, y: 40 * fz })
      }
      if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(z => Math.min(2, z + 0.1)) }
      if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.5, z - 0.1)) }

      if (e.key === 'Escape') {
        setContextMenu(null)
        setSelectedIds(new Set())
        setConnectMode({ active: false, sourceId: null })
        setCursorPos(null)
      }

      // Delete/Backspace — delete selected items
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        const toDelete = [...selectedIds]
        // Snapshot for undo
        const snapshots = toDelete.map(id => {
          const o = canvasObjects.find(co => co.id === id)
          return o ? { ...o } : null
        }).filter(Boolean)
        toDelete.forEach(id => {
          actions.removeCanvasObject(id)
          taskboardClient.deleteCanvasObject(id).catch(() => {})
          // Also remove connected connectors
          connectors.filter(c => c.data?.sourceId === id || c.data?.targetId === id).forEach(c => {
            actions.removeCanvasObject(c.id)
            taskboardClient.deleteCanvasObject(c.id).catch(() => {})
          })
        })
        setSelectedIds(new Set())
        // Note: project deletion intentionally not included in Delete shortcut to avoid accidents
      }

      // Ctrl+A — select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedIds(new Set([
          ...projects.map(p => p.id),
          ...canvasObjects.filter(o => o.type !== 'connector').map(o => o.id),
        ]))
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const action = undoStack.current.pop()
        if (action) { redoStack.current.push(action); await action.undo() }
      }

      // Ctrl+Shift+Z / Ctrl+Y — redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        const action = redoStack.current.pop()
        if (action) { undoStack.current.push(action); await action.redo() }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pan, zoom, actions, selectedIds, projects, canvasObjects, connectors])

  // ── Canvas dimensions ─────────────────────────────────────────────────────
  const allX = [
    ...projects.map(p => (p.canvasPosition?.x || 0) + 300),
    ...canvasObjects.map(o => (o.position?.x || 0) + (o.size?.width || 200)),
  ]
  const allY = [
    ...projects.map(p => (p.canvasPosition?.y || 0) + 220),
    ...canvasObjects.map(o => (o.position?.y || 0) + (o.size?.height || 200)),
  ]
  const maxX = Math.max(1200, ...allX)
  const maxY = Math.max(800, ...allY)

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null
  const activeCanvasObj = activeId ? canvasObjects.find(o => o.id === activeId) : null
  const isEmpty = projects.length === 0 && canvasObjects.length === 0

  // ── Connector select handler ──────────────────────────────────────────────
  const handleConnectorSelect = useCallback((id) => {
    setSelectedIds(new Set([id]))
  }, [])

  // ── Connector context menu ────────────────────────────────────────────────
  const handleConnectorContextMenu = useCallback((e, conn) => {
    e.preventDefault(); e.stopPropagation()
    handleObjectContextMenu(e, { type: 'connector', id: conn.id, data: conn })
  }, [handleObjectContextMenu])

  // ── Toggle selection for shift+click ─────────────────────────────────────
  const handleCardShiftClick = useCallback((e, id) => {
    if (!e.shiftKey) return
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ── Connect mode cursor style ─────────────────────────────────────────────
  const cursorStyle = connectMode.active ? 'crosshair' : 'default'

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{
        height: '100%', overflow: 'auto',
        background: canvasBg,
        position: 'relative', userSelect: 'none',
        cursor: cursorStyle,
      }}
    >
      <CanvasToolbar
        search={search} onSearchChange={setSearch}
        snap={snap} onSnapToggle={() => setSnap(s => !s)}
        zoom={zoom} onZoomChange={setZoom}
        onNewProject={() => setShowCreate(true)}
        canvasBg={canvasBg} onBgChange={handleBgChange}
        gridStyle={gridStyle} onGridStyleChange={handleGridChange}
        showMinimap={showMinimap} onToggleMinimap={() => setShowMinimap(v => !v)}
        connectMode={connectMode.active}
        onToggleConnect={() => setConnectMode(m => m.active ? { active: false, sourceId: null } : { active: true, sourceId: null })}
      />

      {/* Connect mode banner */}
      {connectMode.active && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          padding: '8px 20px',
          borderRadius: '20px',
          background: 'rgba(0,212,255,0.15)',
          border: '1px solid rgba(0,212,255,0.4)',
          color: 'var(--theme-accent)',
          fontSize: '12px',
          fontWeight: 600,
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}>
          {connectMode.sourceId ? '🔗 Now click the target object' : '🔗 Click the source object to start a connection — Esc to cancel'}
        </div>
      )}

      {isEmpty && <EmptyCanvas onNewProject={() => setShowCreate(true)} />}

      <SelectionBadge count={selectedIds.size} />

      <div
        className="canvas-content-inner"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'relative',
          minWidth: `${maxX + 200}px`,
          minHeight: `${maxY + 200}px`,
        }}
      >
        <CanvasGrid gridSize={GRID_SIZE} snap={snap} gridStyle={gridStyle} canvasBg={canvasBg} />

        {/* Connector SVG layer — renders above grid, below objects */}
        <CanvasConnector
          connectors={connectors}
          projects={projects}
          canvasObjects={canvasObjects}
          canvasWidth={maxX}
          canvasHeight={maxY}
          onSelect={handleConnectorSelect}
          selectedIds={[...selectedIds]}
          onUpdate={(id, patch) => {
            const existing = canvasObjects.find(o => o.id === id)
            if (!existing) return
            const merged = { ...existing, ...patch }
            actions.updateCanvasObject(merged)
            taskboardClient.updateCanvasObject(id, merged).catch(() => {})
          }}
          onDelete={(id) => {
            actions.removeCanvasObject(id)
            taskboardClient.deleteCanvasObject(id).catch(() => {})
          }}
          connectMode={connectMode}
          cursorPos={cursorPos}
        />

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Frames (render BEHIND everything) */}
          {frames.map(f => (
            <CanvasFrame
              key={f.id} obj={f} isDragging={activeId === f.id}
              canvasBg={canvasBg}
              isSelected={selectedIds.has(f.id)}
              onContextMenu={handleObjectContextMenu}
              onClick={(e) => {
                if (connectMode.active) { handleObjectClick(f.id); return }
                handleCardShiftClick(e, f.id)
              }}
            />
          ))}

          {/* Projects */}
          {projects.map(p => {
            const isSearched = search && !p.name.toLowerCase().includes(search.toLowerCase())
            const isSelected = selectedIds.has(p.id)
            const isConnectSource = connectMode.sourceId === p.id
            return (
              <ProjectFolderCard
                key={p.id} project={p} dimmed={isSearched}
                isDragging={activeId === p.id}
                isSelected={isSelected}
                isConnectSource={isConnectSource}
                onClick={(e) => {
                  if (connectMode.active) { handleObjectClick(p.id); return }
                  handleCardShiftClick(e, p.id)
                }}
                onContextMenu={(e) => {
                  e.preventDefault(); e.stopPropagation()
                  handleObjectContextMenu(e, { type: 'project', id: p.id, data: p })
                }}
              />
            )
          })}

          {/* Sticky Notes */}
          {stickies.map(s => (
            <CanvasStickyNote
              key={s.id} obj={s} isDragging={activeId === s.id}
              isSelected={selectedIds.has(s.id)}
              onContextMenu={handleObjectContextMenu}
              onClick={(e) => {
                if (connectMode.active) { handleObjectClick(s.id); return }
                handleCardShiftClick(e, s.id)
              }}
            />
          ))}

          {/* Text Labels */}
          {textLabels.map(t => (
            <CanvasTextLabel
              key={t.id} obj={t} isDragging={activeId === t.id}
              canvasBg={canvasBg}
              isSelected={selectedIds.has(t.id)}
              onContextMenu={handleObjectContextMenu}
              onClick={(e) => {
                if (connectMode.active) { handleObjectClick(t.id); return }
                handleCardShiftClick(e, t.id)
              }}
            />
          ))}

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
            {activeProject && <ProjectFolderCard project={activeProject} isOverlay />}
            {activeCanvasObj?.type === 'sticky' && <CanvasStickyNote obj={activeCanvasObj} isOverlay />}
            {activeCanvasObj?.type === 'frame' && <CanvasFrame obj={activeCanvasObj} isOverlay canvasBg={canvasBg} />}
            {activeCanvasObj?.type === 'text' && <CanvasTextLabel obj={activeCanvasObj} isOverlay canvasBg={canvasBg} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lasso selection rectangle (in screen space, outside transform) */}
      {lasso && <LassoRect lasso={lasso} />}

      {/* Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x} y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* Minimap */}
      <CanvasMinimap
        projects={projects}
        canvasObjects={canvasObjects}
        pan={pan}
        zoom={zoom}
        viewportW={viewportSize.current.w || window.innerWidth}
        viewportH={viewportSize.current.h || window.innerHeight}
        onNavigate={setPan}
        visible={showMinimap}
      />

      {showCreate && (
        <ProjectCreateModal existingProjects={projects} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
