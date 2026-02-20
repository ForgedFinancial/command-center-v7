import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../../context/AppContext'
import { TABS, AGENT_COLORS } from '../../../config/constants'
import { syncClient } from '../../../api/syncClient'
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

  const fetchMessages = useCallback(async () => {
    try {
      const res = await syncClient.getRoomMessages('standup', 100)
      const msgs = res?.messages || res || []
      if (Array.isArray(msgs)) {
        actions.updateStandUp(msgs)
      }
    } catch (e) {
      // silent
    }
  }, [actions])

  useEffect(() => {
    if (state.activeTab !== TABS.STAND_UP) return
    fetchMessages()
    const id = setInterval(fetchMessages, 15000)
    return () => clearInterval(id)
  }, [state.activeTab, fetchMessages])

  const handleSend = useCallback(async (text) => {
    setSending(true)
    const optimistic = {
      id: 'opt-' + Date.now(),
      from: 'dano',
      to: 'standup',
      message: text,
      topic: 'standup',
      ts: new Date().toISOString(),
      read: false,
    }
    actions.updateStandUp([...state.standUpMessages, optimistic])
    try {
      await syncClient.sendRoomMessage('dano', text)
    } catch (e) {
      // keep optimistic
    }
    setSending(false)
  }, [state.standUpMessages, actions])

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
        <MessageFeed messages={state.standUpMessages} />
        <RoomInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  )
}
