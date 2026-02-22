import { BOARD_THEME } from './boardConstants'

const TOOLS = ['select', 'shape', 'sticky', 'text', 'frame', 'connect', 'image', 'card']

export default function BoardToolbar() {
  return (
    <div style={{
      position: 'fixed',
      left: 16,
      top: 68,
      width: 52,
      padding: 6,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      zIndex: 100,
      background: BOARD_THEME.panelBg,
      border: `1px solid ${BOARD_THEME.border}`,
      borderRadius: 10,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
    }}>
      {TOOLS.map((tool) => (
        <button key={tool} title={tool} style={{
          height: 36,
          borderRadius: 8,
          border: `1px solid ${BOARD_THEME.border}`,
          background: '#0d0d0d',
          color: BOARD_THEME.textSecondary,
          fontSize: 10,
          textTransform: 'uppercase',
        }}>
          {tool[0]}
        </button>
      ))}
    </div>
  )
}
