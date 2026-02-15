import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { syncClient } from '../../api/syncClient'
import { FILE_PREVIEWS } from '../../config/constants'

// ========================================
// FEATURE: HealthPanel
// Added: 2026-02-15 by Mason (FF-BLD-001)
// Session 2: Slide-out health dashboard
// Glass-panel aesthetic, mission control vibes
// ========================================

// Global console error capture
const capturedErrors = []
const originalConsoleError = console.error
console.error = (...args) => {
  capturedErrors.push({
    timestamp: Date.now(),
    message: args.map(a => typeof a === 'string' ? a : (a?.message || String(a))).join(' '),
    type: args[0]?.name || (typeof args[0] === 'string' ? args[0].split(':')[0] : 'Error'),
  })
  if (capturedErrors.length > 50) capturedErrors.shift()
  originalConsoleError.apply(console, args)
}

const STATUS = { green: 'green', yellow: 'yellow', red: 'red' }

const STATUS_COLORS = {
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
}

const STATUS_ICONS = {
  green: '●',
  yellow: '●',
  red: '●',
}

function useHealthChecks(isOpen) {
  const { state } = useApp()
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(false)

  const runChecks = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)

    const results = []

    // 1. VPS Connection
    try {
      const start = Date.now()
      const healthData = await syncClient.health()
      const elapsed = Date.now() - start
      if (elapsed > 5000) {
        results.push({ name: 'VPS Connection', status: STATUS.yellow, message: 'VPS is responding slowly' })
      } else {
        results.push({ name: 'VPS Connection', status: STATUS.green, message: 'VPS is online and responding' })
      }
    } catch (err) {
      if (err?.isTimeout) {
        results.push({ name: 'VPS Connection', status: STATUS.yellow, message: 'VPS is taking too long to respond' })
      } else {
        results.push({ name: 'VPS Connection', status: STATUS.red, message: "Can't reach the server" })
      }
    }

    // 2. API Health
    try {
      const healthData = await syncClient.health()
      const apiStatus = healthData?.status || healthData
      if (apiStatus === 'ok' || apiStatus === 'healthy') {
        results.push({ name: 'API Health', status: STATUS.green, message: 'All API endpoints are healthy' })
      } else if (typeof apiStatus === 'string') {
        results.push({ name: 'API Health', status: STATUS.yellow, message: 'API is running with limited functionality' })
      } else {
        results.push({ name: 'API Health', status: STATUS.yellow, message: "API endpoints aren't fully set up yet" })
      }
    } catch (err) {
      if (err?.status === 404) {
        results.push({ name: 'API Health', status: STATUS.yellow, message: "API endpoints aren't set up yet" })
      } else {
        results.push({ name: 'API Health', status: STATUS.red, message: 'API is not responding' })
      }
    }

    // 3. Agent Sync
    const agents = state?.agents
    const agentKeys = agents ? Object.keys(agents) : []
    if (agentKeys.length > 0) {
      const anyStale = agentKeys.some(k => {
        const lastSeen = agents[k]?.lastSeen
        return lastSeen && (Date.now() - new Date(lastSeen).getTime()) > 300000
      })
      if (anyStale) {
        results.push({ name: 'Agent Sync', status: STATUS.yellow, message: 'Some agent data may be outdated' })
      } else {
        results.push({ name: 'Agent Sync', status: STATUS.green, message: `${agentKeys.length} agents synced and current` })
      }
    } else {
      results.push({ name: 'Agent Sync', status: STATUS.red, message: 'No agent data loaded' })
    }

    // 4. Workspace Files
    const selectedAgent = state?.workspaceAgent || state?.selectedAgent
    if (selectedAgent && FILE_PREVIEWS?.[selectedAgent]) {
      const files = Object.keys(FILE_PREVIEWS[selectedAgent])
      if (files.length >= 4) {
        results.push({ name: 'Workspace Files', status: STATUS.green, message: `Files loaded for ${selectedAgent}` })
      } else if (files.length > 0) {
        results.push({ name: 'Workspace Files', status: STATUS.yellow, message: `Partial files for ${selectedAgent}` })
      } else {
        results.push({ name: 'Workspace Files', status: STATUS.red, message: 'No workspace files found' })
      }
    } else if (selectedAgent) {
      results.push({ name: 'Workspace Files', status: STATUS.red, message: 'No files for selected agent' })
    } else {
      results.push({ name: 'Workspace Files', status: STATUS.yellow, message: 'No agent selected — select one to check files' })
    }

    // 5. Build Version
    const buildInfo = state?.buildInfo
    if (buildInfo?.buildHash && buildInfo?.version) {
      results.push({ name: 'Build Version', status: STATUS.green, message: `Build ${buildInfo.buildHash} · v${buildInfo.version}` })
    } else if (buildInfo?.version) {
      results.push({ name: 'Build Version', status: STATUS.yellow, message: 'Version info present, build hash missing' })
    } else {
      results.push({ name: 'Build Version', status: STATUS.yellow, message: 'Running in development mode' })
    }

    setChecks(results)
    setLoading(false)
  }, [isOpen, state?.agents, state?.workspaceAgent, state?.selectedAgent, state?.buildInfo])

  useEffect(() => {
    runChecks()
  }, [runChecks])

  return { checks, loading, runChecks }
}

