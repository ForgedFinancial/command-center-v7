import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * CanvasConnector — SVG layer rendering all connector lines between canvas objects.
 *
 * Props:
 *   connectors     — array of connector canvas-objects
 *   projects       — array of projects (have canvasPosition)
 *   canvasObjects  — array of all non-project canvas objects
 *   zoom           — current zoom level
 *   pan            — current pan {x, y}
 *   canvasWidth    — total canvas logical width
 *   canvasHeight   — total canvas logical height
 *   onSelect       — (id) => called when a connector is clicked
 *   selectedIds    — set or array of selected IDs
 *   onUpdate       — (id, patch) => update connector in backend + context
 *   onDelete       — (id) => delete connector
 *   connectMode    — { active: bool, sourceId: string|null }
 *   cursorPos      — { x, y } in canvas coords, used while drawing
 */

const CARD_W = 260
const CARD_H = 160
const STICKY_W = 180
const STICKY_H = 180

function getObjectBounds(id, projects, canvasObjects) {
  const project = projects.find(p => p.id === id)
  if (project) {
    const pos = project.canvasPosition || { x: 0, y: 0 }
    return { x: pos.x, y: pos.y, w: CARD_W, h: CARD_H }
  }
  const obj = canvasObjects.find(o => o.id === id)
  if (obj) {
    const pos = obj.position || { x: 0, y: 0 }
    const w = obj.size?.width || STICKY_W
    const h = obj.size?.height || STICKY_H
    return { x: pos.x, y: pos.y, w, h }
  }
  return null
}

function getCenter(bounds) {
  return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }
}

/**
 * Find the best edge-midpoint exit from a rect toward a target point.
 * Returns a point on the border of the rect.
 */
function getEdgePoint(bounds, targetPt) {
  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2
  const dx = targetPt.x - cx
  const dy = targetPt.y - cy
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return { x: cx, y: cy }

  // Which edge do we exit from?
  const scaleX = Math.abs(bounds.w / 2 / dx)
  const scaleY = Math.abs(bounds.h / 2 / dy)
  const scale = Math.min(scaleX, scaleY)

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  }
}

function buildPath(src, tgt, style) {
  const dx = tgt.x - src.x
  const dy = tgt.y - src.y

  if (style === 'straight') {
    return `M ${src.x} ${src.y} L ${tgt.x} ${tgt.y}`
  }

  if (style === 'step') {
    const mx = src.x + dx / 2
    return `M ${src.x} ${src.y} L ${mx} ${src.y} L ${mx} ${tgt.y} L ${tgt.x} ${tgt.y}`
  }

  // curved (default bezier)
  const cx1 = src.x + dx * 0.4
  const cy1 = src.y
  const cx2 = tgt.x - dx * 0.4
  const cy2 = tgt.y
  return `M ${src.x} ${src.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${tgt.x} ${tgt.y}`
}

function ArrowMarker({ id, color }) {
  return (
    <marker
      id={id}
      markerWidth="10"
      markerHeight="7"
      refX="9"
      refY="3.5"
      orient="auto"
    >
      <polygon
        points="0 0, 10 3.5, 0 7"
        fill={color}
      />
    </marker>
  )
}

export default function CanvasConnector({
  connectors = [],
  projects = [],
  canvasObjects = [],
  canvasWidth = 3000,
  canvasHeight = 2000,
  onSelect,
  selectedIds = [],
  onUpdate,
  onDelete,
  connectMode = { active: false, sourceId: null },
  cursorPos = null,
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const [dragMidpoint, setDragMidpoint] = useState(null) // { connId, origPath }
  const selectedSet = new Set(Array.isArray(selectedIds) ? selectedIds : [])

  const handleLineClick = useCallback((e, conn) => {
    e.stopPropagation()
    onSelect?.(conn.id)
  }, [onSelect])

  const handleLineContextMenu = useCallback((e, conn) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect?.(conn.id)
    // Context menu is raised by parent via onSelect + separate right-click handler
  }, [onSelect])

  // Build the source ghost line while in connect mode
  let ghostPath = null
  if (connectMode.active && connectMode.sourceId && cursorPos) {
    const srcBounds = getObjectBounds(connectMode.sourceId, projects, canvasObjects)
    if (srcBounds) {
      const src = getEdgePoint(srcBounds, cursorPos)
      ghostPath = buildPath(src, cursorPos, 'curved')
    }
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${canvasWidth + 400}px`,
        height: `${canvasHeight + 400}px`,
        pointerEvents: 'none',
        zIndex: 3, // above grid (1), below frames (4), objects (5+)
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Arrow markers for each connector color */}
        {connectors.map(conn => {
          const color = conn.color || '#71717a'
          const selected = selectedSet.has(conn.id)
          const hovered = hoveredId === conn.id
          const resolvedColor = selected ? 'var(--theme-accent, #00d4ff)' : hovered ? '#a1a1aa' : color
          return (
            <ArrowMarker
              key={`marker-${conn.id}`}
              id={`arrow-${conn.id}`}
              color={resolvedColor}
            />
          )
        })}
        <ArrowMarker id="arrow-ghost" color="rgba(0,212,255,0.5)" />
      </defs>

      {/* Rendered connectors */}
      {connectors.map(conn => {
        const srcBounds = getObjectBounds(conn.data?.sourceId, projects, canvasObjects)
        const tgtBounds = getObjectBounds(conn.data?.targetId, projects, canvasObjects)
        if (!srcBounds || !tgtBounds) return null

        const tgtCenter = getCenter(tgtBounds)
        const srcCenter = getCenter(srcBounds)
        const src = getEdgePoint(srcBounds, tgtCenter)
        const tgt = getEdgePoint(tgtBounds, srcCenter)

        const style = conn.data?.style || 'curved'
        const arrow = conn.data?.arrow !== 'none'
        const d = buildPath(src, tgt, style)

        const selected = selectedSet.has(conn.id)
        const hovered = hoveredId === conn.id
        const color = selected ? '#00d4ff' : hovered ? '#a1a1aa' : (conn.color || '#71717a')
        const strokeWidth = selected ? 2.5 : hovered ? 2 : 1.5

        const label = conn.data?.label

        // Midpoint for label
        const midX = (src.x + tgt.x) / 2
        const midY = (src.y + tgt.y) / 2

        return (
          <g key={conn.id}>
            {/* Fat invisible hit zone */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth={16}
              fill="none"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={(e) => handleLineClick(e, conn)}
              onContextMenu={(e) => handleLineContextMenu(e, conn)}
              onMouseEnter={() => setHoveredId(conn.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
            {/* Visible line */}
            <path
              d={d}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={selected ? '6 3' : 'none'}
              markerEnd={arrow ? `url(#arrow-${conn.id})` : undefined}
              style={{
                pointerEvents: 'none',
                transition: 'stroke 0.15s, stroke-width 0.15s',
                filter: selected ? `drop-shadow(0 0 4px rgba(0,212,255,0.4))` : 'none',
              }}
            />
            {/* Label */}
            {label && (
              <g>
                <rect
                  x={midX - 40}
                  y={midY - 10}
                  width={80}
                  height={20}
                  rx={4}
                  fill="var(--theme-surface, #1a1a24)"
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Ghost line while connecting */}
      {ghostPath && (
        <path
          d={ghostPath}
          stroke="rgba(0,212,255,0.5)"
          strokeWidth={2}
          fill="none"
          strokeDasharray="6 3"
          markerEnd="url(#arrow-ghost)"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  )
}
