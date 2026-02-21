export default function CanvasGrid({ gridSize = 20, snap = false }) {
  const dotColor = snap ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern
          id="canvas-grid"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={gridSize / 2} cy={gridSize / 2} r="1" fill={dotColor} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#canvas-grid)" />
    </svg>
  )
}
