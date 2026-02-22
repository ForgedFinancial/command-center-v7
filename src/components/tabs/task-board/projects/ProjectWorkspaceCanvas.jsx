import { useCallback, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasGrid from './CanvasGrid'
import CanvasConnector from './CanvasConnector'
import CanvasMinimap from './CanvasMinimap'
import CanvasStickyNote from './CanvasStickyNote'
import CanvasFrame from './CanvasFrame'
import CanvasTextLabel from './CanvasTextLabel'
import ProjectFolderCard from './ProjectFolderCard'
import ProjectCanvasObjectCard from './ProjectCanvasObjectCard'
import { getProjectFamilyIds, getProjectProgressSummary } from './projectWorkspaceUtils'

const TOOL_ITEMS = [
  { id: 'lines', label: 'Lines', icon: '🔗' },
  { id: 'shapes', label: 'Shapes', icon: '⬛' },
  { id: 'text', label: 'Text', icon: '✍️' },
  { id: 'images', label: 'Images', icon: '🖼️' },
  { id: 'files', label: 'Files', icon: '📎' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'metrics', label: 'Metrics', icon: '📈' },
  { id: 'task-cards', label: 'Task Cards', icon: '📋' },
  { id: 'agent-chat', label: 'Agent Chat', icon: '🤖' },
  { id: 'checklists', label: 'Checklists', icon: '✅' },
]

function AgentChatModal({ open, onClose, projectName, contextSummary }) {
  const [messages, setMessages] = useState([
    { role: 'agent', text: `Ready to brainstorm "${projectName}".` },
  ])
  const [draft, setDraft] = useState('')

  if (!open) return null

  const send = () => {
    if (!draft.trim()) return
    const question = draft.trim()
    setMessages(prev => [
      ...prev,
      { role: 'user', text: question },
      {
        role: 'agent',
        text: `Next step: prioritize ${contextSummary.tasks} open tasks and convert ${contextSummary.items} canvas items into execution tasks.`,
      },
    ])
    setDraft('')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 90 }} />
      <div style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(640px, calc(100vw - 40px))',
        maxHeight: '70vh',
        background: 'var(--theme-surface)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        zIndex: 91,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
          <strong style={{ fontSize: '13px', color: 'var(--theme-text-primary)' }}>Agent Brainstorm</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '12px 14px', overflow: 'auto', flex: 1 }}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} style={{
              marginBottom: '10px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: message.role === 'agent' ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: message.role === 'agent' ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
              fontSize: '12px',
            }}>
              {message.text}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px' }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            placeholder="Ask the agent for planning ideas..."
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: 'var(--theme-text-primary)',
              padding: '8px 10px',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--theme-accent)',
              color: '#03131a',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}

