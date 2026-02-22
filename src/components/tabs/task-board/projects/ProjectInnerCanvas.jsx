import { useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasGrid from './CanvasGrid'
import CanvasConnector from './CanvasConnector'
import CanvasMinimap from './CanvasMinimap'
import ProjectFolderCard from './ProjectFolderCard'
import ProjectCreateModal from './ProjectCreateModal'
import InnerCanvasToolbar from './InnerCanvasToolbar'

function DraggableItem({ obj, isDragging, selected, onSelect, onUpdateText, onCreateTask, taskState }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: obj.id })
  const style = {
    position: 'absolute',
    left: obj.position?.x || 0,
    top: obj.position?.y || 0,
    width: obj.size?.width || 220,
    minHeight: obj.size?.height || 120,
    background: obj.color || 'rgba(255,255,255,0.05)',
    border: selected ? '2px solid var(--theme-accent)' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px',
    transform: CSS.Translate.toString(transform),
    boxShadow: isDragging ? '0 12px 30px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.3)',
    zIndex: isDragging ? 80 : 6,
  }
  const content = obj.data?.text || obj.data?.title || ''

  return (
    <div ref={setNodeRef} style={style} onClick={() => onSelect(obj.id)} {...attributes} {...listeners}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <strong style={{ fontSize: '12px', textTransform: 'capitalize' }}>{obj.type}</strong>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onCreateTask(obj) }} style={{ border: '1px solid rgba(0,212,255,0.35)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '10px', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
          Create Task
        </button>
      </div>

      {(obj.type === 'note' || obj.type === 'text' || obj.type === 'taskCard' || obj.type === 'metric' || obj.type === 'checklist') && (
        <textarea
          value={content}
          onChange={(e) => onUpdateText(obj, e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Type here..."
          style={{ width: '100%', minHeight: '60px', resize: 'vertical', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'var(--theme-text-primary)', borderRadius: '6px', padding: '6px', fontSize: '12px' }}
        />
      )}

      {obj.type === 'image' && obj.data?.src && <img src={obj.data.src} alt="canvas" style={{ width: '100%', borderRadius: '6px' }} />}
      {obj.type === 'file' && <div style={{ fontSize: '11px' }}>📎 {obj.data?.fileName || 'Attachment'}</div>}
      {obj.type === 'shape' && <div style={{ fontSize: '11px' }}>Shape: {obj.data?.shape || 'rectangle'}</div>}

      {taskState && <div style={{ marginTop: '6px', fontSize: '10px', color: taskState === 'completed' ? '#4ade80' : '#f59e0b' }}>Task: {taskState}</div>}
    </div>
  )
}

export default function ProjectInnerCanvas({ project }) {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [zoom, setZoom] = useState(1)
  const [activeId, setActiveId] = useState(null)
  const [activeTool, setActiveTool] = useState('note')
  const [showSubProjectCreate, setShowSubProjectCreate] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [connectMode, setConnectMode] = useState({ active: false, sourceId: null })
  const [cursorPos, setCursorPos] = useState(null)

  const canvasRef = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartOffset = useRef({ x: 0, y: 0 })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const childProjects = state.projects.filter(p => p.parentProjectId === project.id && p.status !== 'archived')
  const canvasObjects = state.canvasObjects.filter(o => o.data?.canvasScope === 'inner' && o.data?.projectId === project.id)
  const connectors = canvasObjects.filter(o => o.type === 'connector')
  const renderObjects = canvasObjects.filter(o => o.type !== 'connector')

  const objectTaskStage = useMemo(() => {
    const map = {}
    state.tasks.forEach(t => {
      if (t.canvasItemId) map[t.canvasItemId] = t.stage
    })
    return map
  }, [state.tasks])

  const screenToCanvas = (x, y) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (x - rect.left - pan.x) / zoom, y: (y - rect.top - pan.y) / zoom }
  }

  const createCanvasObject = async (type, position, data = {}, color = 'rgba(255,255,255,0.06)', size = { width: 230, height: 130 }) => {
    const res = await taskboardClient.createCanvasObject({
      type,
      position,
      size,
      color,
      projectId: project.id,
      canvasScope: 'inner',
      data: { ...data, projectId: project.id, canvasScope: 'inner' },
    })
    if (res.ok) actions.addCanvasObject(res.data)
  }

  const handleCanvasClick = async (e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('inner-canvas-space')) return
    const pos = screenToCanvas(e.clientX, e.clientY)

    if (connectMode.active) return

    if (pendingUpload?.kind === 'image') {
      const file = pendingUpload.file
      const reader = new FileReader()
      reader.onload = async () => {
        await createCanvasObject('image', pos, { src: reader.result, fileName: file.name }, 'rgba(255,255,255,0.04)', { width: 260, height: 180 })
      }
      reader.readAsDataURL(file)
      setPendingUpload(null)
      return
    }

    if (pendingUpload?.kind === 'file') {
      await createCanvasObject('file', pos, { fileName: pendingUpload.file.name })
      setPendingUpload(null)
      return
    }

    if (activeTool === 'line') {
      setConnectMode({ active: true, sourceId: null })
      return
    }

    const map = {
      note: ['note', '#fef08a', { text: '' }],
      text: ['text', 'rgba(255,255,255,0.08)', { text: 'Text box' }],
      shape: ['shape', 'rgba(59,130,246,0.12)', { shape: 'rectangle', title: 'Shape' }],
      metric: ['metric', 'rgba(16,185,129,0.12)', { text: 'Metric: 0' }],
      taskCard: ['taskCard', 'rgba(139,92,246,0.12)', { text: 'Task card' }],
      checklist: ['checklist', 'rgba(245,158,11,0.12)', { text: '☐ item 1\n☐ item 2' }],
    }

    const selected = map[activeTool]
    if (selected) await createCanvasObject(selected[0], pos, selected[2], selected[1])
  }

  const handleDragStart = (e) => setActiveId(e.active.id)
  const handleDragEnd = async ({ active, delta }) => {
    setActiveId(null)
    if (!delta || (!delta.x && !delta.y)) return
    const dx = delta.x / zoom
    const dy = delta.y / zoom

    const child = childProjects.find(p => p.id === active.id)
    if (child) {
      const base = child.canvasPosition || { x: 0, y: 0 }
      const next = { x: Math.max(0, base.x + dx), y: Math.max(0, base.y + dy) }
      actions.updateProject({ id: child.id, canvasPosition: next })
      await taskboardClient.updateProject(child.id, { canvasPosition: next, parentProjectId: project.id })
      return
    }

    const obj = renderObjects.find(o => o.id === active.id)
    if (!obj) return
    const base = obj.position || { x: 0, y: 0 }
    const next = { x: Math.max(0, base.x + dx), y: Math.max(0, base.y + dy) }
    actions.updateCanvasObject({ id: obj.id, position: next })
    await taskboardClient.updateCanvasObject(obj.id, { position: next })
  }

  const createTaskFromItem = async (obj) => {
    const title = obj.data?.title || obj.data?.text?.split('\n')[0] || `${obj.type} item`
    const res = await taskboardClient.createTask({
      title: `[${project.name}] ${title}`,
      description: `Created from canvas item ${obj.id}`,
      projectId: project.id,
      canvasItemId: obj.id,
      stage: 'new_task',
    })
    if (res.ok) {
      actions.addTask(res.data)
      appActions.addToast({ type: 'success', message: 'Task created from canvas item' })
    }
  }

  const createTaskFromProject = async (proj) => {
    const parent = await taskboardClient.createTask({
      title: `Project: ${proj.name}`,
      description: `Parent task for project ${proj.name}`,
      projectId: proj.id,
      stage: 'new_task',
      isProjectTask: true,
    })
    if (!parent.ok) return
    actions.addTask(parent.data)

    const items = state.canvasObjects.filter(o => o.data?.projectId === proj.id && o.data?.canvasScope === 'inner' && o.type !== 'connector')
    for (const item of items) {
      const sub = await taskboardClient.createTask({
        title: `${proj.name}: ${item.data?.title || item.data?.text?.split('\n')[0] || item.type}`,
        projectId: proj.id,
        parentTaskId: parent.data.id,
        canvasItemId: item.id,
        stage: 'new_task',
      })
      if (sub.ok) actions.addTask(sub.data)
    }

    await taskboardClient.updateProject(proj.id, { isTaskified: true, parentTaskId: parent.data.id })
    actions.updateProject({ id: proj.id, isTaskified: true, parentTaskId: parent.data.id })
    appActions.addToast({ type: 'success', message: 'Project task tree created' })
  }

  const handleObjectClickForConnect = async (id) => {
    if (!connectMode.active) return
    if (!connectMode.sourceId) return setConnectMode({ active: true, sourceId: id })
    if (connectMode.sourceId === id) return setConnectMode({ active: false, sourceId: null })
    const res = await taskboardClient.createCanvasObject({
      type: 'connector',
      position: { x: 0, y: 0 },
      color: '#71717a',
      projectId: project.id,
      canvasScope: 'inner',
      data: { sourceId: connectMode.sourceId, targetId: id, projectId: project.id, canvasScope: 'inner', style: 'curved', arrow: 'end' },
    })
    if (res.ok) actions.addCanvasObject(res.data)
    setConnectMode({ active: false, sourceId: null })
  }

  const progress = (() => {
    const tasks = state.tasks.filter(t => t.projectId === project.id)
    if (!tasks.length) return 0
    return Math.round((tasks.filter(t => t.stage === 'completed').length / tasks.length) * 100)
  })()

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <InnerCanvasToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onUploadImage={(file) => { setPendingUpload({ kind: 'image', file }); setActiveTool('image') }}
        onUploadFile={(file) => { setPendingUpload({ kind: 'file', file }); setActiveTool('file') }}
        onAgentChat={async () => {
          const prompt = window.prompt('Ask agent for brainstorming on this project:')
          if (!prompt) return
          await createCanvasObject('note', { x: 120, y: 120 }, { text: `Agent Brainstorm\n${prompt}` }, '#c4b5fd')
        }}
        onNewSubProject={() => setShowSubProjectCreate(true)}
      />

      <div
        ref={canvasRef}
        onMouseMove={(e) => {
          if (isPanning.current) setPan({ x: panStartOffset.current.x + (e.clientX - panStart.current.x), y: panStartOffset.current.y + (e.clientY - panStart.current.y) })
          if (connectMode.active) setCursorPos(screenToCanvas(e.clientX, e.clientY))
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return
          if (e.target !== e.currentTarget && !e.target.classList.contains('inner-canvas-space')) return
          isPanning.current = true
          panStart.current = { x: e.clientX, y: e.clientY }
          panStartOffset.current = { ...pan }
        }}
        onMouseUp={() => { isPanning.current = false }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          setZoom(z => Math.max(0.5, Math.min(2, z - e.deltaY * 0.001)))
        }}
        onClick={handleCanvasClick}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a0f' }}
      >
        <div style={{ position: 'absolute', left: 12, top: 10, zIndex: 10, fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
          Progress: <strong style={{ color: progress > 70 ? '#4ade80' : '#f59e0b' }}>{progress}%</strong>
          {pendingUpload && <span style={{ marginLeft: '10px', color: 'var(--theme-accent)' }}>Click canvas to place {pendingUpload.kind}</span>}
          {connectMode.active && <span style={{ marginLeft: '10px', color: 'var(--theme-accent)' }}>Connect mode active</span>}
        </div>

        <div className="inner-canvas-space" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'relative', minWidth: '2200px', minHeight: '1600px' }}>
          <CanvasGrid gridSize={20} snap={true} gridStyle={'dots'} canvasBg={'#0a0a0f'} />

          <CanvasConnector
            connectors={connectors}
            projects={childProjects}
            canvasObjects={renderObjects}
            canvasWidth={2200}
            canvasHeight={1600}
            onSelect={() => {}}
            selectedIds={[]}
            onUpdate={(id, patch) => {
              actions.updateCanvasObject({ id, ...patch })
              taskboardClient.updateCanvasObject(id, patch).catch(() => {})
            }}
            onDelete={(id) => { actions.removeCanvasObject(id); taskboardClient.deleteCanvasObject(id).catch(() => {}) }}
            connectMode={connectMode}
            cursorPos={cursorPos}
          />

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {childProjects.map(p => {
              const t = state.tasks.filter(task => task.projectId === p.id)
              const completed = t.filter(task => task.stage === 'completed').length
              const pct = t.length ? Math.round((completed / t.length) * 100) : 0
              return (
                <div key={p.id} onClick={() => handleObjectClickForConnect(p.id)}>
                  <ProjectFolderCard
                    project={p}
                    isDragging={activeId === p.id}
                    onClick={() => { actions.setSelectedProject(p); actions.setProjectTab('canvas') }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); createTaskFromProject(p) }}
                    style={{ position: 'absolute', left: (p.canvasPosition?.x || 0) + 10, top: (p.canvasPosition?.y || 0) + 136, zIndex: 7, fontSize: '10px', border: '1px solid rgba(0,212,255,0.4)', background: 'rgba(10,10,15,0.95)', color: 'var(--theme-accent)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                    Create Task from Project
                  </button>
                  <div style={{ position: 'absolute', left: (p.canvasPosition?.x || 0) + 182, top: (p.canvasPosition?.y || 0) + 8, zIndex: 7, fontSize: '10px', color: pct > 70 ? '#4ade80' : '#f59e0b' }}>{pct}%</div>
                </div>
              )
            })}

            {renderObjects.map(obj => (
              <div key={obj.id} onClick={() => handleObjectClickForConnect(obj.id)}>
                <DraggableItem
                  obj={obj}
                  isDragging={activeId === obj.id}
                  selected={connectMode.sourceId === obj.id}
                  taskState={objectTaskStage[obj.id]}
                  onSelect={() => {}}
                  onCreateTask={createTaskFromItem}
                  onUpdateText={(target, text) => {
                    const patch = { id: target.id, data: { ...target.data, text, title: text.split('\n')[0] } }
                    actions.updateCanvasObject(patch)
                    taskboardClient.updateCanvasObject(target.id, patch).catch(() => {})
                  }}
                />
              </div>
            ))}

            <DragOverlay>
              {activeId && (() => {
                const p = childProjects.find(x => x.id === activeId)
                if (p) return <ProjectFolderCard project={p} isOverlay />
                const o = renderObjects.find(x => x.id === activeId)
                if (o) return <DraggableItem obj={o} isDragging isOverlay onSelect={() => {}} onCreateTask={() => {}} onUpdateText={() => {}} />
                return null
              })()}
            </DragOverlay>
          </DndContext>

          <CanvasMinimap
            projects={childProjects}
            canvasObjects={renderObjects}
            pan={pan}
            zoom={zoom}
            viewportW={1200}
            viewportH={700}
            onNavigate={setPan}
            visible={showMinimap}
          />
        </div>
      </div>

      {showSubProjectCreate && (
        <ProjectCreateModal
          existingProjects={state.projects.filter(p => p.parentProjectId === project.id)}
          onClose={() => setShowSubProjectCreate(false)}
          parentProjectId={project.id}
        />
      )}
    </div>
  )
}
