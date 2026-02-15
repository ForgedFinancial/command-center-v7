// ========================================
// ConnectionLine — SVG path between parent-child pairs with pulse dot
// ========================================

import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import { CONNECTION, LIGHT_CONNECTION, ANIMATION } from './radialConstants'

export default function ConnectionLine({
  fromNode,
  toNode,
  pulseProgress, // 0-1 or null
  pulseColor,
  isHighlighted,
  isLight,
  reducedMotion,
  entered,
}) {
  const pathRef = useRef(null)
  const [pathLength, setPathLength] = useState(0)
  const [drawOffset, setDrawOffset] = useState(null) // null = not measured yet
  const [dotPos, setDotPos] = useState(null)

  const conn = isLight ? { ...CONNECTION, ...LIGHT_CONNECTION } : CONNECTION

  // Measure path length synchronously before paint
  useLayoutEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength()
      setPathLength(len)
      if (!entered && !reducedMotion) {
        setDrawOffset(len) // start fully hidden
      }
    }
  }, [fromNode.x, fromNode.y, toNode.x, toNode.y])

  // Animate draw-on after measurement
  useEffect(() => {
    if (entered && drawOffset !== 0 && pathLength > 0 && !reducedMotion) {
      // Brief delay then transition to 0
      const raf = requestAnimationFrame(() => {
        setDrawOffset(0)
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [entered, pathLength, reducedMotion])

  // Calculate pulse dot position
  useEffect(() => {
    if (pulseProgress != null && pulseProgress >= 0 && pulseProgress <= 1 && pathRef.current && pathLength > 0) {
      try {
        const pt = pathRef.current.getPointAtLength(pulseProgress * pathLength)
        setDotPos({ x: pt.x, y: pt.y })
      } catch {
        setDotPos(null)
      }
    } else {
      setDotPos(null)
    }
  }, [pulseProgress, pathLength])

  // Curved path using a subtle quad bezier
  const mx = (fromNode.x + toNode.x) / 2
  const my = (fromNode.y + toNode.y) / 2
  // Slight curve perpendicular to the line
  const dx = toNode.x - fromNode.x
  const dy = toNode.y - fromNode.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const curvature = len * 0.08
  const cx = mx + (-dy / len) * curvature
  const cy = my + (dx / len) * curvature

  const d = `M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`

  const useDrawOn = !reducedMotion && pathLength > 0 && drawOffset !== null

  return (
    <g>
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={isHighlighted ? conn.pulseActiveStroke : conn.baseStroke}
        strokeWidth={conn.baseWidth}
        strokeDasharray={useDrawOn ? pathLength : 'none'}
        strokeDashoffset={useDrawOn ? drawOffset : 0}
        style={{
          transition: reducedMotion
            ? 'none'
            : `stroke ${ANIMATION.hoverDim}ms ease, stroke-dashoffset ${ANIMATION.connectionDrawDuration}ms ease ${ANIMATION.connectionDrawDelay}ms`,
        }}
      />
      {/* Pulse dot */}
      {dotPos && !reducedMotion && (
        <circle
          cx={dotPos.x}
          cy={dotPos.y}
          r={conn.pulseDotRadius}
          fill={pulseColor || conn.pulseDotColor}
          style={{
            filter: conn.pulseDotGlow,
            willChange: 'transform',
          }}
        />
      )}
    </g>
  )
}

// ANIMATION imported from radialConstants
