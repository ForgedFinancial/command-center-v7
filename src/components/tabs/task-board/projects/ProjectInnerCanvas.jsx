import { useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useProjectCanvas } from '../../../../context/ProjectCanvasContext'
import taskboardClient from '../../../../api/taskboardClient'
import CanvasGrid from './CanvasGrid'
import CanvasMinimap from './CanvasMinimap'
import CanvasToolbar from './CanvasToolbar'
import InnerCanvasToolbar from './InnerCanvasToolbar'
import PlacementManager from './tools/PlacementManager'
import AgentSuggestionModal from './modals/AgentSuggestionModal'
import TemplatePickerModal from './modals/TemplatePickerModal'

function DraggableItem({ obj, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: obj.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ position: 'absolute', left: obj.position?.x || obj.x || 0, top: obj.position?.y || obj.y || 0, width: obj.size?.width || 220, minHeight: 110, padding: 10, borderRadius: 10, border: '1px solid rgba(148,163,184,0.24)', background: '#0E1320', color: '#E2E8F0', transform: isDragging ? 'rotate(1.5deg) translateY(-2px) scale(1.02)' : CSS.Translate.toString(transform), boxShadow: isDragging ? '0 14px 34px rgba(0,0,0,0.5)' : 'none', transition: 'transform var(--motion-fast,120ms ease), box-shadow var(--motion-fast,120ms ease)' }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{obj.data?.title || obj.type}</div>
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{obj.data?.text || ''}</div>
    </div>
  )
}

