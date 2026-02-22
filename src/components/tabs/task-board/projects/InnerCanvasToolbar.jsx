import { useRef } from 'react'
import DelayedTooltip from './components/DelayedTooltip'
import ShortcutHint from './components/ShortcutHint'

const TOOL_ORDER = [
  { id: 'select', label: 'Select', icon: '◻', hotkey: 'V' },
  { id: 'task', label: 'Task', icon: '✅', hotkey: 'T' },
  { id: 'note', label: 'Note', icon: '🗒️', hotkey: 'N' },
  { id: 'shape', label: 'Shape', icon: '⬛', hotkey: 'S' },
  { id: 'text', label: 'Text', icon: 'T', hotkey: 'X' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'file', label: 'File', icon: '📎' },
  { id: 'checklist', label: 'Checklist', icon: '☑️' },
  { id: 'subproject', label: 'Subproject', icon: '🧩' },
  { id: 'connect', label: 'Connect', icon: '🔗', hotkey: 'C' },
]

const SHAPE_OPTIONS = ['rectangle', 'circle', 'triangle', 'diamond', 'hexagon', 'arrow', 'line']

function ToolRailButton({ tool, active, onClick }) {
  const tooltip = tool.hotkey ? `${tool.label} (${tool.hotkey})` : tool.label
  return (
    <DelayedTooltip label={tooltip} delay={150} placement="right">
      <button
        onClick={onClick}
        className={active ? 'tool-btn is-active' : 'tool-btn'}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          border: active ? '1px solid rgba(0,212,255,0.68)' : '1px solid rgba(154,167,188,0.24)',
          background: active ? 'linear-gradient(180deg, rgba(0,212,255,0.22), rgba(0,212,255,0.08))' : 'transparent',
          color: active ? '#00D4FF' : '#E6EDF7',
          cursor: 'pointer',
          fontSize: 16,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {tool.icon}
      </button>
    </DelayedTooltip>
  )
}

export default function InnerCanvasToolbar({
  activeTool,
  isPlacementMode,
  onSelectTool,
  onToggleShortcuts,
  shapeStyle,
  onShapeStyleChange,
  textStyle,
  onTextStyleChange,
  onImageUpload,
  onFileUpload,
  onCreateTaskDraft,
  onAskAi,
  onGenerateChecklist,
}) {
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  return (
    <div className="sb3" style={{ display: 'grid', gridTemplateColumns: '64px 220px', height: '100%', borderRight: '1px solid rgba(154,167,188,0.22)' }}>
      <nav className="rail" style={{ background: '#0A1020', borderRight: '1px solid rgba(154,167,188,0.22)', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TOOL_ORDER.map((tool) => (
          <ToolRailButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={() => onSelectTool(tool.id)} />
        ))}

        <button
          onClick={onToggleShortcuts}
          style={{ marginTop: 'auto', width: 44, height: 32, borderRadius: 8, border: '1px solid rgba(154,167,188,0.24)', background: 'transparent', color: '#9AA7BC', cursor: 'pointer' }}
        >
          ?
        </button>

        <ShortcutHint visible={isPlacementMode} text="Click to place · Esc to cancel · Z to undo" />
      </nav>

      <section className="dock" style={{ background: '#101A2D', padding: 12, overflow: 'auto', color: '#E6EDF7' }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Tool: {TOOL_ORDER.find((t) => t.id === activeTool)?.label || 'Select'}</div>

        {activeTool === 'shape' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#9AA7BC' }}>Stroke Style</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['hollow', 'dotted', 'solid'].map((style) => (
                <button key={style} onClick={() => onShapeStyleChange(style)} style={{ flex: 1, height: 30, borderRadius: 8, border: shapeStyle === style ? '1px solid rgba(0,212,255,0.56)' : '1px solid rgba(154,167,188,0.22)', background: shapeStyle === style ? 'rgba(0,212,255,0.12)' : 'transparent', color: '#E6EDF7', fontSize: 11 }}>{style}</button>
              ))}
            </div>
            <label style={{ fontSize: 11, color: '#9AA7BC' }}>Shape</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {SHAPE_OPTIONS.map((shape) => (
                <button key={shape} onClick={() => onShapeStyleChange(shapeStyle, shape)} style={{ height: 30, borderRadius: 8, border: '1px solid rgba(154,167,188,0.22)', background: 'transparent', color: '#E6EDF7', fontSize: 11 }}>{shape}</button>
              ))}
            </div>
          </div>
        )}

        {activeTool === 'text' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 11, color: '#9AA7BC' }}>Text Style</label>
            {['heading', 'subheading', 'body', 'label', 'caption', 'gradient', 'outlined', 'highlighted'].map((style) => (
              <button key={style} onClick={() => onTextStyleChange(style)} style={{ textAlign: 'left', height: 34, borderRadius: 8, border: textStyle === style ? '1px solid rgba(0,212,255,0.56)' : '1px solid rgba(154,167,188,0.22)', background: textStyle === style ? 'rgba(0,212,255,0.12)' : 'transparent', color: '#E6EDF7', fontSize: 12, padding: '0 10px' }}>{style}</button>
            ))}
          </div>
        )}

        {activeTool === 'image' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button onClick={() => imageInputRef.current?.click()} style={{ height: 36, borderRadius: 8, border: '1px solid rgba(154,167,188,0.22)', background: 'rgba(0,212,255,0.10)', color: '#E6EDF7' }}>Upload image</button>
            <input ref={imageInputRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp" style={{ display: 'none' }} onChange={(e) => onImageUpload(e.target.files?.[0])} />
          </div>
        )}

        {activeTool === 'file' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ height: 36, borderRadius: 8, border: '1px solid rgba(154,167,188,0.22)', background: 'rgba(0,212,255,0.10)', color: '#E6EDF7' }}>Upload file</button>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{ display: 'none' }} onChange={(e) => onFileUpload(e.target.files?.[0])} />
          </div>
        )}

        {activeTool === 'task' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button onClick={onCreateTaskDraft} style={{ height: 34, borderRadius: 8, border: '1px solid rgba(154,167,188,0.22)', background: 'transparent', color: '#E6EDF7' }}>Create Task Card</button>
            <button onClick={onAskAi} style={{ height: 34, borderRadius: 8, border: '1px solid rgba(0,212,255,0.45)', background: 'rgba(0,212,255,0.12)', color: '#00D4FF' }}>Ask AI</button>
          </div>
        )}

        {activeTool === 'checklist' && (
          <button onClick={onGenerateChecklist} style={{ height: 34, borderRadius: 8, border: '1px solid rgba(0,212,255,0.45)', background: 'rgba(0,212,255,0.12)', color: '#00D4FF' }}>Generate checklist with AI</button>
        )}

        {activeTool === 'subproject' && (
          <div style={{ fontSize: 11, color: '#9AA7BC', lineHeight: 1.5 }}>
            Place a subproject node on canvas. It opens its own nested workspace and rolls progress up.
          </div>
        )}
      </section>
    </div>
  )
}
