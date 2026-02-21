import { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasToolbar from './CanvasToolbar'
import CanvasGrid from './CanvasGrid'
import ProjectFolderCard from './ProjectFolderCard'
import ProjectCreateModal from './ProjectCreateModal'

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
            { icon: '📁', title: 'Create Projects', desc: 'Choose from industry templates (Sales, Recruiting, Onboarding) or start blank' },
            { icon: '🖱️', title: 'Drag & Arrange', desc: 'Position project cards anywhere on the canvas — snap-to-grid keeps things tidy' },
            { icon: '📊', title: 'Custom Boards', desc: 'Each project has its own kanban with custom columns you define' },
            { icon: '📎', title: 'Files & Notes', desc: 'Upload documents, write notes — everything organized per project' },
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
            padding: '12px 32px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--theme-accent)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 4px 16px rgba(0,212,255,0.3)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,212,255,0.4)' }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,212,255,0.3)' }}
        >
          + Create Your First Project
        </button>

        <p style={{
          margin: '16px 0 0', fontSize: '11px',
          color: 'rgba(255,255,255,0.25)',
        }}>
          Tip: Use Ctrl+Scroll to zoom • Click & drag empty space to pan
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
  const [dragDelta, setDragDelta] = useState(null)
  const [canvasBg, setCanvasBg] = useState(() => localStorage.getItem('projecthub-bg') || '#0a0a0f')
  const [gridStyle, setGridStyle] = useState(() => localStorage.getItem('projecthub-grid') || 'dots')

  const handleBgChange = (color) => { setCanvasBg(color); localStorage.setItem('projecthub-bg', color) }
  const handleGridChange = (style) => { setGridStyle(style); localStorage.setItem('projecthub-grid', style) }
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartOffset = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)

  const GRID_SIZE = 20

  const projects = state.projects.filter(p => p.status !== 'archived')

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
    if (e.target !== e.currentTarget && !e.target.closest('.canvas-content-inner')) return
    if (e.target.closest('.folder-card')) return
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

  const handleMouseUp = useCallback((e) => {
    if (isPanning.current) {
      isPanning.current = false
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }
  }, [])

  // Drag handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event
    setActiveId(null)
    setDragDelta(null)

    if (!delta || (delta.x === 0 && delta.y === 0)) return

    const project = projects.find(p => p.id === active.id)
    if (!project) return

    const pos = project.canvasPosition || { x: 0, y: 0 }
    let newX = pos.x + delta.x / zoom
    let newY = pos.y + delta.y / zoom

    if (snap) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE
    }

    const newPos = { x: Math.max(0, newX), y: Math.max(0, newY) }

    // Optimistic update
    actions.updateProject({ id: project.id, canvasPosition: newPos })

    // Persist
    taskboardClient.updateProject(project.id, { canvasPosition: newPos }).catch(() => {})
  }, [projects, zoom, snap, actions])

  // Canvas dimensions: encompass all cards + padding
  const maxX = Math.max(1200, ...projects.map(p => (p.canvasPosition?.x || 0) + 300))
  const maxY = Math.max(800, ...projects.map(p => (p.canvasPosition?.y || 0) + 220))

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        height: '100%',
        overflow: 'auto',
        background: canvasBg,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <CanvasToolbar
        search={search}
        onSearchChange={setSearch}
        snap={snap}
        onSnapToggle={() => setSnap(s => !s)}
        zoom={zoom}
        onZoomChange={setZoom}
        onNewProject={() => setShowCreate(true)}
        canvasBg={canvasBg}
        onBgChange={handleBgChange}
        gridStyle={gridStyle}
        onGridStyleChange={handleGridChange}
      />

      {projects.length === 0 && <EmptyCanvas onNewProject={() => setShowCreate(true)} />}

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

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {projects.map(p => {
            const isSearched = search && !p.name.toLowerCase().includes(search.toLowerCase())
            return (
              <ProjectFolderCard
                key={p.id}
                project={p}
                dimmed={isSearched}
                isDragging={activeId === p.id}
              />
            )
          })}

          <DragOverlay dropAnimation={{
            duration: 150,
            easing: 'ease-out',
          }}>
            {activeProject && (
              <ProjectFolderCard project={activeProject} isOverlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {showCreate && (
        <ProjectCreateModal
          existingProjects={projects}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