export default function HealthPanel({ isOpen, onClose }) {
  const panelRef = useRef(null)
  const { checks, loading, runChecks } = useHealthChecks(isOpen)
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true))
      })
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!visible) return null

  // Overall status
  const redCount = checks.filter(c => c.status === STATUS.red).length
  const yellowCount = checks.filter(c => c.status === STATUS.yellow).length
  const issueCount = redCount + yellowCount

  let overallMessage, overallColor, overallGlow
  if (redCount >= 2 || !checks.length) {
    overallMessage = 'System Offline'
    overallColor = STATUS_COLORS.red
    overallGlow = '0 0 20px rgba(239, 68, 68, 0.4)'
  } else if (issueCount > 0) {
    overallMessage = `${issueCount} Issue${issueCount > 1 ? 's' : ''} Detected`
    overallColor = STATUS_COLORS.yellow
    overallGlow = '0 0 20px rgba(245, 158, 11, 0.3)'
  } else {
    overallMessage = 'All Systems Operational'
    overallColor = STATUS_COLORS.green
    overallGlow = '0 0 20px rgba(34, 197, 94, 0.3)'
  }

  // Console errors — last 5, grouped
  const recentErrors = capturedErrors.slice(-5).reverse()
  const errorGroups = {}
  capturedErrors.forEach(e => {
    const key = e.type || 'Error'
    errorGroups[key] = (errorGroups[key] || 0) + 1
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
          backgroundColor: animating ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          transition: 'background-color 0.3s ease',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: '37px',
          left: 0,
          right: 0,
          zIndex: 999,
          maxHeight: '70vh',
          overflowY: 'auto',
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.4)',
          padding: '24px 32px 20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>🛰️</span>
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary, #f1f5f9)',
              letterSpacing: '0.02em',
            }}>
              System Health
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={runChecks}
              disabled={loading}
              style={{
                background: 'rgba(148, 163, 184, 0.1)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? '⟳ Checking…' : '↻ Refresh'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: `linear-gradient(90deg, ${overallColor}11, ${overallColor}08)`,
          border: `1px solid ${overallColor}33`,
          boxShadow: overallGlow,
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: overallColor,
            boxShadow: `0 0 8px ${overallColor}`,
            animation: issueCount > 0 ? 'healthPulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: overallColor,
            letterSpacing: '0.03em',
          }}>
            {overallMessage}
          </span>
        </div>

        {/* Health Checks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {checks.map((check, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(148, 163, 184, 0.04)',
              border: '1px solid rgba(148, 163, 184, 0.08)',
            }}>
              <span style={{
                color: STATUS_COLORS[check.status],
                fontSize: '12px',
                textShadow: `0 0 6px ${STATUS_COLORS[check.status]}`,
              }}>
                {STATUS_ICONS[check.status]}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary, #cbd5e1)',
                minWidth: '120px',
              }}>
                {check.name}
              </span>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted, #94a3b8)',
                flex: 1,
              }}>
                {check.message}
              </span>
            </div>
          ))}
          {checks.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
              {loading ? 'Running health checks…' : 'No checks available'}
            </div>
          )}
        </div>

        {/* Console Error Summary */}
        <div style={{
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          paddingTop: '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <span style={{ fontSize: '13px' }}>📋</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary, #cbd5e1)',
              letterSpacing: '0.02em',
            }}>
              Console Errors
            </span>
            <span style={{
              fontSize: '10px',
              color: 'var(--text-muted, #64748b)',
              background: 'rgba(148, 163, 184, 0.1)',
              padding: '1px 6px',
              borderRadius: '8px',
            }}>
              {capturedErrors.length} total
            </span>
          </div>

          {recentErrors.length === 0 ? (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(34, 197, 94, 0.05)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
              fontSize: '12px',
              color: '#22c55e',
            }}>
              ✓ No console errors captured
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Error type groups */}
              {Object.keys(errorGroups).length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}>
                  {Object.entries(errorGroups).map(([type, count]) => (
                    <span key={type} style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                    }}>
                      {type} × {count}
                    </span>
                  ))}
                </div>
              )}
              {recentErrors.map((err, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={{
                    color: '#f87171',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {err.message?.slice(0, 120)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes healthPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}
