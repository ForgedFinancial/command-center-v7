import { useState, useCallback, useEffect, useRef } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import DataSourceToggle from '../../../shared/DataSourceToggle'
import { useDataSource } from '../../../../hooks/useDataSource'

const REFRESH_INTERVAL = 30000

export default function MessagesView() {
  const { source } = useDataSource()
  const [search, setSearch] = useState('')
  const [conversations, setConversations] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const intervalRef = useRef(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/messages`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConversations(data.conversations || [])
      setConnected(data.connected !== false)
      setLastRefresh(new Date())
    } catch {
      setConnected(false)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (chatId) => {
    setMsgsLoading(true)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/messages/${encodeURIComponent(chatId)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages((data.messages || []).reverse()) // oldest first for chat display
    } catch {
      setMessages([])
    } finally {
      setMsgsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    intervalRef.current = setInterval(fetchConversations, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchConversations])

  const handleSelectChat = (conv) => {
    setSelectedChat(conv)
    fetchMessages(conv.chat_identifier)
  }

  const filtered = conversations.filter(c => {
    // Data source filter
    if (source === 'personal' && c.source === 'business') return false
    if (source === 'business' && c.source !== 'business') return false
    if (!search) return true
    const q = search.toLowerCase()
    return (c.display_name || '').toLowerCase().includes(q) ||
      (c.chat_identifier || '').toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Messages</h2>
          <DataSourceToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '10px', color: '#52525b' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchConversations}
            disabled={loading}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff', fontSize: '12px', fontWeight: 600,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#4ade80' : '#f59e0b' }} />
            {connected ? 'iMessage Connected' : 'Waiting for connection'}
          </span>
        </div>
      </div>

      {conversations.length === 0 && !loading ? (
        <EmptyState
          icon="💬"
          title="No Messages"
          message={connected ? "No conversations found" : "Waiting for Mac node connection..."}
        />
      ) : (
        <div style={{ display: 'flex', flex: 1, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minHeight: 0 }}>
          {/* Conversation list */}
          <div style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '12px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  color: '#e4e4e7', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {filtered.map((conv, i) => (
                <div
                  key={conv.chat_identifier || i}
                  onClick={() => handleSelectChat(conv)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderLeft: selectedChat?.chat_identifier === conv.chat_identifier ? '3px solid #00d4ff' : '3px solid transparent',
                    background: selectedChat?.chat_identifier === conv.chat_identifier ? 'rgba(0,212,255,0.04)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>
                      {conv.display_name || conv.chat_identifier}
                    </span>
                    <span style={{ fontSize: '10px', color: '#52525b', flexShrink: 0, marginLeft: '8px' }}>
                      {conv.last_msg_time || ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.last_message || '(no text)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {!selectedChat ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '13px', color: '#52525b' }}>Select a conversation</p>
              </div>
            ) : (
              <>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
                    {selectedChat.display_name || selectedChat.chat_identifier}
                  </span>
                  <span style={{ fontSize: '10px', color: '#52525b' }}>
                    {selectedChat.msg_count} messages
                  </span>
                </div>
                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {msgsLoading ? (
                    <div style={{ textAlign: 'center', color: '#52525b', fontSize: '12px', marginTop: '40px' }}>Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#52525b', fontSize: '12px', marginTop: '40px' }}>No messages</div>
                  ) : messages.map((msg, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: msg.is_from_me ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '8px 12px',
                        borderRadius: msg.is_from_me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.is_from_me ? '#007aff' : 'rgba(255,255,255,0.08)',
                        color: msg.is_from_me ? '#fff' : '#e4e4e7',
                        fontSize: '13px',
                        lineHeight: '1.4',
                      }}>
                        <div>{msg.text || '(attachment)'}</div>
                        <div style={{
                          fontSize: '9px',
                          color: msg.is_from_me ? 'rgba(255,255,255,0.6)' : '#52525b',
                          marginTop: '4px',
                          textAlign: 'right',
                        }}>
                          {msg.sent_at} · {msg.service === 'iMessage' ? '💬' : '📱'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Input (read-only for now) */}
                <div style={{
                  padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', gap: '8px',
                }}>
                  <input
                    type="text"
                    placeholder="iMessage (read-only)"
                    disabled
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                      color: '#71717a', fontSize: '13px', outline: 'none',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
