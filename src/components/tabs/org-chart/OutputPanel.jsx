import { useState, useEffect, useCallback } from 'react'
import { AGENT_HIERARCHY } from '../../../config/constants'
import { TIER_MAP, TIER_COLORS, MODEL_DISPLAY } from './treeConstants'
import syncClient from '../../../api/syncClient'

export default function OutputPanel({ agentId, agentData, onClose }) {
  const [mounted, setMounted] = useState(false)
  const [outputData, setOutputData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true))
    })
  }, [])

  // Fetch output
  useEffect(() => {
    if (!agentId) return
    setLoading(true)
    syncClient.getAgentOutput(agentId)
      .then((data) => setOutputData(data))
      .catch(() => setOutputData(null))
      .finally(() => setLoading(false))
  }, [agentId])

  // ESC key
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose?.()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const def = AGENT_HIERARCHY[agentId] || {}
  const tier = TIER_MAP[agentId] || 'specialist'
  const tierColor = TIER_COLORS[tier]
  const status = agentData?.status || 'offline'
  const modelKey = def?.isHuman ? 'Human' : (def?.model || null)
  const modelDisplay = modelKey ? (MODEL_DISPLAY[modelKey] || modelKey) : ''
  const statusColor = status === 'online' ? '#4ade80' : status === 'idle' ? '#f59e0b' : 'rgba(255,255,255,0.4)'

  const handleSlideOut = () => {
    setMounted(false)
    setTimeout(() => onClose?.(), 300)
  }

  const formatTimestamp = (ts) => {
    if (!ts) return ''
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago'
      }) + ' CT'
    } catch { return '' }
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0, left: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
        }}
        onClick={handleSlideOut}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '420px',
        height: '100vh',
        background: '#0d0d14',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 101,
        transform: mounted ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: tierColor }}>
              {def?.name || agentId}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: '2px',
            }}>{def?.role || ''}</div>
          </div>
          <button
            onClick={handleSlideOut}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'all 0.15s',
            }}
          >ESC</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Agent Info */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '10px',
            }}>Agent Info</div>
            {[
              { label: 'Status', value: status?.charAt(0)?.toUpperCase() + status?.slice(1), color: statusColor },
              { label: 'Model', value: modelDisplay },
              { label: 'Last Active', value: agentData?.lastActive ? formatTimestamp(agentData.lastActive) : (status === 'online' ? 'Active now' : 'Inactive') },
              { label: 'Current Task', value: agentData?.currentTask || 'None', color: agentData?.currentTask ? '#f59e0b' : undefined },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                fontSize: '11px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>{row.label}</span>
                <span style={{ color: row.color || 'rgba(255,255,255,0.6)' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Last Output */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              marginBottom: '10px',
            }}>Last Output</div>
            {loading ? (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Loading...</div>
            ) : (
              <>
                <div style={{
                  fontSize: '12px',
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.6)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {outputData?.output || 'No output available'}
                </div>
                {(outputData?.sessionId || outputData?.runtime || outputData?.timestamp) && (
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '8px' }}>
                    {[
                      outputData?.sessionId ? `Output from session ${outputData.sessionId}` : null,
                      outputData?.runtime ? `${outputData.runtime} runtime` : null,
                      outputData?.timestamp ? formatTimestamp(outputData.timestamp) : null,
                    ].filter(Boolean).join(' — ')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
