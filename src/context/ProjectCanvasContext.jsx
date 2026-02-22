import { createContext, useContext, useMemo, useState } from 'react'

const ProjectCanvasContext = createContext(null)

export function ProjectCanvasProvider({ children }) {
  const [activeTool, setActiveTool] = useState('select')
  const [isPlacementMode, setIsPlacementMode] = useState(false)
  const [ghostPosition, setGhostPosition] = useState(null)
  const [selectedObjectIds, setSelectedObjectIds] = useState([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [agentModalOpen, setAgentModalOpen] = useState(false)
  const [agentSuggestionText, setAgentSuggestionText] = useState('')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  const value = useMemo(() => ({
    activeTool,
    setActiveTool,
    isPlacementMode,
    setIsPlacementMode,
    ghostPosition,
    setGhostPosition,
    canvasObjects: [],
    selectedObjectIds,
    setSelectedObjectIds,
    zoom,
    setZoom,
    pan,
    setPan,
    sidebarExpanded,
    setSidebarExpanded,
    agentModalOpen,
    setAgentModalOpen,
    agentSuggestionText,
    setAgentSuggestionText,
    templatePickerOpen,
    setTemplatePickerOpen,
  }), [activeTool, isPlacementMode, ghostPosition, selectedObjectIds, zoom, pan, sidebarExpanded, agentModalOpen, agentSuggestionText, templatePickerOpen])

  return <ProjectCanvasContext.Provider value={value}>{children}</ProjectCanvasContext.Provider>
}

export function useProjectCanvas() {
  const ctx = useContext(ProjectCanvasContext)
  if (!ctx) throw new Error('useProjectCanvas must be used inside ProjectCanvasProvider')
  return ctx
}
