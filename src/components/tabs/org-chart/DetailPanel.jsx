// ========================================
// DetailPanel — Slide-in right panel, frosted glass, agent details
// ========================================

import { AGENT_HIERARCHY, REGISTERED_AGENTS } from '../../../config/constants'
import { DETAIL_PANEL, STATUS_COLORS, NODE_COLORS, getNodeColorTier } from './radialConstants'

function formatTokens(n) {
  if (!n) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

export default function DetailPanel({ agentId, agentData, onClose, onNavigate, isLight, theme }) {
  const agent = AGENT_HIERARCHY[agentId]
  if (!agent) return null

  const live = agentData?.[agentId]
  const status = live?.status || (agentId === 'ceo' ? 'online' : REGISTERED_AGENTS.includes(agentId) ? 'online' : 'defined')
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.defined
  const colorTier = getNodeColorTier(agentId)
  const colors = NODE_COLORS[colorTier]
  const activity = live?.recentActivity || []

  // Find connections
  const children = Object.values(AGENT_HIERARCHY).filter(a => a.parent === agentId)
  const parent = agent.parent ? AGENT_HIERARCHY[agent.parent] : null

  const panelBg = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(10,22,40,0.85)'
  const panelBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'
  const textPrimary = isLight ? '#1a1a2e' : '#f5f5f5'
  const textSecondary = isLight ? '#4b5563' : '#a1a1aa'
  const textMono = isLight ? '#0284c7' : 'var(--theme-accent)'
  const sectionBorder = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: `${DETAIL_PANEL.width}px`,
      height: '100%',
      background: panelBg,
      backdropFilter: `blur(${DETAIL_PANEL.blur}px)`,
      WebkitBackdropFilter: `blur(${DETAIL_PANEL.blur}px)`,
      borderLeft: `1px solid ${panelBorder}`,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      animation: 'slideInRight 300ms ease-out',
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          background: 'none',
          border: `1px solid ${sectionBorder}`,
          borderRadius: 6,
          color: textSecondary,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
        aria-label="Close detail panel"
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${sectionBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: statusColor,
            display: 'inline-block',
            boxShadow: `0 0 8px ${statusColor}`,
          }} />
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: textPrimary,
          }}>
            {agent.name}
          </span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: colors.stroke,
          opacity: 0.8,
        }}>
          {agent.role} · {agent.isHuman ? 'Human Operator' : agent.model || 'AI Agent'}
        </div>
        {agent.designation && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: textSecondary,
            marginTop: 4,
          }}>
            {agent.designation}
          </div>
        )}
      </div>

      {/* Status section */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${sectionBorder}` }}>
        <SectionLabel text="STATUS" color={textSecondary} />
        <DataRow label="Status" value={status} valueColor={statusColor} isLight={isLight} />
        <DataRow label="Model" value={agent.model || '—'} mono isLight={isLight} />
        {live?.uptime && <DataRow label="Uptime" value={live.uptime} mono isLight={isLight} />}
      </div>

      {/* Metrics section */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${sectionBorder}` }}>
        <SectionLabel text="METRICS" color={textSecondary} />
        <DataRow label="Tokens In" value={formatTokens(live?.tokens?.input)} mono cyanValue isLight={isLight} />
        <DataRow label="Tokens Out" value={formatTokens(live?.tokens?.output)} mono cyanValue isLight={isLight} />
        {live?.currentTask && (
          <DataRow label="Active Task" value={live.currentTask.title || live.currentTask} mono isLight={isLight} />
        )}
      </div>

      {/* Connections section */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${sectionBorder}` }}>
        <SectionLabel text="CONNECTIONS" color={textSecondary} />
        {parent && (
          <ConnectionLink
            label="↑"
            agent={parent}
            onClick={() => onNavigate(parent.id)}
            isLight={isLight}
          />
        )}
        {children.map(child => (
          <ConnectionLink
            key={child.id}
            label="↓"
            agent={child}
            onClick={() => onNavigate(child.id)}
            isLight={isLight}
          />
        ))}
        {!parent && children.length === 0 && (
          <div style={{ fontSize: 12, color: textSecondary, fontStyle: 'italic' }}>No connections</div>
        )}
      </div>

      {/* Activity section */}
      {activity.length > 0 && (
        <div style={{ padding: '16px 20px' }}>
          <SectionLabel text="ACTIVITY" color={textSecondary} />
          {activity.slice(0, 5).map((item, i) => (
            <div key={item?.id || i} style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              fontSize: 11,
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: textSecondary,
                flexShrink: 0,
                fontSize: 10,
              }}>
                {item?.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
              <span style={{ color: isLight ? '#374151' : '#d4d4d8', lineHeight: 1.3 }}>
                {item?.action || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ text, color }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9,
      fontWeight: 600,
      color,
      letterSpacing: '0.1em',
      marginBottom: 10,
      textTransform: 'uppercase',
    }}>
      {text}
    </div>
  )
}

function DataRow({ label, value, mono, cyanValue, valueColor, isLight }) {
  const textSecondary = isLight ? '#6b7280' : '#a1a1aa'
  const textMono = isLight ? '#0284c7' : 'var(--theme-accent)'
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
      fontSize: 13,
    }}>
      <span style={{ color: textSecondary, fontFamily: "'Inter', sans-serif" }}>{label}</span>
      <span style={{
        fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
        fontWeight: 500,
        color: valueColor || (cyanValue ? textMono : (isLight ? '#1a1a2e' : '#e4e4e7')),
        textTransform: label === 'Status' ? 'capitalize' : 'none',
      }}>
        {value}
      </span>
    </div>
  )
}

function ConnectionLink({ label, agent, onClick, isLight }) {
  const tierColor = NODE_COLORS[getNodeColorTier(agent.id)].stroke
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginBottom: 4,
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        color: isLight ? '#1a1a2e' : '#e4e4e7',
        transition: 'background 150ms ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: tierColor, fontSize: 10, opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{agent.name}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: isLight ? '#6b7280' : '#71717a',
      }}>
        ({agent.role})
      </span>
    </div>
  )
}
