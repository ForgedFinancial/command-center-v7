import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

// ========================================
// FEATURE: StatusBar
// Added: 2026-02-14 by Claude Code
// Bottom bar with connection status, sync time, build info
// ========================================

export default function StatusBar() {
  const { state } = useApp()
  const [timeAgo, setTimeAgo] = useState('')

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: state.isConnected
              ? 'var(--accent, var(--status-online))'
              : 'var(--status-offline)',
            boxShadow: state.isConnected
              ? '0 0 6px var(--accent, var(--status-online))'
              : 'none',
          }}
        />
        <span>{state.isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Last Sync */}
      <div>
        <span>Last sync: {timeAgo}</span>
      </div>

      {/* Build Info */}
      <div style={{ fontFamily: 'monospace' }}>
        {state.buildInfo ? (
          <span>
            {state.buildInfo.buildHash} · {state.buildInfo.version}
          </span>
        ) : (
          <span>dev</span>
        )}
      </div>
    </footer>
  )
}
