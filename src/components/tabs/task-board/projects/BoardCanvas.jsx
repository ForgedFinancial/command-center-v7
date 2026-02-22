import { BOARD_THEME, GRID_BASE_SIZE } from './boardConstants'

export default function BoardCanvas({ viewport, onPointerDown, onPointerMove, onPointerUp, onWheel }) {
  const gridSize = GRID_BASE_SIZE * viewport.zoom

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: BOARD_THEME.canvasBg,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    >
      <div
        className="board-canvas"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
          position: 'absolute',
          inset: 0,
        }}
      />
    </div>
  )
}
