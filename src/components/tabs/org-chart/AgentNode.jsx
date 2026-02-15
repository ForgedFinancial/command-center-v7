// ========================================
// AgentNode — SVG circle + labels, tier-based sizing/coloring
// Status animations, hover effects, click-to-recenter
// ========================================

import { useState, useEffect } from 'react'
import { REGISTERED_AGENTS } from '../../../config/constants'
import { NODE_COLORS, LIGHT_NODE_COLORS, STATUS_COLORS, FONT_SIZES, ANIMATION, SVG_CENTER, getNodeColorTier } from './radialConstants'

export default function AgentNode({
  node,
  agentData,
  isCenter,
  isSelected,
  hoveredNode,
  onHover,
  onLeave,
  onClick,
  onDoubleClick,
  isLight,
  reducedMotion,
  entranceDelay,
}) {
  const { id, x, y, nodeRadius, orbitIndex, agent } = node
  const colorTier = getNodeColorTier(id)
  const colors = isLight ? LIGHT_NODE_COLORS[colorTier] : NODE_COLORS[colorTier]
  const fonts = FONT_SIZES[orbitIndex]

  const status = agentData?.status || (id === 'ceo' ? 'online' : REGISTERED_AGENTS.includes(id) ? 'online' : 'defined')
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.defined

  const isHovered = hoveredNode === id
  const isDimmed = hoveredNode && hoveredNode !== id
  const gradientId = `grad-${id}`
  const glowId = `glow-${id}`

  // Entrance animation state
  const [entered, setEntered] = useState(reducedMotion)
  useEffect(() => {
    if (reducedMotion) { setEntered(true); return }
    const t = setTimeout(() => setEntered(true), entranceDelay || 0)
    return () => clearTimeout(t)
  }, [entranceDelay, reducedMotion])

  // Breathing and busy animations handled via CSS (see style tag in node group)

  // Error blink
  const [errorVisible, setErrorVisible] = useState(true)
  useEffect(() => {
    if (reducedMotion || status !== 'error') return
    const interval = setInterval(() => setErrorVisible(v => !v), ANIMATION.errorBlink / 2)
    return () => clearInterval(interval)
  }, [status, reducedMotion])

  const nameColor = isLight ? '#1a1a2e' : (orbitIndex <= 1 ? '#f5f5f5' : orbitIndex === 2 ? '#e4e4e7' : '#c4c4c7')
  const roleColor = colors.stroke + (isLight ? '' : 'b3') // 70% opacity via hex

  return (
    <g
      style={{
        cursor: 'pointer',
        opacity: !entered ? 0 : isDimmed ? 0.4 : 1,
        transform: !entered ? `translate(${SVG_CENTER}px, ${SVG_CENTER}px) scale(0)` : `translate(${x}px, ${y}px) scale(${isHovered ? 1.08 : 1})`,
        transition: reducedMotion
          ? 'none'
          : `transform ${ANIMATION.recenterDuration}ms ${ANIMATION.recenterEasing}, opacity ${ANIMATION.hoverDim}ms ease`,
        willChange: 'transform, opacity',
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={onLeave}
      onClick={() => onClick(id)}
      onDoubleClick={() => onDoubleClick?.(id)}
      role="button"
      tabIndex={0}
      aria-label={`${agent?.name} - ${agent?.role}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(id) } }}
    >
      <title>{agent?.name || id} — {agent?.role || ''}</title>

      {/* CSS keyframes for breathing and busy spin */}
      <style>{`
        @keyframes breath-${id} {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.3; }
        }
        @keyframes busy-spin-${id} {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={colors.gradientInner} />
          <stop offset="100%" stopColor={colors.gradientOuter} />
        </radialGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation={colors.glowRadius / 3} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow circle (behind main) — CSS breathing animation */}
      <circle
        r={nodeRadius + 8}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={2}
        opacity={(status === 'online' || status === 'active') ? 0.3 : 0}
        style={{
          filter: `drop-shadow(0 0 ${colors.glowRadius}px ${colors.glow})`,
          animation: (!reducedMotion && (status === 'online' || status === 'active'))
            ? `breath-${id} ${ANIMATION.breathCycle}ms ease-in-out infinite`
            : 'none',
        }}
      />

      {/* Main circle */}
      <circle
        r={nodeRadius}
        fill={`url(#${gradientId})`}
        stroke={colors.stroke}
        strokeWidth={isCenter ? 2.5 : 2}
        opacity={status === 'offline' ? 0.3 : 1}
        style={{
          filter: isHovered ? `drop-shadow(0 0 ${colors.glowRadius * 1.5}px ${colors.glow})` : `drop-shadow(0 0 ${colors.glowRadius}px ${colors.glow})`,
        }}
      />

      {/* Defined state — dashed border */}
      {status === 'defined' && (
        <circle
          r={nodeRadius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.5}
        />
      )}

      {/* Busy spinner arc — CSS rotation */}
      {status === 'busy' && (
        <circle
          r={nodeRadius + 4}
          fill="none"
          stroke={statusColor}
          strokeWidth={2}
          strokeDasharray={`${nodeRadius * 0.8} ${nodeRadius * 5}`}
          style={{
            transformOrigin: '0 0',
            animation: !reducedMotion ? `busy-spin-${id} ${ANIMATION.busySpin}ms linear infinite` : 'none',
          }}
          opacity={0.8}
        />
      )}

      {/* Error blink ring */}
      {status === 'error' && (
        <circle
          r={nodeRadius + 3}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          opacity={errorVisible ? 0.8 : 0.2}
        />
      )}

      {/* Selected ring */}
      {isSelected && (
        <circle
          r={nodeRadius + 6}
          fill="none"
          stroke="#00d4ff"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          opacity={0.6}
        />
      )}

      {/* Status dot */}
      <circle
        cx={nodeRadius * 0.7}
        cy={-nodeRadius * 0.7}
        r={orbitIndex <= 1 ? 5 : 4}
        fill={statusColor}
        stroke={isLight ? '#ffffff' : '#050508'}
        strokeWidth={1.5}
      />

      {/* Name label */}
      <text
        y={nodeRadius + fonts.name + 6}
        textAnchor="middle"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: `${fonts.name}px`,
          fontWeight: fonts.weight,
          fill: nameColor,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {agent?.name || id}
      </text>

      {/* Role label */}
      <text
        y={nodeRadius + fonts.name + 6 + fonts.role + 4}
        textAnchor="middle"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: `${fonts.role}px`,
          fontWeight: 400,
          fill: roleColor,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {agent?.role || ''}
      </text>
    </g>
  )
}

// SVG_CENTER imported from radialConstants
