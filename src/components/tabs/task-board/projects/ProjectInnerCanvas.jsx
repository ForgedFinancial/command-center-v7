import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useProjectCanvas } from '../../../../context/ProjectCanvasContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasGrid from './CanvasGrid'
import CanvasMinimap from './CanvasMinimap'
import CanvasToolbar from './CanvasToolbar'
import CanvasConnector from './CanvasConnector'
import InnerCanvasToolbar from './InnerCanvasToolbar'
import KeyboardShortcutPanel from './components/KeyboardShortcutPanel'

const TOOL_TO_TYPE = {
  task: 'task',
  note: 'note',
  shape: 'shape',
  text: 'text',
  image: 'image',
  file: 'file',
  subproject: 'subproject',
  checklist: 'checklist',
}

function createPayloadForTool(tool, position) {
  const type = TOOL_TO_TYPE[tool] || 'note'
  switch (type) {
    case 'task':
      return {
        type,
        position,
        size: { width: 240, height: 120 },
        data: { name: 'New Task', assignee: 'Unassigned', status: 'todo', priority: 'medium' },
      }
    case 'note':
      return {
        type,
        position,
        size: { width: 220, height: 120 },
        data: { text: '' },
      }
    case 'shape':
      return {
        type,
        position,
        size: { width: 180, height: 110 },
        data: { label: 'Shape' },
      }
    case 'text':
      return {
        type,
        position,
        size: { width: 260, height: 90 },
        data: { text: 'Text block', textStyle: 'body' },
      }
    case 'image':
      return {
        type,
        position,
        size: { width: 260, height: 160 },
        data: { src: null, alt: '', fileName: '', fileSize: 0 },
      }
    case 'file':
      return {
        type,
        position,
        size: { width: 260, height: 120 },
        data: { fileName: 'Document', fileSize: 0, fileType: 'file', previewUrl: null },
      }
    case 'subproject':
      return {
        type,
        position,
        size: { width: 260, height: 130 },
        data: { name: 'Subproject', status: 'planning' },
      }
    case 'checklist':
      return {
        type,
        position,
        size: { width: 220, height: 120 },
        data: { name: 'Checklist', items: [{ text: 'Item 1', checked: false }, { text: 'Item 2', checked: false }] },
      }
    default:
      return {
        type: 'note',
        position,
        size: { width: 220, height: 120 },
        data: { text: '' },
      }
  }
}

function taskStatusLabel(status) {
  if (status === 'in_progress') return 'In Progress'
  if (status === 'done') return 'Done'
  return 'Todo'
}

function taskStatusColor(status) {
  if (status === 'done') return '#22C55E'
  if (status === 'in_progress') return '#EAB308'
  return '#9AA7BC'
}

