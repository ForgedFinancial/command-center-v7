import { useState } from 'react'
import { AGENT_COLORS } from '../../../config/constants'

const MENTION_RE = /@(dano|clawd|kyle|soren|mason|sentinel)\b/gi

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (sameDay) return time
  const month = d.toLocaleString('en-US', { month: 'short' })
  return `${month} ${d.getDate()}, ${time}`
}

function renderMessageText(text) {
  const parts = []
  let lastIndex = 0
  let match
  const re = new RegExp(MENTION_RE.source, 'gi')
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={match.index} style={{ color: 'var(--accent)', fontWeight: 600 }}>{match[0]}</span>
    )
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

export default function MessageBubble({ message }) {
  const [hovered, setHovered] = useState(false)
  const agentColor = AGENT_COLORS[message.from] || 'var(--text-muted)'
  const isDano = message.from === 'dano'
  const displayName = message.from ? message.from.charAt(0).toUpperCase() + message.from.slice(1) : 'Unknown'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 14px',
        marginBottom: '8px',
        borderRadius: '6px',
        borderLeft: `4px solid ${agentColor}`,
        backgroundColor: hovered ? 'var(--bg-tertiary)' : (isDano ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'),
        transition: 'background-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, color: agentColor, fontSize: '13px' }}>{displayName}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatTimestamp(message.ts)}</span>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '14px', marginTop: '4px', lineHeight: 1.5 }}>
        {renderMessageText(message.message || '')}
      </div>
    </div>
  )
}