export default function ProjectWorkspaceCanvas({ project }) {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [snap, setSnap] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [connectMode, setConnectMode] = useState({ active: false, sourceId: null })
  const [cursorPos, setCursorPos] = useState(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [showAgentChat, setShowAgentChat] = useState(false)

  const canvasRef = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const imageInputRef = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const allObjects = state.canvasObjects || []
  const projectObjects = allObjects.filter(obj => obj.projectId === project.id)
  const childProjects = state.projects.filter(p => p.parentProjectId === project.id && p.status !== 'archived')
  const projectDocuments = state.documents.filter(doc => doc.projectId === project.id)
  const projectTasks = state.tasks.filter(task => task.projectId === project.id)
  const progress = getProjectProgressSummary(project.id, state.projects, state.tasks)

  const stickies = projectObjects.filter(obj => obj.type === 'sticky')
  const frames = projectObjects.filter(obj => obj.type === 'frame')
  const textLabels = projectObjects.filter(obj => obj.type === 'text')
  const connectors = projectObjects.filter(obj => obj.type === 'connector')
  const customObjects = projectObjects.filter(obj => !['sticky', 'frame', 'text', 'connector'].includes(obj.type))

  const allX = [
    ...childProjects.map(p => (p.workspacePosition?.x || 0) + 280),
    ...projectObjects.map(o => (o.position?.x || 0) + (o.size?.width || 220)),
  ]
  const allY = [
    ...childProjects.map(p => (p.workspacePosition?.y || 0) + 220),
    ...projectObjects.map(o => (o.position?.y || 0) + (o.size?.height || 160)),
  ]
  const maxX = Math.max(1400, ...allX)
  const maxY = Math.max(900, ...allY)

  const activeProject = activeId ? childProjects.find(p => p.id === activeId) : null
  const activeObject = activeId ? projectObjects.find(o => o.id === activeId) : null

  const screenToCanvas = useCallback((x, y) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (x - rect.left - pan.x) / zoom,
      y: (y - rect.top - pan.y) / zoom,
    }
  }, [pan, zoom])

  const createCanvasObject = useCallback(async (payload) => {
    const res = await taskboardClient.createCanvasObject({
      ...payload,
      projectId: project.id,
    })
    if (res.ok) actions.addCanvasObject(res.data)
    return res
  }, [actions, project.id])

  const createTaskFromCanvasItem = useCallback(async (obj) => {
    try {
      const title = obj.data?.title || obj.data?.text || `${obj.type} from ${project.name}`
      const res = await taskboardClient.createTask({
        title,
        description: `Generated from ${obj.type} canvas item in project "${project.name}"`,
        projectId: project.id,
        canvasItemId: obj.id,
        sourceType: 'project-canvas-item',
        sourceId: obj.id,
      })
      if (!res.ok) throw new Error('Task creation failed')
      actions.addTask(res.data)
      actions.updateCanvasObject({ id: obj.id, data: { ...obj.data, taskId: res.data.id } })
      taskboardClient.updateCanvasObject(obj.id, { data: { ...obj.data, taskId: res.data.id } }).catch(() => {})
      appActions.addToast({ type: 'success', message: `Task created from ${obj.type}` })
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed to create task: ${err.message}` })
    }
  }, [actions, appActions, project.id, project.name])

  const createTaskFromProjectFolder = useCallback(async (sourceProject) => {
    try {
      const parentRes = await taskboardClient.createTask({
        title: `Project: ${sourceProject.name}`,
        description: `Parent task generated from nested project "${sourceProject.name}"`,
        projectId: sourceProject.id,
        sourceType: 'project-folder',
        sourceId: sourceProject.id,
        isProjectParentTask: true,
      })
      if (!parentRes.ok) throw new Error('Failed to create parent task')
      actions.addTask(parentRes.data)

      const familyIds = getProjectFamilyIds(sourceProject.id, state.projects)
      const relatedItems = (state.canvasObjects || []).filter(obj => obj.projectId && familyIds.includes(obj.projectId) && obj.type !== 'connector')
      const relatedTasks = state.tasks.filter(task => task.projectId && familyIds.includes(task.projectId))

      for (const task of relatedTasks) {
        const sub = await taskboardClient.createTask({
          title: `Subtask: ${task.title}`,
          description: task.description || 'Subtask from nested project',
          projectId: task.projectId,
          parentTaskId: parentRes.data.id,
          sourceType: 'project-task',
          sourceId: task.id,
        })
        if (sub.ok) actions.addTask(sub.data)
      }

      for (const item of relatedItems) {
        const sub = await taskboardClient.createTask({
          title: `Canvas Item: ${item.data?.title || item.type}`,
          description: `Subtask from nested canvas ${item.type}`,
          projectId: item.projectId,
          parentTaskId: parentRes.data.id,
          canvasItemId: item.id,
          sourceType: 'project-canvas-item',
          sourceId: item.id,
        })
        if (sub.ok) actions.addTask(sub.data)
      }

      actions.updateProject({ id: sourceProject.id, isTaskified: true, parentTaskId: parentRes.data.id })
      taskboardClient.updateProject(sourceProject.id, { isTaskified: true, parentTaskId: parentRes.data.id }).catch(() => {})
      appActions.addToast({ type: 'success', message: `Task created from project folder "${sourceProject.name}"` })
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed to create task from project: ${err.message}` })
    }
  }, [actions, appActions, state.canvasObjects, state.projects, state.tasks])

  const handleToolbarAction = async (toolId) => {
    const center = screenToCanvas(
      (canvasRef.current?.getBoundingClientRect().left || 0) + ((canvasRef.current?.clientWidth || 1200) / 2),
      (canvasRef.current?.getBoundingClientRect().top || 0) + ((canvasRef.current?.clientHeight || 700) / 2),
    )

    const place = {
      x: snap ? Math.round(center.x / 20) * 20 : center.x,
      y: snap ? Math.round(center.y / 20) * 20 : center.y,
    }

    if (toolId === 'lines') {
      setConnectMode({ active: true, sourceId: null })
      return
    }

    if (toolId === 'images') {
      imageInputRef.current?.click()
      return
    }

    if (toolId === 'agent-chat') {
      setShowAgentChat(true)
      return
    }

    if (toolId === 'notes') {
      await createCanvasObject({
        type: 'sticky',
        position: place,
        size: { width: 190, height: 180 },
        color: '#fef08a',
        data: { text: '' },
      })
      return
    }

    if (toolId === 'text') {
      await createCanvasObject({ type: 'text', position: place, data: { text: 'Text', fontSize: 24 } })
      return
    }

    if (toolId === 'files') {
      const nextDoc = projectDocuments[0]
      await createCanvasObject({
        type: 'file',
        position: place,
        size: { width: 240, height: 130 },
        color: 'rgba(59,130,246,0.18)',
        data: {
          title: nextDoc ? nextDoc.name || nextDoc.filename : 'File Card',
          body: nextDoc ? `Attached file • ${(nextDoc.mimeType || 'Document')}` : 'No files yet. Upload in Files tab and pin cards here.',
          documentId: nextDoc?.id || null,
        },
      })
      return
    }

    if (toolId === 'metrics') {
      await createCanvasObject({
        type: 'metric',
        position: place,
        size: { width: 220, height: 128 },
        color: 'rgba(74,222,128,0.12)',
        data: {
          title: 'Progress',
          value: `${progress.percent}%`,
          label: `${progress.completed}/${progress.total} tasks complete`,
        },
      })
      return
    }

    if (toolId === 'task-cards') {
      const nextTask = projectTasks.find(task => task.stage !== 'completed') || projectTasks[0]
      await createCanvasObject({
        type: 'task-card',
        position: place,
        size: { width: 250, height: 140 },
        color: 'rgba(245,158,11,0.14)',
        data: {
          title: nextTask?.title || 'Task Card',
          body: nextTask ? `Priority: ${nextTask.priority}` : 'Use this card to map a task visually.',
          linkedTaskId: nextTask?.id || null,
        },
      })
      return
    }

    if (toolId === 'checklists') {
      await createCanvasObject({
        type: 'checklist',
        position: place,
        size: { width: 250, height: 170 },
        color: 'rgba(167,139,250,0.16)',
        data: {
          title: 'Checklist',
          items: [
            { text: 'Define scope', checked: false },
            { text: 'Assign owner', checked: false },
            { text: 'Ship build', checked: false },
          ],
        },
      })
      return
    }

    if (toolId === 'shapes') {
      await createCanvasObject({
        type: 'shape',
        position: place,
        size: { width: 190, height: 140 },
        color: 'rgba(6,182,212,0.14)',
        data: { title: 'Shape', shapeType: 'rectangle', shapeColor: 'rgba(0,212,255,0.4)' },
      })
    }
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      await createCanvasObject({
        type: 'image',
        position: { x: 320, y: 180 },
        size: { width: 260, height: 170 },
        color: 'rgba(255,255,255,0.06)',
        data: { title: file.name, src: event.target?.result, mimeType: file.type },
      })
    }
    reader.readAsDataURL(file)
  }

  const handleObjectClickForConnection = useCallback(async (targetId) => {
    if (!connectMode.active) return
    if (!connectMode.sourceId) {
      setConnectMode({ active: true, sourceId: targetId })
      return
    }
    if (connectMode.sourceId === targetId) {
      setConnectMode({ active: false, sourceId: null })
      setCursorPos(null)
      return
    }

    const res = await createCanvasObject({
      type: 'connector',
      position: { x: 0, y: 0 },
      color: '#71717a',
      data: { sourceId: connectMode.sourceId, targetId, style: 'curved', arrow: 'end', label: '' },
    })
    if (res.ok) {
      setConnectMode({ active: false, sourceId: null })
      setCursorPos(null)
    }
  }, [connectMode, createCanvasObject])

  const handleMouseDown = (e) => {
    if (e.button === 2) return
    const isCanvasBackground = e.target === e.currentTarget || e.target.closest('.project-workspace-canvas-inner') === e.target
    if (!isCanvasBackground) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY }
    panOrigin.current = { ...pan }
    setSelectedIds(new Set())
    e.currentTarget.style.cursor = 'grabbing'
  }

  const handleMouseMove = (e) => {
    if (connectMode.active) {
      setCursorPos(screenToCanvas(e.clientX, e.clientY))
    }
    if (!isPanning.current) return
    setPan({
      x: panOrigin.current.x + (e.clientX - panStart.current.x),
      y: panOrigin.current.y + (e.clientY - panStart.current.y),
    })
  }

  const handleMouseUp = (e) => {
    isPanning.current = false
    if (e.currentTarget) e.currentTarget.style.cursor = connectMode.active ? 'crosshair' : 'default'
  }

  const handleDragStart = (event) => setActiveId(event.active.id)

  const handleDragEnd = (event) => {
    const { active, delta } = event
    setActiveId(null)
    if (!delta || (delta.x === 0 && delta.y === 0)) return

    const dx = delta.x / zoom
    const dy = delta.y / zoom
    const snapValue = (v) => (snap ? Math.round(v / 20) * 20 : v)

    const nestedProject = childProjects.find(p => p.id === active.id)
    if (nestedProject) {
      const prev = nestedProject.workspacePosition || { x: 80, y: 80 }
      const next = { x: Math.max(0, snapValue(prev.x + dx)), y: Math.max(0, snapValue(prev.y + dy)) }
      actions.updateProject({ id: nestedProject.id, workspacePosition: next })
      taskboardClient.updateProject(nestedProject.id, { workspacePosition: next }).catch(() => {})
      return
    }

    const obj = projectObjects.find(item => item.id === active.id)
    if (!obj) return
    const prev = obj.position || { x: 0, y: 0 }
    const next = { x: Math.max(0, snapValue(prev.x + dx)), y: Math.max(0, snapValue(prev.y + dy)) }
    actions.updateCanvasObject({ id: obj.id, position: next })
    taskboardClient.updateCanvasObject(obj.id, { position: next }).catch(() => {})
  }

  const contextSummary = useMemo(() => ({
    items: projectObjects.length + childProjects.length,
    tasks: projectTasks.filter(task => task.stage !== 'completed').length,
  }), [projectObjects.length, childProjects.length, projectTasks])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside style={{
        width: '220px',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(8,10,14,0.96)',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flexShrink: 0,
      }}>
        <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Project Progress</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)', marginTop: '2px' }}>{progress.percent}%</div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress.percent}%`, background: 'var(--theme-accent)', transition: 'width 0.2s' }} />
          </div>
        </div>

        {TOOL_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToolbarAction(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: connectMode.active && item.id === 'lines' ? 'rgba(0,212,255,0.16)' : 'rgba(255,255,255,0.02)',
              color: connectMode.active && item.id === 'lines' ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={() => setSnap(value => !value)} style={{
            flex: 1, padding: '7px 6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
            background: snap ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
            color: snap ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>
            Snap {snap ? 'On' : 'Off'}
          </button>
          <button onClick={() => setShowMinimap(value => !value)} style={{
            flex: 1, padding: '7px 6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
            background: showMinimap ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
            color: showMinimap ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>
            Minimap
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleImageUpload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </aside>

      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#0a0a0f', cursor: connectMode.active ? 'crosshair' : 'default' }}
      >
        <div style={{ position: 'absolute', top: '10px', right: '14px', zIndex: 20, display: 'flex', gap: '6px' }}>
          <button onClick={() => setZoom(value => Math.min(2.2, value + 0.1))} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(10,10,15,0.9)', color: 'var(--theme-text-primary)' }}>+</button>
          <button onClick={() => setZoom(value => Math.max(0.5, value - 0.1))} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(10,10,15,0.9)', color: 'var(--theme-text-primary)' }}>-</button>
          <button onClick={() => setZoom(1)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(10,10,15,0.9)', color: 'var(--theme-text-primary)' }}>100%</button>
        </div>

        <div
          className="project-workspace-canvas-inner"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            minWidth: `${maxX + 260}px`,
            minHeight: `${maxY + 200}px`,
          }}
        >
          <CanvasGrid gridSize={20} snap={snap} gridStyle="dots" canvasBg="#0a0a0f" />

          <CanvasConnector
            connectors={connectors}
            projects={childProjects.map(child => ({ ...child, canvasPosition: child.workspacePosition }))}
            canvasObjects={projectObjects}
            canvasWidth={maxX}
            canvasHeight={maxY}
            onSelect={(id) => setSelectedIds(new Set([id]))}
            selectedIds={[...selectedIds]}
            onUpdate={(id, patch) => {
              const existing = projectObjects.find(item => item.id === id)
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
            {frames.map((frame) => (
              <CanvasFrame
                key={frame.id}
                obj={frame}
                isDragging={activeId === frame.id}
                canvasBg="#0a0a0f"
                isSelected={selectedIds.has(frame.id)}
                onCreateTask={createTaskFromCanvasItem}
                onClick={() => handleObjectClickForConnection(frame.id)}
              />
            ))}

            {childProjects.map((child) => (
              <ProjectFolderCard
                key={child.id}
                project={{ ...child, canvasPosition: child.workspacePosition || { x: 80, y: 80 } }}
                isDragging={activeId === child.id}
                isSelected={selectedIds.has(child.id)}
                progress={getProjectProgressSummary(child.id, state.projects, state.tasks).percent}
                onOpen={() => actions.setSelectedProject(child)}
                onCreateTaskFromProject={createTaskFromProjectFolder}
                onClick={() => handleObjectClickForConnection(child.id)}
              />
            ))}

            {stickies.map((sticky) => (
              <CanvasStickyNote
                key={sticky.id}
                obj={sticky}
                isDragging={activeId === sticky.id}
                isSelected={selectedIds.has(sticky.id)}
                onCreateTask={createTaskFromCanvasItem}
                onClick={() => handleObjectClickForConnection(sticky.id)}
              />
            ))}

            {textLabels.map((label) => (
              <CanvasTextLabel
                key={label.id}
                obj={label}
                isDragging={activeId === label.id}
                canvasBg="#0a0a0f"
                isSelected={selectedIds.has(label.id)}
                onCreateTask={createTaskFromCanvasItem}
                onClick={() => handleObjectClickForConnection(label.id)}
              />
            ))}

            {customObjects.map((obj) => (
              <ProjectCanvasObjectCard
                key={obj.id}
                obj={obj}
                isDragging={activeId === obj.id}
                isSelected={selectedIds.has(obj.id)}
                onCreateTask={createTaskFromCanvasItem}
                onClick={() => handleObjectClickForConnection(obj.id)}
              />
            ))}

            <DragOverlay dropAnimation={{ duration: 140, easing: 'ease-out' }}>
              {activeProject && (
                <ProjectFolderCard
                  project={{ ...activeProject, canvasPosition: activeProject.workspacePosition || { x: 80, y: 80 } }}
                  isOverlay
                  progress={getProjectProgressSummary(activeProject.id, state.projects, state.tasks).percent}
                />
              )}
              {activeObject?.type === 'sticky' && <CanvasStickyNote obj={activeObject} isOverlay />}
              {activeObject?.type === 'frame' && <CanvasFrame obj={activeObject} isOverlay canvasBg="#0a0a0f" />}
              {activeObject?.type === 'text' && <CanvasTextLabel obj={activeObject} isOverlay canvasBg="#0a0a0f" />}
              {activeObject && !['sticky', 'frame', 'text'].includes(activeObject.type) && (
                <ProjectCanvasObjectCard obj={activeObject} isOverlay />
              )}
            </DragOverlay>
          </DndContext>
        </div>

        <CanvasMinimap
          projects={childProjects.map(child => ({ ...child, canvasPosition: child.workspacePosition || { x: 80, y: 80 } }))}
          canvasObjects={projectObjects}
          pan={pan}
          zoom={zoom}
          viewportW={canvasRef.current?.clientWidth || window.innerWidth}
          viewportH={canvasRef.current?.clientHeight || window.innerHeight}
          onNavigate={setPan}
          visible={showMinimap}
        />
      </div>

      <AgentChatModal
        open={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        projectName={project.name}
        contextSummary={contextSummary}
      />
    </div>
  )
}
