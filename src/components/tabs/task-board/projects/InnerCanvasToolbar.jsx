import DelayedTooltip from './components/DelayedTooltip'
import ShortcutHint from './components/ShortcutHint'

const TOOLS = [
  { id: 'select', label: 'Select', icon: '◻', hotkey: 'V' },
  { id: 'task', label: 'Task', icon: '✅', hotkey: 'T' },
  { id: 'note', label: 'Note', icon: '🗒️', hotkey: 'N' },
  { id: 'shape', label: 'Shape', icon: '⬛', hotkey: 'S' },
  { id: 'metric', label: 'Metric', icon: '📊' },
  { id: 'checklist', label: 'Checklist', icon: '☑️' },
  { id: 'connect', label: 'Connect', icon: '🔗', hotkey: 'C' },
]

export default function InnerCanvasToolbar({ expanded, activeTool, isPlacementMode, onToggleExpand, onSelectTool, onToggleShortcuts }) {
  return (
    <div
      style={{
        width: expanded ? 176 : 72,
        transition: 'width var(--motion-base)',
        background: '#0E1320',
        borderRight: '1px solid rgba(154,167,188,0.20)',
        borderLeft: '2px solid #00D4FF',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <button
        onClick={onToggleExpand}
        style={{
          border: '1px solid rgba(154,167,188,0.24)',
          background: 'transparent',
          color: '#9AA7BC',
          borderRadius: 8,
          height: 32,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {expanded ? 'Collapse' : '☰'}
      </button>

      {TOOLS.map((tool) => {
        const active = activeTool === tool.id
        const tooltip = tool.hotkey ? `${tool.label} (${tool.hotkey})` : tool.label

        return (
          <DelayedTooltip key={tool.id} label={tooltip} delay={150} placement="right">
            <button
              onClick={() => onSelectTool(tool.id)}
              className={active ? 'tool-btn is-active' : 'tool-btn'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: expanded ? 'space-between' : 'center',
                gap: 8,
                border: active ? '1px solid rgba(0,212,255,0.68)' : '1px solid rgba(154,167,188,0.24)',
                background: active ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: active ? '#00D4FF' : '#E6EDF7',
                borderRadius: 8,
                minHeight: 40,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span aria-hidden="true">{tool.icon}</span>
              {expanded && <span style={{ flex: 1, textAlign: 'left', fontSize: 12 }}>{tool.label}</span>}
              {expanded && <span style={{ color: '#64748B', fontSize: 10 }}>{tool.hotkey || ''}</span>}
            </button>
          </DelayedTooltip>
        )
      })}

      <button
        onClick={onToggleShortcuts}
        style={{
          marginTop: 'auto',
          height: 32,
          borderRadius: 8,
          border: '1px solid rgba(154,167,188,0.24)',
          background: 'transparent',
          color: '#9AA7BC',
          cursor: 'pointer',
        }}
      >
        ?
      </button>

      <ShortcutHint visible={isPlacementMode} text="Click to place · Esc to cancel · Z to undo" />
    </div>
  )
}
