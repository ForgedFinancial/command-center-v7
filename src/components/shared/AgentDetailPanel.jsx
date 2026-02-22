import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY, TABS } from '../../config/constants'
import { WORKSPACE_STRUCTURE } from '../../config/workspace'

// ========================================
// FEATURE: AgentDetailPanel
// Added: 2026-02-14 by Claude Code
// Enhanced: 2026-02-15 — Live data, tasks, tokens, health, activity
// ========================================

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

function formatTokens(n) {
  if (!n) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

function formatRelative(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function AgentDetailPanel() {
  const { state, actions } = useApp()
  const agent = state.selectedAgent ? AGENT_HIERARCHY[state.selectedAgent] : null

  // 1-second tick for live counters
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!agent) return null

  const liveData = state.agents?.[agent.id] || {}
  const liveStatus = liveData.status || 'offline'

  const close = () => actions.setSelectedAgent(null)

  const openWorkspace = () => {
    const workspaceAgent = WORKSPACE_STRUCTURE[agent.id]
      ? agent.id
      : (agent.parent && WORKSPACE_STRUCTURE[agent.parent] ? agent.parent : 'clawd')
    actions.setTab(TABS.WORKSPACES)
    actions.setWorkspaceAgent(workspaceAgent)
    actions.setSelectedAgent(null)
  }

  const isDano = agent.id === 'ceo'
  const borderColor = isDano ? '#f59e0b'
    : agent.isHuman ? '#3b82f6'
    : ['soren', 'mason', 'sentinel'].includes(agent.id) ? '#f59e0b'
    : '#10b981'

  const statusColor = liveStatus === 'online' || liveStatus === 'active' || liveStatus === 'busy' ? '#4ade80'
    : liveStatus === 'idle' ? '#f59e0b'
    : liveStatus === 'offline' ? '#ef4444'
    : liveStatus === 'busy' ? '#fbbf24'
    : liveStatus === 'error' ? '#ef4444' : '#6b7280'

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 998,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        className="glass-panel"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: '380px',
          maxWidth: '90vw',
          zIndex: 999,
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '12px 0 0 12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          animation: 'slideIn 0.25s ease',
          overflowY: 'auto',
        }}
      >
        {/* Close */}
        <button
          onClick={close}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          ✕
        </button>

        {/* Status + Name */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <span style={{ fontSize: '11px', color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>{liveStatus}</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: isDano ? '#f59e0b' : 'var(--text-primary)' }}>
            {agent.name}
          </h2>
          {isDano && <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginTop: '2px' }}>👑 Owner</div>}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DetailRow label="Role" value={isDano ? 'Owner / CEO' : agent.role} color={borderColor} />
          {agent.designation && <DetailRow label="Designation" value={agent.designation} mono />}
          {agent.model && <DetailRow label="Model" value={agent.model} mono />}
          <DetailRow label="Description" value={agent.description} />
          {agent.parent && (
            <DetailRow label="Reports to" value={AGENT_HIERARCHY[agent.parent]?.name || agent.parent} />
          )}
        </div>

        {/* Section 1: Current Task */}
        {liveData?.currentTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Task</div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                {liveData.currentTask.title}
              </div>
              {liveData.currentTask.progress != null && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Progress</span>
                    <span>{Math.round(liveData.currentTask.progress * 100)}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${liveData.currentTask.progress * 100}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
              {liveData.currentTask.startedAt && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Running for {formatDuration(Date.now() - new Date(liveData.currentTask.startedAt).getTime())}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Token Usage */}
        {liveData?.tokens && (liveData.tokens.input > 0 || liveData.tokens.output > 0) && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token Usage</div>
            {[
              { label: 'Input', value: liveData.tokens.input, color: 'var(--accent)' },
              { label: 'Output', value: liveData.tokens.output, color: 'var(--status-online)' },
              { label: 'Cache', value: liveData.tokens.cache, color: 'var(--status-busy)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  <span>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatTokens(value)}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(value / Math.max(liveData.tokens.input, liveData.tokens.output, liveData.tokens.cache, 1)) * 100}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 3: Uptime */}
        {liveData?.onlineSince && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Uptime</span>
            <span style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--status-online)' }}>
              {formatDuration(Date.now() - new Date(liveData.onlineSince).getTime())}
            </span>
          </div>
        )}

        {/* Section 4: Health */}
        {liveData?.health && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Health</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: liveData.health.status === 'healthy' ? 'rgba(74, 222, 128, 0.15)' : liveData.health.status === 'degraded' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: liveData.health.status === 'healthy' ? 'var(--status-online)' : liveData.health.status === 'degraded' ? 'var(--status-busy)' : 'var(--status-error)',
            }}>
              {liveData.health.status}
            </span>
          </div>
        )}

        {/* Section 5: Recent Activity */}
        {liveData?.recentActivity?.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Activity</div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {liveData.recentActivity.map((entry) => (
                <div key={entry.id} style={{
                  fontSize: '12px',
                  padding: '6px 8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${
                    entry.type === 'success' ? 'var(--status-online)' :
                    entry.type === 'error' ? 'var(--status-error)' :
                    entry.type === 'warning' ? 'var(--status-busy)' : 'var(--accent)'
                  }`,
                }}>
                  <div style={{ color: 'var(--text-primary)' }}>{entry.action}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    {formatRelative(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-agents */}
        {(() => {
          const subs = Object.values(AGENT_HIERARCHY).filter(a => a.parent === agent.id)
          if (subs.length === 0) return null
          return (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Direct Reports
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {subs.map(s => (
                  <span
                    key={s.id}
                    onClick={() => actions.setSelectedAgent(s.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Workspace button */}
        {!agent.isHuman && (
          <button
            onClick={openWorkspace}
            style={{
              marginTop: 'auto',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid var(--accent)',
              background: 'transparent',
              color: 'var(--accent)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Open Workspace →
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

function DetailRow({ label, value, color, mono }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          color: color || 'var(--text-primary)',
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          fontWeight: color ? 600 : 400,
        }}
      >
        {value}
      </div>
    </div>
  )
}
