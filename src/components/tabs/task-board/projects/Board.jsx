import { useRef } from 'react'
import BoardCanvas from './BoardCanvas'
import BoardMinimap from './BoardMinimap'
import BoardToolbar from './BoardToolbar'
import BoardTopbar from './BoardTopbar'
import useViewport from './hooks/useViewport'

export default function Board({ projectId }) {
  const containerRef = useRef(null)
  const {
    viewport,
    beginPan,
    onPointerMove,
    endPan,
    onWheel,
    centerOnOrigin,
    zoomIn,
    zoomOut,
  } = useViewport(containerRef)

  if (!projectId) return null

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <BoardCanvas
        viewport={viewport}
        onPointerDown={beginPan}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onWheel={onWheel}
      />
      <BoardToolbar />
      <BoardTopbar zoom={viewport.zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={centerOnOrigin} />
      <BoardMinimap viewport={viewport} />
    </div>
  )
}