export default function ProjectInnerCanvas({ project }) {
  const { state, actions } = useTaskBoard()
  const {
    activeTool, setActiveTool, isPlacementMode, setIsPlacementMode, ghostPosition, setGhostPosition,
    zoom, setZoom, pan, setPan, sidebarExpanded, setSidebarExpanded,
    agentModalOpen, setAgentModalOpen, agentSuggestionText, setAgentSuggestionText,
    templatePickerOpen, setTemplatePickerOpen,
  } = useProjectCanvas()

  const [activeId, setActiveId] = useState(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [search, setSearch] = useState('')
  const [snap, setSnap] = useState(true)
  const [bg, setBg] = useState('#07090F')
  const [gridStyle, setGridStyle] = useState('dots')
  const [agentLoading, setAgentLoading] = useState(false)

  const canvasRef = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartOffset = useRef({ x: 0, y: 0 })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const canvasObjects = useMemo(() => state.canvasObjects.filter(o => o.data?.canvasScope === 'inner' && o.data?.projectId === project.id), [state.canvasObjects, project.id])

  const screenToCanvas = (x, y) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (x - rect.left - pan.x) / zoom, y: (y - rect.top - pan.y) / zoom }
  }

  const exitPlacement = () => {
    setIsPlacementMode(false)
    setActiveTool('select')
    setGhostPosition(null)
  }

  const mapTool = (toolId) => ({
    note: 'note', shape: 'shape', text: 'text', image: 'image', file: 'file', metric: 'metric', checklist: 'checklist', taskcreate: 'taskcard', subproject: 'frame',
  }[toolId] || 'note')

  const placeObject = async (pos) => {
    const type = mapTool(activeTool)
    const payload = { type, position: pos, size: { width: 230, height: 120 }, projectId: project.id, canvasScope: 'inner', data: { title: `${type} object`, projectId: project.id, canvasScope: 'inner' } }
    const res = await taskboardClient.createCanvasObject(payload)
    if (res.ok) actions.addCanvasObject(res.data)
    exitPlacement()
  }

  const handleToolSelect = async (tool) => {
    if (tool === 'agentchat') {
      setAgentModalOpen(true)
      setAgentLoading(true)
      try {
        const out = await taskboardClient.request(`/api/taskboard/projects/${project.id}/agent-suggest`, { method: 'POST', body: JSON.stringify({ prompt: 'Suggest improvements.' }) })
        setAgentSuggestionText(out?.data?.text || out?.text || 'No suggestion returned.')
      } catch {
        setAgentSuggestionText('Unable to generate suggestion right now.')
      }
      setAgentLoading(false)
      return
    }
    if (tool === 'subproject') {
      setTemplatePickerOpen(true)
      return
    }
    if (tool === 'connect') {
      setActiveTool('connect')
      setIsPlacementMode(false)
      return
    }
    setActiveTool(tool)
    setIsPlacementMode(true)
  }

  const handleDragStart = (e) => setActiveId(e.active.id)
  const handleDragEnd = async ({ active, delta }) => {
    setActiveId(null)
    if (!delta || (!delta.x && !delta.y)) return
    const obj = canvasObjects.find(o => o.id === active.id)
    if (!obj) return
    const next = { x: Math.max(0, (obj.position?.x || 0) + delta.x / zoom), y: Math.max(0, (obj.position?.y || 0) + delta.y / zoom) }
    actions.updateCanvasObject({ id: obj.id, position: next })
    try {
      await taskboardClient.updateCanvasObject(obj.id, { position: next })
    } catch {
      actions.updateCanvasObject({ id: obj.id, position: obj.position })
    }
  }

  const zoomFit = () => setPan({ x: 40, y: 40 })

  return (
    <div style={{ display: 'flex', height: '100%', background: '#07090F' }}>
      <InnerCanvasToolbar expanded={sidebarExpanded} onToggleExpand={() => setSidebarExpanded(v => !v)} activeTool={activeTool} onSelectTool={handleToolSelect} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CanvasToolbar search={search} onSearchChange={setSearch} snap={snap} onSnapToggle={() => setSnap(v => !v)} zoom={zoom} onZoomChange={setZoom} onZoomReset={() => setZoom(1)} onZoomFit={zoomFit} canvasBg={bg} onBgChange={setBg} gridStyle={gridStyle} onGridStyleChange={setGridStyle} showMinimap={showMinimap} onToggleMinimap={() => setShowMinimap(v => !v)} connectMode={activeTool === 'connect'} onToggleConnect={() => setActiveTool(activeTool === 'connect' ? 'select' : 'connect')} />
        <div ref={canvasRef} onMouseMove={(e) => { if (isPanning.current) setPan({ x: panStartOffset.current.x + (e.clientX - panStart.current.x), y: panStartOffset.current.y + (e.clientY - panStart.current.y) }); if (isPlacementMode) setGhostPosition(screenToCanvas(e.clientX, e.clientY)) }} onMouseDown={(e) => { if (e.button !== 0 || e.target !== e.currentTarget) return; isPanning.current = true; panStart.current = { x: e.clientX, y: e.clientY }; panStartOffset.current = { ...pan } }} onMouseUp={() => { isPanning.current = false }} onWheel={(e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setZoom(v => Math.max(0.25, Math.min(3, v - e.deltaY * 0.001))) }} onClick={(e) => { if (isPlacementMode) placeObject(screenToCanvas(e.clientX, e.clientY)) }} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#07090F', cursor: isPlacementMode ? 'crosshair' : 'default' }}>
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', minWidth: 2200, minHeight: 1600, position: 'relative' }}>
            <CanvasGrid gridSize={20} snap={snap} gridStyle={gridStyle} canvasBg={bg} />
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {canvasObjects.map(obj => <DraggableItem key={obj.id} obj={obj} isDragging={activeId === obj.id} />)}
              <DragOverlay>{activeId ? <DraggableItem obj={canvasObjects.find(o => o.id === activeId)} isDragging /> : null}</DragOverlay>
            </DndContext>
            {isPlacementMode && ghostPosition && <div style={{ position: 'absolute', left: ghostPosition.x, top: ghostPosition.y, width: 220, height: 110, border: '1px dashed rgba(0,212,255,0.55)', background: 'rgba(0,212,255,0.08)', borderRadius: 10, pointerEvents: 'none' }} />}
          </div>
          <div style={{ position: 'absolute', top: 8, right: 8, width: 220, height: 2, background: 'rgba(148,163,184,0.24)' }}><div style={{ width: `${project.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg,#00D4FF,#48E2FF)' }} /></div>
          <CanvasMinimap projects={[]} canvasObjects={canvasObjects} pan={pan} zoom={zoom} viewportW={1200} viewportH={700} onNavigate={setPan} visible={showMinimap} />
        </div>
      </div>
      <PlacementManager active={isPlacementMode} onEsc={exitPlacement} />
      <AgentSuggestionModal open={agentModalOpen} text={agentSuggestionText} loading={agentLoading} onApply={() => {}} onRegenerate={() => handleToolSelect('agentchat')} onClose={() => setAgentModalOpen(false)} />
      <TemplatePickerModal open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} onApply={async (template) => {
        for (const obj of template.objects) {
          const res = await taskboardClient.createCanvasObject({ ...obj, position: { x: obj.x, y: obj.y }, projectId: project.id, canvasScope: 'inner', data: { ...(obj.data || {}), projectId: project.id, canvasScope: 'inner' } })
          if (res.ok) actions.addCanvasObject(res.data)
        }
        setTemplatePickerOpen(false)
      }} />
    </div>
  )
}