function ObjectCard({
  object,
  isDragging,
  isOverlay,
  isSelected,
  isEditing,
  draftValue,
  onDraftChange,
  onSelect,
  onDoubleEdit,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onTaskStatusCycle,
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: object.id })
  const position = object.position || { x: 0, y: 0 }
  const size = object.size || { width: 220, height: 120 }
  const noteText = object.data?.text || ''
  const notePreview = noteText.length > 80 ? `${noteText.slice(0, 80)}…` : noteText

  const checklistItems = Array.isArray(object.data?.items)
    ? object.data.items
    : Array.isArray(object.data?.checklist)
      ? object.data.checklist.map((text) => ({ text, checked: false }))
      : []
  const checkedCount = checklistItems.filter((item) => item.checked).length

  const renderBody = () => {
    if (isEditing) {
      const isNote = object.type === 'note'
      if (isNote) {
        return (
          <textarea
            autoFocus
            value={draftValue}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
              }
            }}
            rows={4}
            style={{ width: '100%', border: '1px solid rgba(0,212,255,0.42)', borderRadius: 8, background: 'rgba(12,16,24,0.82)', color: '#E6EDF7', padding: 8, resize: 'none' }}
          />
        )
      }

      return (
        <input
          autoFocus
          value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          style={{ width: '100%', height: 32, border: '1px solid rgba(0,212,255,0.42)', borderRadius: 8, background: 'rgba(12,16,24,0.82)', color: '#E6EDF7', padding: '0 8px' }}
        />
      )
    }

    if (object.type === 'note') {
      return (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF7', marginBottom: 6 }}>Note</div>
          <div style={{ fontSize: 11, color: '#9AA7BC', lineHeight: 1.4 }}>{notePreview || 'Double-click to add note content.'}</div>
        </>
      )
    }

    if (object.type === 'task' || object.type === 'taskcard' || object.type === 'task-card') {
      const status = object.data?.status || 'todo'
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF7' }}>{object.data?.name || object.data?.title || 'Task'}</div>
            <button
              onClick={(e) => { e.stopPropagation(); onTaskStatusCycle(object) }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ borderRadius: 999, border: `1px solid ${taskStatusColor(status)}`, background: 'transparent', color: taskStatusColor(status), fontSize: 10, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
            >
              {taskStatusLabel(status)}
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,212,255,0.16)', border: '1px solid rgba(0,212,255,0.35)', display: 'grid', placeItems: 'center', fontSize: 10, color: '#00D4FF' }}>
              {(object.data?.assignee || 'U').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: '#9AA7BC' }}>{object.data?.assignee || 'Unassigned'}</span>
          </div>
        </>
      )
    }
    if (object.type === 'text') {
      return <div style={{ fontSize: 12, color: '#E6EDF7' }}>{object.data?.text || object.data?.title || 'Text'}</div>
    }

    if (object.type === 'image') {
      return (
        <>
          {object.data?.src ? <img src={object.data.src} alt={object.data?.alt || 'Image'} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ fontSize: 11, color: '#9AA7BC' }}>Image placeholder — upload from sidebar</div>}
          <div style={{ marginTop: 6, fontSize: 10, color: '#9AA7BC' }}>{object.data?.alt || 'No alt text'}</div>
        </>
      )
    }

    if (object.type === 'file') {
      return (
        <>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{object.data?.fileName || 'Document'}</div>
          <div style={{ marginTop: 4, fontSize: 10, color: '#9AA7BC' }}>{object.data?.fileSize || ''} {object.data?.fileType || ''}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button style={{ height: 22, borderRadius: 6, border: '1px solid rgba(154,167,188,0.24)', background: 'transparent', color: '#E6EDF7', fontSize: 10 }}>Preview</button>
            <button style={{ height: 22, borderRadius: 6, border: '1px solid rgba(154,167,188,0.24)', background: 'transparent', color: '#E6EDF7', fontSize: 10 }}>Download</button>
          </div>
        </>
      )
    }

    if (object.type === 'subproject') {
      return <div style={{ fontSize: 12, color: '#E6EDF7' }}>🧩 {object.data?.title || 'Subproject'}</div>
    }


    if (object.type === 'text') {
      return <div style={{ fontSize: 12, color: '#E6EDF7' }}>{object.data?.text || 'Text block'}</div>
    }

    if (object.type === 'image') {
      return (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E6EDF7', marginBottom: 6 }}>{object.data?.fileName || 'Image'}</div>
          {object.data?.src ? <img src={object.data.src} alt={object.data?.alt || 'Image'} style={{ width: '100%', maxHeight: 86, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ fontSize: 11, color: '#9AA7BC' }}>Upload image then click canvas to place.</div>}
        </>
      )
    }

    if (object.type === 'file') {
      return <div style={{ fontSize: 11, color: '#9AA7BC' }}>📎 {object.data?.fileName || 'Document'} · {Math.round((object.data?.fileSize || 0)/1024)} KB</div>
    }

    if (object.type === 'subproject') {
      return <div style={{ fontSize: 12, color: '#E6EDF7' }}>🧩 {object.data?.name || 'Subproject'}</div>
    }

    if (object.type === 'shape') {
      return <div style={{ fontSize: 12, color: '#E6EDF7' }}>{object.data?.label?.trim() || 'Shape'}</div>
    }

    if (object.type === 'checklist') {
      return <div style={{ fontSize: 12, color: '#E6EDF7' }}>{checkedCount}/{checklistItems.length || 0} complete</div>
    }

    return <div style={{ fontSize: 12, color: '#E6EDF7' }}>{object.data?.name || object.data?.label || object.type}</div>
  }

  return (
    <div
      ref={setNodeRef}
      className="inner-object-card"
      {...attributes}
      {...(!isEditing ? listeners : {})}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(object.id)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleEdit(object)
      }}
      style={{
        position: isOverlay ? 'relative' : 'absolute',
        left: isOverlay ? undefined : position.x,
        top: isOverlay ? undefined : position.y,
        width: size.width,
        minHeight: size.height,
        borderRadius: 12,
        border: isSelected ? '1px solid rgba(0,212,255,0.62)' : '1px solid rgba(154,167,188,0.24)',
        background: 'rgba(12,16,24,0.72)',
        padding: 10,
        color: '#E6EDF7',
        boxShadow: isSelected ? '0 0 0 1px rgba(0,212,255,0.48), 0 0 18px rgba(0,212,255,0.28)' : '0 8px 24px rgba(0,0,0,0.34)',
        transform: isDragging && !isOverlay ? undefined : (CSS.Translate.toString(transform) || undefined),
        opacity: isDragging && !isOverlay ? 0.65 : 1,
        zIndex: isDragging ? 1000 : isSelected ? 15 : 8,
        cursor: isEditing ? 'text' : 'grab',
      }}
    >
      {renderBody()}

      {isSelected && !isEditing && (
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
          <button onClick={(e) => { e.stopPropagation(); onDoubleEdit(object) }} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', cursor: 'pointer' }} title="Edit">✎</button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(object) }} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(154,167,188,0.24)', background: '#0E1320', color: '#E6EDF7', cursor: 'pointer' }} title="Duplicate">⧉</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(object.id) }} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', cursor: 'pointer' }} title="Delete">🗑</button>
        </div>
      )}
    </div>
  )
}

