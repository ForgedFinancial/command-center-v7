// ========================================
// RadialCanvas — Core SVG canvas: orbit rings, connection lines, agent nodes, pulse animations
// ========================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SVG_SIZE, SVG_CENTER, ORBITS, ANIMATION, THEME_PALETTES, CONNECTION } from './radialConstants'
import useRadialLayout from './useRadialLayout'
import useConnectionPulse from './useConnectionPulse'
import AgentNode from './AgentNode'
import ConnectionLine from './ConnectionLine'

const ORBIT_RADII = [ORBITS.ORBIT_1, ORBITS.ORBIT_2, ORBITS.ORBIT_3]

export default function RadialCanvas({
  centeredAgent,
  agentData,
  selectedAgent,
  onSelectAgent,
  onCenterAgent,
  theme,
  reducedMotion,
}) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.forge
  const isLight = palette.isLight

  const { nodes, connections } = useRadialLayout(centeredAgent, agentData)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [entered, setEntered] = useState(reducedMotion)

  // Entrance animation trigger
  useEffect(() => {
    if (reducedMotion) { setEntered(true); return }
    const t = setTimeout(() => setEntered(true), 50)
    return () => clearTimeout(t)
  }, [reducedMotion])

  // Pulse animation system
  const pulses = useConnectionPulse(connections, agentData, reducedMotion)

  // Highlight connections for hovered node
  const highlightedConnections = useMemo(() => {
    if (!hoveredNode) return new Set()
    const set = new Set()
    connections.forEach(c => {
      if (c.from === hoveredNode || c.to === hoveredNode) {
        set.add(`${c.from}-${c.to}`)
      }
    })
    return set
  }, [hoveredNode, connections])

  const handleNodeClick = useCallback((id) => {
    if (id === centeredAgent) {
      // Toggle detail panel for center node
      onSelectAgent(selectedAgent === id ? null : id)
    } else {
      // Recenter + select
      onCenterAgent(id)
      onSelectAgent(id)
    }
  }, [centeredAgent, selectedAgent, onSelectAgent, onCenterAgent])

  const handleDoubleClick = useCallback((id) => {
    if (id === centeredAgent) {
      // Reset to DANO
      onCenterAgent('ceo')
      onSelectAgent(null)
    }
  }, [centeredAgent, onCenterAgent, onSelectAgent])

  const handleCanvasClick = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.tagName === 'svg') {
      onSelectAgent(null)
    }
  }, [onSelectAgent])

  // No-data badge
  const hasLiveData = Object.keys(agentData || {}).length > 0

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: palette.void,
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={handleCanvasClick}
    >
      {/* Radial vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at center, transparent 30%, ${palette.void} 100%)`,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Orbit rings */}
        {ORBIT_RADII.map((r, i) => (
          <circle
            key={i}
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={r}
            fill="none"
            stroke={palette.orbitStroke}
            strokeWidth={1}
            strokeDasharray="4 8"
            opacity={entered ? 0.5 : 0}
            style={{
              transition: reducedMotion ? 'none' : `opacity 300ms ease`,
            }}
          />
        ))}

        {/* Connection lines */}
        {connections.map(conn => {
          const key = `${conn.from}-${conn.to}`
          const pulse = pulses[key]
          return (
            <ConnectionLine
              key={key}
              fromNode={conn.fromNode}
              toNode={conn.toNode}
              pulseProgress={pulse?.progress ?? null}
              pulseColor={pulse?.color}
              isHighlighted={highlightedConnections.has(key)}
              isLight={isLight}
              reducedMotion={reducedMotion}
              entered={entered}
            />
          )
        })}

        {/* Agent nodes */}
        {nodes.map(node => (
          <AgentNode
            key={node.id}
            node={node}
            agentData={agentData?.[node.id]}
            isCenter={node.id === centeredAgent}
            isSelected={node.id === selectedAgent}
            hoveredNode={hoveredNode}
            onHover={setHoveredNode}
            onLeave={() => setHoveredNode(null)}
            onClick={handleNodeClick}
            onDoubleClick={handleDoubleClick}
            isLight={isLight}
            reducedMotion={reducedMotion}
            entranceDelay={node.orbitIndex * ANIMATION.entranceStagger}
          />
        ))}
      </svg>

      {/* Empty state badge */}
      {!hasLiveData && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(10,22,40,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
          padding: '8px 16px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: isLight ? '#6b7280' : '#94a3b8',
          animation: entered ? 'none' : undefined,
        }}>
          ⚡ Live data unavailable — showing static hierarchy
        </div>
      )}
    </div>
  )
}
