// ========================================
// FEATURE: NetworkMonitor
// Added: 2026-02-15 by Mason (FF-BLD-001)
// Dev-only floating panel showing last 10 API calls
// Toggle: Ctrl+Shift+N
// ========================================

import { useState, useEffect, useCallback } from 'react'
import { useNetworkLog } from '../../hooks/useNetworkLog'

function statusColor(status) {
  if (status >= 200 && status < 300) return '#22c55e'
  if (status >= 400 && status < 500) return '#eab308'
  if (status >= 500) return '#ef4444'
  return 'var(--text-muted)'
}

function truncateUrl(url, max = 40) {
  if (!url) return ''
  try {
    const u = new URL(url)
    const path = u.pathname + u.search
    return path?.length > max ? path.slice(0, max) + '…' : path
  } catch {
    return url?.length > max ? url.slice(0, max) + '…' : url
  }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function NetworkMonitor() {
  const [visible, setVisible] = useState(false)
  const entries = useNetworkLog()

  const handleKey = useCallback((e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
      e.preventDefault()
      setVisible(v => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '48px',
      left: '12px',
      width: '420px',
      maxHeight: '320px',
      backgroundColor: 'var(--bg-secondary, #0f172a)',
      border: '1px solid var(--border-color, #1e293b)',
      borderRadius: '8px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '11px',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        borderBottom: '1px solid var(--border-color, #1e293b)',
        backgroundColor: 'var(--bg-tertiary, #1e293b)',
      }}>
        <span style={{ color: 'var(--accent, #00d4ff)', fontWeight: 600 }}>
          🌐 Network ({entries?.length || 0})
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Entries */}
      <div style={{ overflowY: 'auto', maxHeight: '280px' }}>
        {(!entries || entries.length === 0) ? (
          <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            No API calls yet
          </div>
        ) : (
          entries.map(e => (
            <div key={e?.id} style={{
              display: 'grid',
              gridTemplateColumns: '42px 1fr 36px 50px 58px',
              gap: '6px',
              padding: '4px 10px',
              borderBottom: '1px solid var(--border-color, #1e293b)',
              alignItems: 'center',
            }}>
              <span style={{
                color: e?.method === 'GET' ? '#60a5fa' : '#c084fc',
                fontWeight: 600,
              }}>
                {e?.method}
              </span>
              <span style={{
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {truncateUrl(e?.url)}
              </span>
              <span style={{
                color: statusColor(e?.status),
                fontWeight: 600,
                textAlign: 'right',
              }}>
                {e?.status || '…'}
              </span>
              <span style={{
                color: 'var(--text-muted)',
                textAlign: 'right',
              }}>
                {e?.duration != null ? `${e.duration}ms` : '…'}
              </span>
              <span style={{
                color: 'var(--text-muted)',
                textAlign: 'right',
              }}>
                {formatTime(e?.startTime)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
