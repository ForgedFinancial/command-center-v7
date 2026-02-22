import { BOARD_THEME } from './boardConstants'

const TOOLS = [
  ['select', 'V'],
  ['hand', 'H'],
  ['sticky_note', 'S'],
  ['text', 'T'],
  ['shape', 'R'],
  ['card', 'C'],
  ['frame', 'F'],
  ['connector', 'X'],
  ['image', 'I'],
  ['mindmap', 'M'],
  ['ai_suggestion', 'A'],
  ['document', 'D'],
  ['group', 'G'],
]

export default function BoardToolbar({ activeTool, onSetTool, onAddItem }) {
  return (
    <div style={{ position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)', width: 54, padding: 6, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 100, background: BOARD_THEME.panelBg, border: `1px solid ${BOARD_THEME.border}`, borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      {TOOLS.map(([tool, key]) => (
        <button key={tool} title={tool} onClick={() => onSetTool(tool)} style={{ height: 32, borderRadius: 8, border: `1px solid ${activeTool === tool ? BOARD_THEME.activeBorder : BOARD_THEME.border}`, background: activeTool === tool ? 'rgba(59,130,246,0.15)' : '#0d0d0d', color: BOARD_THEME.textSecondary, fontSize: 10 }}>{key}</button>
      ))}
      <button onClick={onAddItem} title="Add current tool" style={{ height: 36, borderRadius: 8, border: `1px solid ${BOARD_THEME.border}`, background: '#0d0d0d', color: BOARD_THEME.textPrimary }}>+</button>
    </div>
  )
}
