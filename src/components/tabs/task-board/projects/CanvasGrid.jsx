export default function CanvasGrid({ gridSize = 20, snap = false }) {
  const dotColor = snap ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'
  const dotSize = snap ? 1.5 : 1

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <pattern
          id="canvas-grid"
          x="0" y="0"
          width={gridSize} height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={gridSize / 2} cy={gridSize / 2} r={dotSize} fill={dotColor} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#canvas-grid)" />
    </svg>
  )
}
