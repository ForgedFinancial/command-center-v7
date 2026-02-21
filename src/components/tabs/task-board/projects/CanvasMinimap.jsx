import { useRef, useCallback, useEffect, useState } from 'react'

const MAP_W = 180
const MAP_H = 120
const PAD = 40 // logical padding around content bounds

// Project card dimensions (logical)
const CARD_W = 260
const CARD_H = 160

function getProjectColor(project) {
  return project.color || '#00d4ff'
}

function getStickyColor(obj) {
  return obj.color || '#fef08a'
}

function getObjectColor(obj) {
  switch (obj.type) {
    case 'sticky': return getStickyColor(obj)
    case 'frame': return 'rgba(0,212,255,0.25)'
    case 'text': return 'rgba(255,255,255,0.4)'
    case 'connector': return 'rgba(113,113,122,0.5)'
    default: return 'rgba(255,255,255,0.2)'
  }
}

/**
 * Computes the bounding box of all canvas content.
 */
function computeContentBounds(projects, canvasObjects) {
  const allRects = [
    ...projects.map(p => ({
      x: p.canvasPosition?.x || 0,
      y: p.canvasPosition?.y || 0,
      w: CARD_W,
      h: CARD_H,
    })),
    ...canvasObjects.filter(o => o.type !== 'connector').map(o => ({
      x: o.position?.x || 0,
      y: o.position?.y || 0,
      w: o.size?.width || 180,
      h: o.size?.height || 180,
    })),
  ]

  if (allRects.length === 0) {
    return { x: 0, y: 0, w: 1200, h: 800 }
  }

  const minX = Math.min(...allRects.map(r => r.x)) - PAD
  const minY = Math.min(...allRects.map(r => r.y)) - PAD
  const maxX = Math.max(...allRects.map(r => r.x + r.w)) + PAD
  const maxY = Math.max(...allRects.map(r => r.y + r.h)) + PAD

  return { x: minX, y: minY, w: Math.max(maxX - minX, 400), h: Math.max(maxY - minY, 300) }
}

/**
 * CanvasMinimap
 *
 * Props:
 *   projects        — array of project objects
 *   canvasObjects   — array of non-project canvas objects
 *   pan             — { x, y } current pan offset in screen px
 *   zoom            — current zoom level
 *   viewportW       — viewport width in px (canvas container)
 *   viewportH       — viewport height in px (canvas container)
 *   onNavigate      — (newPan: {x, y}) => void  — called when user clicks/drags minimap
 *   visible         — bool
 */
export default function CanvasMinimap({
  projects = [],
  canvasObjects = [],
  pan = { x: 0, y: 0 },
  zoom = 1,
  viewportW = window.innerWidth,
  viewportH = window.innerHeight,
  onNavigate,
  visible = true,
}) {
  const svgRef = useRef(null)
  const isDragging = useRef(false)

  if (!visible) return null

  const contentBounds = computeContentBounds(projects, canvasObjects)

  // Scale factors: map logical canvas coords → minimap px
  const scaleX = MAP_W / contentBounds.w
  const scaleY = MAP_H / contentBounds.h

  function toMapX(lx) { return (lx - contentBounds.x) * scaleX }
  function toMapY(ly) { return (ly - contentBounds.y) * scaleY }
  function toMapW(lw) { return lw * scaleX }
  function toMapH(lh) { return lh * scaleY }

  // Viewport rectangle in logical coords
  // pan is: canvasOrigin * zoom + pan = screenPos
  // logical pos of screen top-left = -pan.x / zoom, -pan.y / zoom
  const vpLogX = -pan.x / zoom
  const vpLogY = -pan.y / zoom
  const vpLogW = viewportW / zoom
  const vpLogH = viewportH / zoom

  const vpMapX = toMapX(vpLogX)
  const vpMapY = toMapY(vpLogY)
  const vpMapW = Math.max(8, vpLogW * scaleX)
  const vpMapH = Math.max(6, vpLogH * scaleY)

  const handlePointerEvent = useCallback((e) => {
    if (!svgRef.current || !onNavigate) return
    const rect = svgRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left  // px in minimap
    const my = e.clientY - rect.top

    // Convert minimap px → logical canvas coord
    const lx = mx / scaleX + contentBounds.x
    const ly = my / scaleY + contentBounds.y

    // Center viewport on that point
    const newPanX = -(lx - vpLogW / 2) * zoom
    const newPanY = -(ly - vpLogH / 2) * zoom
    onNavigate({ x: newPanX, y: newPanY })
  }, [scaleX, scaleY, contentBounds, zoom, vpLogW, vpLogH, onNavigate])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
    handlePointerEvent(e)
  }, [handlePointerEvent])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    handlePointerEvent(e)
  }, [handlePointerEvent])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const nonConnectors = canvasObjects.filter(o => o.type !== 'connector')

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50,
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(10,10,15,0.88)',
        backdropFilter: 'blur(8px)',
        userSelect: 'none',
      }}
      title="Minimap — click or drag to navigate"
    >
      {/* Header */}
      <div style={{
        padding: '4px 8px',
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        MINIMAP
      </div>

      <svg
        ref={svgRef}
        width={MAP_W}
        height={MAP_H}
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Background */}
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="transparent" />

        {/* Frames first (lowest layer) */}
        {nonConnectors.filter(o => o.type === 'frame').map(obj => (
          <rect
            key={obj.id}
            x={Math.max(0, toMapX(obj.position?.x || 0))}
            y={Math.max(0, toMapY(obj.position?.y || 0))}
            width={Math.max(2, toMapW(obj.size?.width || 180))}
            height={Math.max(2, toMapH(obj.size?.height || 180))}
            fill="rgba(0,212,255,0.08)"
            stroke="rgba(0,212,255,0.2)"
            strokeWidth={0.5}
            rx={1}
          />
        ))}

        {/* Project cards */}
        {projects.map(p => (
          <rect
            key={p.id}
            x={Math.max(0, toMapX(p.canvasPosition?.x || 0))}
            y={Math.max(0, toMapY(p.canvasPosition?.y || 0))}
            width={Math.max(3, toMapW(CARD_W))}
            height={Math.max(2, toMapH(CARD_H))}
            fill={getProjectColor(p)}
            fillOpacity={0.7}
            rx={1}
          />
        ))}

        {/* Sticky notes & text labels */}
        {nonConnectors.filter(o => o.type === 'sticky' || o.type === 'text').map(obj => (
          <rect
            key={obj.id}
            x={Math.max(0, toMapX(obj.position?.x || 0))}
            y={Math.max(0, toMapY(obj.position?.y || 0))}
            width={Math.max(2, toMapW(obj.size?.width || 20))}
            height={Math.max(2, toMapH(obj.size?.height || 20))}
            fill={getObjectColor(obj)}
            fillOpacity={0.8}
            rx={0.5}
          />
        ))}

        {/* Viewport rectangle */}
        <rect
          x={Math.max(0, vpMapX)}
          y={Math.max(0, vpMapY)}
          width={Math.min(MAP_W - Math.max(0, vpMapX), vpMapW)}
          height={Math.min(MAP_H - Math.max(0, vpMapY), vpMapH)}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1}
          strokeDasharray="3 2"
          rx={1}
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  )
}
