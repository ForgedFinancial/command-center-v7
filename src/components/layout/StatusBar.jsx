import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { lockSession } from './AuthGate'

// ========================================
// FEATURE: StatusBar
// Added: 2026-02-14 by Claude Code
// Updated: 2026-02-15 — lock button, API Not Connected state
// Bottom bar with connection status, sync time, build info
// ========================================

export default function StatusBar({ onToggleHealth }) {
  const { state } = useApp()
  const [timeAgo, setTimeAgo] = useState('')

  const isApiNotConnected = state.syncError === 'API Not Connected'

  useEffect(() => {
    function updateTimeAgo() {
      if (!state.lastSync) {
        setTimeAgo('Never')
        return
      }

      const seconds = Math.floor((Date.now() - new Date(state.lastSync).getTime()) / 1000)

      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`)
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`)
      } else {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 1000)
    return () => clearInterval(interval)
  }, [state.lastSync])

  const statusLabel = state.isConnected
    ? 'Connected'
    : isApiNotConnected
      ? 'API Not Connected'
      : 'Disconnected'

  const statusColor = state.isConnected
    ? 'var(--accent, var(--status-online))'
    : isApiNotConnected
      ? 'var(--theme-warning)'
      : 'var(--status-offline)'

  return (
    <footer
      className="glass-panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 24px',
        borderRadius: 0,
        borderTop: '1px solid var(--border-color)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        letterSpacing: '0.01em',
      }}
    >
      {/* Connection Status */}
      <div
        onClick={onToggleHealth}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
        title="System Health"
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            boxShadow: state.isConnected
              ? `0 0 6px ${statusColor}`
              : 'none',
            transition: 'all 0.2s',
          }}
        />
        <span>{statusLabel}</span>
      </div>

      {/* Last Sync */}
      <div>
        <span>Last sync: {timeAgo}</span>
      </div>

      {/* Build Info + Lock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'monospace' }}>
        {state.buildInfo ? (
          <span>
            {state.buildInfo?.buildHash} · {state.buildInfo?.version}
          </span>
        ) : (
          <span>dev</span>
        )}
        <button
          onClick={lockSession}
          title="Logout"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px 10px',
            color: 'var(--theme-error)',
            transition: 'all 0.15s',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)' }}
        >
          🔒 LOGOUT
        </button>
      </div>
    </footer>
  )
}
