import { useState } from 'react'
import { TIER_COLORS, TIER_MAP, MODEL_DISPLAY } from './treeConstants'
import { AGENT_HIERARCHY } from '../../../config/constants'
import StatusBadge from './StatusBadge'
import QuickActions from './QuickActions'

export default function AgentCard({ agentId, agentData, onSelect, onRecentOutput, onViewWorkspace }) {
  const [hovered, setHovered] = useState(false)

  const def = AGENT_HIERARCHY[agentId] || {}
  const tier = TIER_MAP[agentId] || 'specialist'
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.specialist
  const status = agentData?.status || 'offline'
  const currentTask = agentData?.currentTask || null
  const lastActive = agentData?.lastActive || null
  const modelKey = def?.isHuman ? 'Human' : (def?.model || null)
  const modelDisplay = modelKey ? (MODEL_DISPLAY[modelKey] || modelKey) : ''
  const name = def?.name || agentId
  const role = def?.role || def?.description || ''

  // Show "Send to Agent" only for non-CEO, non-specialist
  const showSendBtn = tier !== 'ceo'

  const formatLastActive = (ts) => {
    if (!ts) return status === 'online' ? 'Active now' : 'Inactive'
    try {
      const diff = Date.now() - new Date(ts).getTime()
      if (diff < 60000) return 'Active now'
      if (diff < 3600000) return `Active ${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `Active ${Math.floor(diff / 3600000)}h ago`
      return `Active ${Math.floor(diff / 86400000)}d ago`
    } catch { return 'Inactive' }
  }

  return (
    <div
      style={{
        position: 'relative',
        padding: '16px 22px',
        borderRadius: '12px',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: '1.5px solid',
        borderColor: `${tierColor}80`,
        backdropFilter: 'blur(12px)',
        minWidth: '200px',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: tier === 'ceo'
          ? `0 0 20px ${tierColor}1a, inset 0 1px 0 ${tierColor}1a`
          : `0 0 16px ${tierColor}14, inset 0 1px 0 ${tierColor}1a`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect?.(agentId)}
    >
      <StatusBadge status={status} />
      <div style={{ fontSize: '16px', fontWeight: 600, color: tierColor, marginBottom: '2px' }}>
        {name}
      </div>
      <div style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        {role}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(0,212,255,0.5)', marginTop: '4px', letterSpacing: '0.3px' }}>
        {modelDisplay}
      </div>
      {currentTask && (
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '6px', fontStyle: 'italic' }}>
          {currentTask}
        </div>
      )}
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', letterSpacing: '0.3px' }}>
        {formatLastActive(lastActive)}
      </div>
      {showSendBtn && (
        <QuickActions
          agentId={agentId}
          visible={hovered}
          onRecentOutput={() => onRecentOutput?.(agentId)}
          onViewWorkspace={() => onViewWorkspace?.(agentId)}
        />
      )}
    </div>
  )
}
