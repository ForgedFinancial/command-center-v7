import { useState } from 'react'
import { AGENT_COLORS } from '../../../config/constants'

const MENTION_REGEX = /@(dano|clawd|kyle|soren|mason|sentinel)\b/gi
const ROUTABLE_AGENTS = ['soren', 'mason', 'sentinel', 'kyle']

const AGENT_ICONS = {
  clawd:    '🔨',
  kyle:     '🖥️',
  soren:    '📐',
  mason:    '⚒️',
  sentinel: '🔍',
  dano:     '👤',
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (d.toDateString() === now.toDateString()) return timeStr
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${dateStr}, ${timeStr}`
}

function renderMessage(text) {
  const parts = text.split(MENTION_REGEX)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const icon = AGENT_ICONS[part.toLowerCase()]
      return (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            color: 'var(--accent)',
            fontWeight: 600,
            backgroundColor: 'rgba(var(--accent-rgb, 99,102,241), 0.12)',
            borderRadius: '4px',
            padding: '0 5px',
            fontSize: '13px',
          }}
        >
          {icon && <span style={{ fontSize: '12px' }}>{icon}</span>}
          @{part}
        </span>
      )
    }
    return part
  })
}

export default function MessageBubble({ message }) {
  const [hovered, setHovered] = useState(false)
  const from = message.from || 'unknown'
  const color = AGENT_COLORS[from] || 'var(--text-muted)'
  const isDano = from === 'dano'
  const displayName = from.charAt(0).toUpperCase() + from.slice(1)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 14px',
        marginBottom: '8px',
        borderRadius: '6px',
        borderLeft: `4px solid ${color}`,
        backgroundColor: hovered
          ? 'var(--bg-tertiary)'
          : isDano
            ? 'var(--bg-tertiary)'
            : 'var(--bg-secondary)',
        transition: 'background-color 0.15s',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, color, fontSize: '13px' }}>
          {displayName}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          {formatTimestamp(message.ts)}
        </span>
      </div>
      <div style={{
        whiteSpace: 'pre-wrap',
        color: 'var(--text-primary)',
        fontSize: '14px',
        marginTop: '4px',
        lineHeight: 1.5,
      }}>
        {renderMessage(message.message || '')}
      </div>
      {isDano && (() => {
        const text = message.message || ''
        const mentions = text.match(MENTION_REGEX)
        const targets = mentions
          ? [...new Set(mentions.map(m => m.slice(1).toLowerCase()))].filter(m => ROUTABLE_AGENTS.includes(m))
          : null
        const label = targets && targets.length > 0
          ? `→ Routed to ${targets.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`
          : '→ Broadcast to all agents'
        return (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            fontStyle: 'italic',
            opacity: 0.7,
          }}>
            {label}
          </div>
        )
      })()}
    </div>
  )
}
