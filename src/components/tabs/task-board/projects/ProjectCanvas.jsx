import { useState, useRef, useCallback, useEffect } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasToolbar from './CanvasToolbar'
import CanvasGrid from './CanvasGrid'
import ProjectFolderCard from './ProjectFolderCard'
import ProjectCreateModal from './ProjectCreateModal'

export default function ProjectCanvas() {
  const { state, actions } = useTaskBoard()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [snap, setSnap] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [dragDelta, setDragDelta] = useState(null)
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
    // Only pan when clicking empty canvas
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
        background: '#0a0a0f',
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
      />

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
        <CanvasGrid gridSize={GRID_SIZE} snap={snap} />

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
