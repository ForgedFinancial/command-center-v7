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
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartOffset = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)

  const handleBgChange = (color) => { setCanvasBg(color); localStorage.setItem('projecthub-bg', color) }
  const handleGridChange = (style) => { setGridStyle(style); localStorage.setItem('projecthub-grid', style) }

  const GRID_SIZE = 20
  const projects = state.projects.filter(p => p.status !== 'archived')
  const canvasObjects = state.canvasObjects || []
  const stickies = canvasObjects.filter(o => o.type === 'sticky')
  const frames = canvasObjects.filter(o => o.type === 'frame')
  const textLabels = canvasObjects.filter(o => o.type === 'text')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Wheel zoom
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

  // Background pan
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return // right-click handled separately
    if (e.target !== e.currentTarget && !e.target.closest('.canvas-content-inner')) return
    if (e.target.closest('.folder-card, .canvas-sticky, .canvas-frame, .canvas-text-label')) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY }
    panStartOffset.current = { ...pan }
    e.currentTarget.style.cursor = 'grabbing'
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!isPanning.current) return
    setPan({
      x: panStartOffset.current.x + (e.clientX - panStart.current.x),
      y: panStartOffset.current.y + (e.clientY - panStart.current.y),
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }
  }, [])

  // Right-click handler
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    // Calculate canvas-relative position for object creation
    const rect = canvasRef.current?.getBoundingClientRect()
    const canvasX = rect ? (e.clientX - rect.left - pan.x) / zoom : 0
    const canvasY = rect ? (e.clientY - rect.top - pan.y) / zoom : 0
    setContextMenu({
      x: e.clientX, y: e.clientY,
      canvasPos: { x: canvasX, y: canvasY },
      target: { type: 'canvas' },
    })
  }, [pan, zoom])

  const handleObjectContextMenu = useCallback((e, target) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const canvasX = rect ? (e.clientX - rect.left - pan.x) / zoom : 0
    const canvasY = rect ? (e.clientY - rect.top - pan.y) / zoom : 0
    setContextMenu({
      x: e.clientX, y: e.clientY,
      canvasPos: { x: canvasX, y: canvasY },
      target,
    })
  }, [pan, zoom])

  // Context menu actions
  const handleContextAction = useCallback(async (action, data) => {
    const pos = contextMenu?.canvasPos || { x: 200, y: 200 }
    const snappedPos = snap
      ? { x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE, y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE }
      : pos

    switch (action) {
      case 'addSticky': {
        const res = await taskboardClient.createCanvasObject({
          type: 'sticky',
          position: snappedPos,
          size: { width: 180, height: 180 },
          color: '#fef08a',
          data: { text: '' },
        })
        if (res.ok) actions.addCanvasObject(res.data)
        break
      }
      case 'addFrame': {
        const res = await taskboardClient.createCanvasObject({
          type: 'frame',
          position: snappedPos,
          size: { width: 500, height: 350 },
          color: 'rgba(0,212,255,0.04)',
          data: { title: 'Untitled Section', borderColor: 'rgba(0,212,255,0.15)' },
        })
        if (res.ok) actions.addCanvasObject(res.data)
        break
      }
      case 'addText': {
        const res = await taskboardClient.createCanvasObject({
          type: 'text',
          position: snappedPos,
          data: { text: 'Label', fontSize: 24 },
        })
        if (res.ok) actions.addCanvasObject(res.data)
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
        if (id) {
          actions.removeCanvasObject(id)
          taskboardClient.deleteCanvasObject(id).catch(() => {})
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
      default:
        break
    }
  }, [contextMenu, snap, GRID_SIZE, actions, projects])

  // Drag handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event
    setActiveId(null)

    if (!delta || (delta.x === 0 && delta.y === 0)) return

    // Check if it's a project or a canvas object
    const project = projects.find(p => p.id === active.id)
    const canvasObj = canvasObjects.find(o => o.id === active.id)

    if (project) {
      const pos = project.canvasPosition || { x: 0, y: 0 }
      let newX = pos.x + delta.x / zoom
      let newY = pos.y + delta.y / zoom
      if (snap) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE
      }
      const newPos = { x: Math.max(0, newX), y: Math.max(0, newY) }
      actions.updateProject({ id: project.id, canvasPosition: newPos })
      taskboardClient.updateProject(project.id, { canvasPosition: newPos }).catch(() => {})
    } else if (canvasObj) {
      const pos = canvasObj.position || { x: 0, y: 0 }
      let newX = pos.x + delta.x / zoom
      let newY = pos.y + delta.y / zoom
      if (snap) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE
      }
      const newPos = { x: Math.max(0, newX), y: Math.max(0, newY) }
      actions.updateCanvasObject({ id: canvasObj.id, position: newPos })
      taskboardClient.updateCanvasObject(canvasObj.id, { position: newPos }).catch(() => {})
    }
  }, [projects, canvasObjects, zoom, snap, actions])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Don't intercept if typing in input/textarea/contenteditable
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        const rect = canvasRef.current?.getBoundingClientRect()
        const canvasX = rect ? (cx - rect.left - pan.x) / zoom : 200
        const canvasY = rect ? (cy - rect.top - pan.y) / zoom : 200
        taskboardClient.createCanvasObject({
          type: 'sticky', position: { x: canvasX, y: canvasY },
          size: { width: 180, height: 180 }, color: '#fef08a', data: { text: '' },
        }).then(res => { if (res.ok) actions.addCanvasObject(res.data) })
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        const rect = canvasRef.current?.getBoundingClientRect()
        const canvasX = rect ? (cx - rect.left - pan.x) / zoom : 200
        const canvasY = rect ? (cy - rect.top - pan.y) / zoom : 200
        taskboardClient.createCanvasObject({
          type: 'frame', position: { x: canvasX, y: canvasY },
          size: { width: 500, height: 350 }, color: 'rgba(0,212,255,0.04)',
          data: { title: 'Untitled Section', borderColor: 'rgba(0,212,255,0.15)' },
        }).then(res => { if (res.ok) actions.addCanvasObject(res.data) })
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        const rect = canvasRef.current?.getBoundingClientRect()
        const canvasX = rect ? (cx - rect.left - pan.x) / zoom : 200
        const canvasY = rect ? (cy - rect.top - pan.y) / zoom : 200
        taskboardClient.createCanvasObject({
          type: 'text', position: { x: canvasX, y: canvasY },
          data: { text: 'Label', fontSize: 24 },
        }).then(res => { if (res.ok) actions.addCanvasObject(res.data) })
      }
      if (e.key === '0') {
        e.preventDefault(); setZoom(1)
      }
      if (e.key === '=' || e.key === '+') {
        e.preventDefault(); setZoom(z => Math.min(2, z + 0.1))
      }
      if (e.key === '-') {
        e.preventDefault(); setZoom(z => Math.max(0.5, z - 0.1))
      }
      if (e.key === 'Escape') {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pan, zoom, actions])

  // Canvas dimensions
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
      }}
    >
      <CanvasToolbar
        search={search} onSearchChange={setSearch}
        snap={snap} onSnapToggle={() => setSnap(s => !s)}
        zoom={zoom} onZoomChange={setZoom}
        onNewProject={() => setShowCreate(true)}
        canvasBg={canvasBg} onBgChange={handleBgChange}
        gridStyle={gridStyle} onGridStyleChange={handleGridChange}
      />

      {isEmpty && <EmptyCanvas onNewProject={() => setShowCreate(true)} />}

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

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Frames (render BEHIND everything) */}
          {frames.map(f => (
            <CanvasFrame key={f.id} obj={f} isDragging={activeId === f.id}
              canvasBg={canvasBg} onContextMenu={handleObjectContextMenu} />
          ))}

          {/* Projects */}
          {projects.map(p => {
            const isSearched = search && !p.name.toLowerCase().includes(search.toLowerCase())
            return (
              <ProjectFolderCard key={p.id} project={p} dimmed={isSearched}
                isDragging={activeId === p.id}
                onContextMenu={(e) => {
                  e.preventDefault(); e.stopPropagation()
                  handleObjectContextMenu(e, { type: 'project', id: p.id, data: p })
                }}
              />
            )
          })}

          {/* Sticky Notes */}
          {stickies.map(s => (
            <CanvasStickyNote key={s.id} obj={s} isDragging={activeId === s.id}
              onContextMenu={handleObjectContextMenu} />
          ))}

          {/* Text Labels */}
          {textLabels.map(t => (
            <CanvasTextLabel key={t.id} obj={t} isDragging={activeId === t.id}
              canvasBg={canvasBg} onContextMenu={handleObjectContextMenu} />
          ))}

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
            {activeProject && <ProjectFolderCard project={activeProject} isOverlay />}
            {activeCanvasObj?.type === 'sticky' && <CanvasStickyNote obj={activeCanvasObj} isOverlay />}
            {activeCanvasObj?.type === 'frame' && <CanvasFrame obj={activeCanvasObj} isOverlay canvasBg={canvasBg} />}
            {activeCanvasObj?.type === 'text' && <CanvasTextLabel obj={activeCanvasObj} isOverlay canvasBg={canvasBg} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x} y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {showCreate && (
        <ProjectCreateModal existingProjects={projects} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