export default function ProjectInnerCanvas({ project }) {
  const { state, actions } = useTaskBoard()
  const {
    activeTool,
    setActiveTool,
    isPlacementMode,
    setIsPlacementMode,
    ghostPosition,
    setGhostPosition,
    zoom,
    setZoom,
    pan,
    setPan,
    sidebarExpanded,
    setSidebarExpanded,
  } = useProjectCanvas()

  const [activeId, setActiveId] = useState(null)
  const [selectedObjectId, setSelectedObjectId] = useState(null)
  const [editingObjectId, setEditingObjectId] = useState(null)
  const [draftValue, setDraftValue] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [shapeStyle, setShapeStyle] = useState('solid')
  const [textStyle, setTextStyle] = useState('body')
  const [shapeType, setShapeType] = useState('rectangle')
  const [projectNotes, setProjectNotes] = useState(() => localStorage.getItem(`projects:notes:${project.id}`) || '')
  const [snap, setSnap] = useState(true)
  const [search, setSearch] = useState('')
  const [canvasBg, setCanvasBg] = useState('#07090F')
  const [gridStyle, setGridStyle] = useState('dots')
  const [settlingObjectId, setSettlingObjectId] = useState(null)
  const [showMinimap, setShowMinimap] = useState(() => {
    const key = `projects:minimap:${project.id}`
    const stored = localStorage.getItem(key)
    return stored == null ? true : stored === '1'
  })


  const [connectMode, setConnectMode] = useState({ active: false, sourceId: null })
  const [cursorPos, setCursorPos] = useState(null)
  const canvasRef = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartOffset = useRef({ x: 0, y: 0 })
  const undoStack = useRef([])
  const previousProgress = useRef(project.progress || 0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const canvasObjects = useMemo(() => (
    state.canvasObjects
      .filter((obj) => obj.projectId === project.id || obj.data?.projectId === project.id)
      .filter((obj) => !search || (obj.data?.name || obj.data?.text || obj.data?.label || obj.type).toLowerCase().includes(search.toLowerCase()))
  ), [project.id, search, state.canvasObjects])

  const connectors = useMemo(() => canvasObjects.filter((obj) => obj.type === 'connector'), [canvasObjects])
  const placeableObjects = useMemo(() => canvasObjects.filter((obj) => obj.type !== 'connector'), [canvasObjects])

  useEffect(() => {
    localStorage.setItem(`projects:minimap:${project.id}`, showMinimap ? '1' : '0')
  }, [project.id, showMinimap])

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(`projects:notes:${project.id}`, projectNotes), 700)
    return () => clearTimeout(t)
  }, [project.id, projectNotes])

  useEffect(() => {
    const totalTasks = canvasObjects.filter((obj) => obj.type === 'task' || obj.type === 'taskcard' || obj.type === 'task-card').length
    const doneTasks = canvasObjects.filter((obj) => (obj.type === 'task' || obj.type === 'taskcard' || obj.type === 'task-card') && obj.data?.status === 'done').length
    const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

    if (progress === previousProgress.current) return

    previousProgress.current = progress
    actions.updateProject({ id: project.id, progress })
    taskboardClient.updateProject(project.id, { progress }).catch(() => {})
  }, [actions, canvasObjects, project.id])

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key !== 'Escape') return
      setActiveTool('select')
      setIsPlacementMode(false)
      setGhostPosition(null)
      setEditingObjectId(null)
      setDraftValue('')
      setConnectMode({ active: false, sourceId: null })
    }

    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [setActiveTool, setGhostPosition, setIsPlacementMode])

  useEffect(() => {
    const onShortcut = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const action = undoStack.current.pop()
        if (action) action()
        return
      }

      if (event.key === '?') {
        event.preventDefault()
        setShowShortcuts((open) => !open)
      }

      if (event.key.toLowerCase() === 'v') {
        event.preventDefault()
        setActiveTool('select')
        setIsPlacementMode(false)
      }
      if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        setActiveTool('task')
        setIsPlacementMode(true)
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setActiveTool('note')
        setIsPlacementMode(true)
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        setActiveTool('shape')
        setIsPlacementMode(true)
      }
      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        setSnap((value) => !value)
      }
      if (event.key.toLowerCase() === 'c') {
        event.preventDefault()
        setActiveTool((tool) => (tool === 'connect' ? 'select' : 'connect'))
        setIsPlacementMode(false)
      }
      if (event.key === 'Delete' && selectedObjectId) {
        event.preventDefault()
        handleDelete(selectedObjectId)
      }
    }

    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [selectedObjectId])

  const screenToCanvas = (x, y) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (x - rect.left - pan.x) / zoom,
      y: (y - rect.top - pan.y) / zoom,
    }
  }

  const handleToolSelect = (tool) => {
    if (tool === 'connect') {
      setActiveTool((current) => (current === 'connect' ? 'select' : 'connect'))
      setConnectMode((current) => ({ active: !current.active, sourceId: null }))
      setIsPlacementMode(false)
      setGhostPosition(null)
      return
    }

    setActiveTool(tool)
    setIsPlacementMode(tool !== 'select')
  }

  const handleCreateObject = async (event) => {
    if (!isPlacementMode || activeTool === 'select') return

    const position = screenToCanvas(event.clientX, event.clientY)
    const payload = createPayloadForTool(activeTool, position)
    if (payload.type === 'shape') payload.data = { ...payload.data, shapeStyle, shapeType }
    if (payload.type === 'text') payload.data = { ...payload.data, textStyle }

    try {
      const res = await taskboardClient.createProjectObject(project.id, payload)
      if (!res?.ok) throw new Error('Create object failed')
      actions.addCanvasObject(res.data)
      setSettlingObjectId(res.data.id)
      setTimeout(() => setSettlingObjectId(null), 180)
      undoStack.current.push(() => {
        actions.removeCanvasObject(res.data.id)
        taskboardClient.deleteProjectObject(project.id, res.data.id).catch(() => {})
      })
    } finally {
      setActiveTool('select')
      setIsPlacementMode(false)
      setGhostPosition(null)
    }
  }

  const handleDelete = async (objectId) => {
    const object = state.canvasObjects.find((candidate) => candidate.id === objectId)
    if (!object) return

    actions.removeCanvasObject(objectId)
    setSelectedObjectId(null)
    setEditingObjectId(null)

    await taskboardClient.deleteProjectObject(project.id, objectId).catch(() => {})

    undoStack.current.push(() => {
      actions.addCanvasObject(object)
      taskboardClient.createProjectObject(project.id, object).catch(() => {})
    })
  }

  const handleDuplicate = async (object) => {
    const payload = {
      ...object,
      position: {
        x: (object.position?.x || 0) + 20,
        y: (object.position?.y || 0) + 20,
      },
      id: undefined,
    }

    const res = await taskboardClient.createProjectObject(project.id, payload).catch(() => null)
    if (res?.ok) {
      actions.addCanvasObject(res.data)
      setSelectedObjectId(res.data.id)
    }
  }

  const enterInlineEdit = (object) => {
    setEditingObjectId(object.id)

    if (object.type === 'note') {
      setDraftValue(object.data?.text || '')
      return
    }

    setDraftValue(object.data?.name || object.data?.text || object.data?.label || '')
  }

  const saveInlineEdit = async () => {
    const object = canvasObjects.find((candidate) => candidate.id === editingObjectId)
    if (!object) {
      setEditingObjectId(null)
      return
    }

    const patch = { ...object.data }
    if (object.type === 'note' || object.type === 'text') patch.text = draftValue
    else if (object.type === 'shape') patch.label = draftValue
    else if (object.type === 'task' || object.type === 'taskcard' || object.type === 'task-card') patch.name = draftValue
    else if (object.type === 'subproject') patch.name = draftValue

    actions.updateCanvasObject({ id: object.id, data: patch })
    await taskboardClient.updateProjectObject(project.id, object.id, { data: patch }).catch(() => {})

    setEditingObjectId(null)
    setDraftValue('')
  }

  const cancelInlineEdit = () => {
    setEditingObjectId(null)
    setDraftValue('')
  }

  const cycleTaskStatus = async (object) => {
    const current = object.data?.status || 'todo'
    const next = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo'
    const data = { ...object.data, status: next }
    actions.updateCanvasObject({ id: object.id, data })
    await taskboardClient.updateProjectObject(project.id, object.id, { data }).catch(() => {})
  }

  const handleDragStart = (event) => setActiveId(event.active.id)

  const handleDragEnd = async ({ active, delta }) => {
    setActiveId(null)
    if (!delta || (!delta.x && !delta.y)) return

    const object = canvasObjects.find((candidate) => candidate.id === active.id)
    if (!object) return

    const oldPosition = object.position || { x: 0, y: 0 }
    const next = {
      x: Math.max(0, oldPosition.x + delta.x / zoom),
      y: Math.max(0, oldPosition.y + delta.y / zoom),
    }

    actions.updateCanvasObject({ id: object.id, position: next })

    try {
      await taskboardClient.updateProjectObject(project.id, object.id, { position: next })
    } catch {
      actions.updateCanvasObject({ id: object.id, position: oldPosition })
    }
  }

  const activeObject = activeId ? placeableObjects.find((object) => object.id === activeId) : null

  return (
    <div style={{ display: 'flex', height: '100%', background: '#07090F' }}>
      <InnerCanvasToolbar
        activeTool={activeTool}
        isPlacementMode={isPlacementMode}
        onSelectTool={handleToolSelect}
        onToggleShortcuts={() => setShowShortcuts((open) => !open)}
        shapeStyle={shapeStyle}
        textStyle={textStyle}
        onShapeStyleChange={(style, shape) => { if (style && !shape) setShapeStyle(style); if (shape) setShapeType(shape) }}
        onTextStyleChange={setTextStyle}
        onImageUpload={(file) => { if (!file || file.size > 15 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = async () => { const payload = createPayloadForTool('image', { x: 220, y: 220 }); payload.data.src = String(reader.result); payload.data.fileName = file.name; payload.data.alt = file.name; const res = await taskboardClient.createProjectObject(project.id, payload).catch(() => null); if (res?.ok) actions.addCanvasObject(res.data) }; reader.readAsDataURL(file) }}
        onFileUpload={async (file) => { if (!file) return; const payload = createPayloadForTool('file', { x: 240, y: 240 }); payload.data.fileName = file.name; payload.data.fileSize = `${(file.size / 1024).toFixed(1)} KB`; payload.data.fileType = file.name.split('.').pop()?.toUpperCase() || 'FILE'; const res = await taskboardClient.createProjectObject(project.id, payload).catch(() => null); if (res?.ok) actions.addCanvasObject(res.data) }}
        onCreateTaskDraft={() => { setActiveTool('task'); setIsPlacementMode(true) }}
        onAskAi={() => {}}
        onGenerateChecklist={() => {}}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <CanvasToolbar
          mode="inner"
          title="Inner Canvas"
          search={search}
          onSearchChange={setSearch}
          snap={snap}
          onSnapToggle={() => setSnap((value) => !value)}
          zoom={zoom}
          onZoomChange={setZoom}
          onZoomReset={() => setZoom(1)}
          onZoomFit={() => setPan({ x: 40, y: 40 })}
          canvasBg={canvasBg}
          onBgChange={setCanvasBg}
          gridStyle={gridStyle}
          onGridStyleChange={setGridStyle}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap((value) => !value)}
          connectMode={activeTool === 'connect'}
          onToggleConnect={() => handleToolSelect('connect')}
        />

        <div
          ref={canvasRef}
          className={isPlacementMode ? 'canvas--placement' : ''}
          onMouseMove={(event) => {
            if (isPanning.current) {
              setPan({
                x: panStartOffset.current.x + (event.clientX - panStart.current.x),
                y: panStartOffset.current.y + (event.clientY - panStart.current.y),
              })
            }

            const pt = screenToCanvas(event.clientX, event.clientY)
            setCursorPos(pt)

            if (isPlacementMode) {
              setGhostPosition(pt)
            }
          }}
          onMouseDown={(event) => {
            if (event.button !== 0) return
            if (event.target.closest('.inner-object-card')) return
            isPanning.current = true
            panStart.current = { x: event.clientX, y: event.clientY }
            panStartOffset.current = { ...pan }
            setSelectedObjectId(null)
          }}
          onMouseUp={() => {
            isPanning.current = false
          }}
          onClick={(event) => {
            if (event.target.closest('.inner-object-card')) return
            if (connectMode.active) {
              setSelectedObjectId(null)
              return
            }
            if (isPlacementMode) handleCreateObject(event)
            else setSelectedObjectId(null)
          }}
          onWheel={(event) => {
            if (!event.ctrlKey && !event.metaKey) return
            event.preventDefault()
            setZoom((value) => Math.max(0.25, Math.min(3, value - event.deltaY * 0.001)))
          }}
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            background: canvasBg,
            cursor: isPlacementMode ? 'crosshair' : 'default',
          }}
        >
          {connectMode.active && (
            <div className="placement-instruction">
              {connectMode.sourceId ? 'Click target to connect — Esc to cancel' : 'Click source to start connection — Esc to cancel'}
            </div>
          )}

          {isPlacementMode && (
            <div className="placement-instruction">
              Click anywhere to place {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} — Esc to cancel
            </div>
          )}

          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', minWidth: 2200, minHeight: 1600, position: 'relative' }}>
            <CanvasGrid gridSize={20} snap={snap} gridStyle={gridStyle} canvasBg={canvasBg} />

            {isPlacementMode && ghostPosition && (
              <div
                className="canvas-ghost"
                style={{
                  left: ghostPosition.x,
                  top: ghostPosition.y,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            <CanvasConnector connectors={connectors} projects={[]} canvasObjects={placeableObjects} connectMode={connectMode} cursorPos={cursorPos} canvasWidth={2600} canvasHeight={1800} />

                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {placeableObjects.map((object) => (
                <ObjectCard
                  key={object.id}
                  object={object}
                  isDragging={activeId === object.id}
                  isSelected={selectedObjectId === object.id}
                  isEditing={editingObjectId === object.id}
                  draftValue={draftValue}
                  onDraftChange={setDraftValue}
                  onSelect={(id) => {
                    if (connectMode.active) {
                      if (!connectMode.sourceId) {
                        setConnectMode({ active: true, sourceId: id })
                        return
                      }
                      if (connectMode.sourceId !== id) {
                        const payload = {
                          type: 'connector',
                          position: { x: 0, y: 0 },
                          size: { width: 0, height: 0 },
                          data: { sourceId: connectMode.sourceId, targetId: id, style: 'curved', arrow: 'end', strokePattern: 'solid', strokeWidth: 2, color: '#00D4FF' },
                        }
                        taskboardClient.createProjectObject(project.id, payload).then((res) => { if (res?.ok) actions.addCanvasObject(res.data) }).catch(() => {})
                      }
                      setConnectMode({ active: false, sourceId: null })
                      setActiveTool('select')
                      return
                    }
                    setSelectedObjectId(id)
                  }}
                  onDoubleEdit={enterInlineEdit}
                  onSave={saveInlineEdit}
                  onCancel={cancelInlineEdit}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onTaskStatusCycle={cycleTaskStatus}
                />
              ))}

              <DragOverlay>
                {activeObject ? (
                  <ObjectCard
                    object={activeObject}
                    isDragging
                    isOverlay
                    isSelected={selectedObjectId === activeObject.id}
                    isEditing={false}
                    draftValue=""
                    onDraftChange={() => {}}
                    onSelect={() => {}}
                    onDoubleEdit={() => {}}
                    onSave={() => {}}
                    onCancel={() => {}}
                    onDelete={() => {}}
                    onDuplicate={() => {}}
                    onTaskStatusCycle={() => {}}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          <CanvasMinimap
            projects={[]}
            canvasObjects={canvasObjects}
            pan={pan}
            zoom={zoom}
            viewportW={canvasRef.current?.clientWidth || 1200}
            viewportH={canvasRef.current?.clientHeight || 700}
            onNavigate={setPan}
            visible={showMinimap}
            position="bottom-left"
          />
        </div>
      </div>

      <aside style={{ width: 280, borderLeft: '1px solid rgba(154,167,188,0.22)', background: '#0B1220', padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E6EDF7', marginBottom: 8 }}>Project Notes</div>
        <textarea value={projectNotes} onChange={(e) => setProjectNotes(e.target.value)} placeholder='Notes autosave per project...' style={{ width: '100%', minHeight: 180, resize: 'vertical', borderRadius: 10, border: '1px solid rgba(154,167,188,0.24)', background: 'rgba(12,16,24,0.72)', color: '#E6EDF7', padding: 10 }} />
      </aside>

      <KeyboardShortcutPanel open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}
