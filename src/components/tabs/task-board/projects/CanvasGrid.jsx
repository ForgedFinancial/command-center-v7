export default function CanvasGrid({ gridSize = 20, snap = false, gridStyle = 'dots', canvasBg = '#0a0a0f' }) {
  if (gridStyle === 'none') return null

  const isLight = ['#e8e6e1', '#ffffff'].includes(canvasBg)
  const baseOpacity = snap ? (isLight ? 0.15 : 0.07) : (isLight ? 0.08 : 0.03)
  const lineColor = isLight ? `rgba(0,0,0,${baseOpacity})` : `rgba(255,255,255,${baseOpacity})`
  const dotSize = snap ? 1.5 : 1

  let patternContent = null

  if (gridStyle === 'dots') {
    patternContent = (
      <circle cx={gridSize / 2} cy={gridSize / 2} r={dotSize} fill={lineColor} />
    )
  } else if (gridStyle === 'lines') {
    patternContent = (
      <>
        <line x1="0" y1={gridSize} x2={gridSize} y2={gridSize} stroke={lineColor} strokeWidth="0.5" />
        <line x1={gridSize} y1="0" x2={gridSize} y2={gridSize} stroke={lineColor} strokeWidth="0.5" />
      </>
    )
  } else if (gridStyle === 'cross') {
    const c = gridSize / 2
    const arm = 3
    patternContent = (
      <>
        <line x1={c - arm} y1={c} x2={c + arm} y2={c} stroke={lineColor} strokeWidth="0.5" />
        <line x1={c} y1={c - arm} x2={c} y2={c + arm} stroke={lineColor} strokeWidth="0.5" />
      </>
    )
  }

  return (
    <svg style={{
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0,
    }}>
      <defs>
        <pattern id="canvas-grid-pattern" x="0" y="0"
          width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          {patternContent}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#canvas-grid-pattern)" />
    </svg>
  )
}
