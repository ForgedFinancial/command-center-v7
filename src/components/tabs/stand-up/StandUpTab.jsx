import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../../../context/AppContext'
import { TABS, AGENT_COLORS } from '../../../config/constants'
import MessageFeed from './MessageFeed'
import RoomInput from './RoomInput'

const AGENTS_LIST = [
  { id: 'clawd', name: 'Clawd', role: 'COO' },
  { id: 'kyle', name: 'Kyle', role: 'Desktop' },
  { id: 'soren', name: 'Soren', role: 'Architect' },
  { id: 'mason', name: 'Mason', role: 'Builder' },
  { id: 'sentinel', name: 'Sentinel', role: 'Inspector' },
]

export default function StandUpTab() {
  const { state, actions } = useApp()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/comms/session', { headers: { 'Content-Type': 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        actions.updateStandUpSession(data)
      }
    } catch {}
  }, [actions])

  const toggleSession = useCallback(async () => {
    const newActive = !state.standUpSession?.active
    try {
      const res = await fetch('/api/comms/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      })
      if (res.ok) {
        const data = await res.json()
        actions.updateStandUpSession(data.session)
      }
    } catch {}
  }, [state.standUpSession, actions])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/comms/room?topic=standup&limit=100', {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const msgs = data?.messages || []
      if (Array.isArray(msgs)) {
        actions.updateStandUp(msgs)
        setError(null)
      }
    } catch (e) {
      setError('Could not load messages: ' + e.message)
    }
  }, [actions])

  useEffect(() => {
    if (state.activeTab !== TABS.STAND_UP) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    fetchMessages()
    fetchSession()
    pollRef.current = setInterval(() => { fetchMessages(); fetchSession() }, 10000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state.activeTab]) // eslint-disable-line

  const handleSend = useCallback(async (text) => {
    if (!text || !text.trim()) return
    setSending(true)
    const optimistic = {
      id: 'opt-' + Date.now(),
      from: 'dano',
      to: 'standup',
      message: text.trim(),
      topic: 'standup',
      ts: new Date().toISOString(),
      read: false,
    }
    // Optimistic update — show immediately
    actions.updateStandUp([...(state.standUpMessages || []), optimistic])
    try {
      await fetch('/api/comms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'dano', to: 'standup', message: text.trim(), topic: 'standup' }),
      })
      // Pull confirmed messages after send
      setTimeout(fetchMessages, 500)
    } catch (e) {
      // optimistic stays
    }
    setSending(false)
  }, [state.standUpMessages, actions, fetchMessages])

  const getAgentStatus = (agentId) => {
    if (!state.agents || typeof state.agents !== 'object') return 'offline'
    const agent = state.agents[agentId]
    return agent?.status || 'offline'
  }

  const statusColors = {
    online: 'var(--status-online, #4ade80)',
    offline: 'var(--status-offline, #6b7280)',
    busy: 'var(--status-busy, #fbbf24)',
    error: 'var(--status-error, #ef4444)',
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Agent Sidebar */}
      <div style={{
        width: 200,
        minWidth: 200,
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '8px',
        }}>
          Agents
        </div>
        {AGENTS_LIST.map((a) => {
          const status = getAgentStatus(a.id)
          return (
            <div key={a.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '4px',
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: statusColors[status] || statusColors.offline,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '13px',
                fontWeight: 500,
                color: AGENT_COLORS[a.id] || 'var(--text-primary)',
              }}>
                {a.name}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginLeft: 'auto',
              }}>
                {a.role}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Session Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: state.standUpSession?.active
            ? 'rgba(16, 185, 129, 0.08)'
            : 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: state.standUpSession?.active
                ? 'var(--status-online, #4ade80)'
                : 'var(--status-offline, #6b7280)',
            }} />
            <span style={{
              fontSize: '12px',
              color: state.standUpSession?.active ? 'var(--status-online, #4ade80)' : 'var(--text-muted)',
              fontWeight: 500,
            }}>
              {state.standUpSession?.active ? 'Session Active — Agents can collaborate' : 'Session Inactive'}
            </span>
          </div>
          <button
            onClick={toggleSession}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: state.standUpSession?.active
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(16, 185, 129, 0.15)',
              color: state.standUpSession?.active
                ? 'var(--status-error, #ef4444)'
                : 'var(--status-online, #4ade80)',
              transition: 'all 0.15s',
            }}
          >
            {state.standUpSession?.active ? 'End Session' : 'Start Session'}
          </button>
        </div>
        {error && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(239,68,68,0.12)',
            color: 'var(--status-error, #ef4444)',
            fontSize: '12px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{error}</span>
            <button onClick={fetchMessages} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </div>
        )}
        <MessageFeed messages={state.standUpMessages} />
        <RoomInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  )
}
