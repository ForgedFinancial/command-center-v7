import { BOARD_THEME } from './boardConstants'

export default function BoardMinimap({ viewport }) {
  return (
    <div style={{
      position: 'fixed',
      left: 16,
      bottom: 16,
      width: 180,
      height: 110,
      background: BOARD_THEME.panelBg,
      border: `1px solid ${BOARD_THEME.border}`,
      borderRadius: 10,
      zIndex: 100,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 8,
        border: `1px solid ${BOARD_THEME.border}`,
        borderRadius: 8,
        background: '#0d0d0d',
      }} />
      <div style={{
        position: 'absolute',
        left: 20 + Math.max(-80, Math.min(80, viewport.x * 0.05)),
        top: 16 + Math.max(-45, Math.min(45, viewport.y * 0.05)),
        width: Math.max(24, 60 / viewport.zoom),
        height: Math.max(18, 40 / viewport.zoom),
        border: `1px solid ${BOARD_THEME.accentBlue}`,
        boxShadow: '0 0 12px rgba(59,130,246,0.3)',
        borderRadius: 4,
      }} />
    </div>
  )
}
