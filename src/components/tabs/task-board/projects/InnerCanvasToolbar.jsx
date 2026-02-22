const TOOLS = [
  { id: 'connect', label: 'Connect', icon: '🔗', hotkey: 'C' },
  { id: 'shape', label: 'Shape', icon: '⬛' },
  { id: 'text', label: 'Text', icon: '🔤' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'file', label: 'File', icon: '📎' },
  { id: 'note', label: 'Note', icon: '🗒️' },
  { id: 'metric', label: 'Metric', icon: '📊' },
  { id: 'taskcreate', label: 'Task', icon: '✅' },
  { id: 'checklist', label: 'Checklist', icon: '☑️' },
  { id: 'subproject', label: 'Subproject', icon: '📁' },
  { id: 'agentchat', label: 'Agent', icon: '🤖' },
]

export default function InnerCanvasToolbar({ expanded, activeTool, onToggleExpand, onSelectTool }) {
  return (
    <div style={{ width: expanded ? 160 : 72, transition: 'width 200ms ease', background: '#0E1320', borderRight: '1px solid rgba(148,163,184,0.24)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button onClick={onToggleExpand} style={{ border: '1px solid rgba(148,163,184,0.24)', background: 'transparent', color: '#94A3B8', borderRadius: 8, height: 32, cursor: 'pointer' }}>{expanded ? 'Collapse' : '☰'}</button>
      {TOOLS.map((tool) => {
        const active = activeTool === tool.id
        return (
          <button key={tool.id} onClick={() => onSelectTool(tool.id)} title={tool.label} style={{ display: 'flex', alignItems: 'center', justifyContent: expanded ? 'space-between' : 'center', gap: 8, border: active ? '1px solid rgba(0,212,255,0.55)' : '1px solid rgba(148,163,184,0.24)', background: active ? 'rgba(0,212,255,0.12)' : 'transparent', color: active ? '#00D4FF' : '#E2E8F0', borderRadius: 8, minHeight: 38, cursor: 'pointer' }}>
            <span>{tool.icon}</span>
            {expanded && <span style={{ flex: 1, textAlign: 'left' }}>{tool.label}</span>}
            {expanded && <span style={{ color: '#64748B', fontSize: 10 }}>{tool.hotkey || ''}</span>}
          </button>
        )
      })}
    </div>
  )
}
