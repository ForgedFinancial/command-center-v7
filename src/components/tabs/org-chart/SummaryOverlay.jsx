// ========================================
// SummaryOverlay — Floating top-right, collapsible system health + dept stats
// ========================================

import { useState } from 'react'
import { AGENT_HIERARCHY, REGISTERED_AGENTS } from '../../../config/constants'
import { STATUS_COLORS } from './radialConstants'

export default function SummaryOverlay({ agentData, systemHealth, isLight }) {
  const [collapsed, setCollapsed] = useState(false)

  const allAgents = Object.keys(AGENT_HIERARCHY)
  const onlineCount = allAgents.filter(id => {
    const s = agentData?.[id]?.status
    return s === 'online' || s === 'active' || s === 'busy'
  }).length
  const errorCount = allAgents.filter(id => agentData?.[id]?.status === 'error').length

  const healthStatus = systemHealth?.status || 'healthy'
  const healthColor = healthStatus === 'healthy' ? STATUS_COLORS.online
    : healthStatus === 'degraded' ? STATUS_COLORS.busy
    : STATUS_COLORS.error

  // Department counts
  const depts = {
    Leadership: ['ceo', 'clawd'],
    Operations: ['architect', 'mason', 'sentinel'],
    Specialists: ['scout', 'cartographer', 'coder', 'wirer', 'scribe', 'probe', 'auditor'],
  }

  const bg = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(10,22,40,0.85)'
  const border = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'
  const textLabel = isLight ? '#6b7280' : '#94a3b8'
  const textValue = isLight ? '#1a1a2e' : '#e4e4e7'

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 15,
      background: bg,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 10,
      border: `1px solid ${border}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      minWidth: collapsed ? 'auto' : 280,
      animation: 'slideInOverlay 300ms ease-out 500ms both',
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          color: textLabel,
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ fontSize: 10, transition: 'transform 200ms ease', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
        System Overview
        {collapsed && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: healthColor,
            marginLeft: 4,
            boxShadow: `0 0 6px ${healthColor}`,
          }} />
        )}
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: `1px solid ${border}`,
          paddingTop: 10,
        }}>
          {/* Health row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}>
            {/* Health badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: healthColor,
                display: 'inline-block',
                boxShadow: `0 0 6px ${healthColor}`,
              }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: healthColor,
                textTransform: 'capitalize',
              }}>
                {healthStatus}
              </span>
            </div>

            {/* Online count */}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: textValue,
            }}>
              <span style={{ fontWeight: 700 }}>{onlineCount}</span>
              <span style={{ color: textLabel }}>/{allAgents.length}</span>
              <span style={{ fontSize: 10, color: textLabel, marginLeft: 3 }}>Online</span>
            </span>

            {/* Error count */}
            {errorCount > 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: STATUS_COLORS.error,
                fontWeight: 600,
              }}>
                {errorCount} Error{errorCount > 1 ? 's' : ''}
              </span>
            )}
            {errorCount === 0 && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: textLabel,
              }}>
                0 Errors
              </span>
            )}
          </div>

          {/* Department breakdown */}
          <div style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {Object.entries(depts).map(([name, agents]) => {
              const online = agents.filter(id => {
                const s = agentData?.[id]?.status
                return s === 'online' || s === 'active' || s === 'busy'
              }).length
              return (
                <span key={name} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: textLabel,
                }}>
                  {name} <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                    color: textValue,
                  }}>{agents.length}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
