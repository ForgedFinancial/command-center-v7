import { useState, useCallback, useEffect, useRef } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import DataSourceToggle from '../../../shared/DataSourceToggle'
import PhoneLineSelector from '../../../shared/PhoneLineSelector'
import SMSComposer from '../../../shared/SMSComposer'
import { useDataSource } from '../../../../hooks/useDataSource'
import { usePhone } from '../../../../context/PhoneContext'
import twilioClient from '../../../../services/twilioClient'

const REFRESH_INTERVAL = 60000

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

export default function MessagesView() {
  const { source } = useDataSource()
  const { twilioConfigured, activeLine } = usePhone()
  const [search, setSearch] = useState('')
  const [imessageConvos, setImessageConvos] = useState([])
  const [twilioThreads, setTwilioThreads] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [messageSource, setMessageSource] = useState('all') // all | imessage | twilio
  const [smsInput, setSmsInput] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const intervalRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Fetch iMessage conversations (existing)
  const fetchImessage = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/messages`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setImessageConvos((data.conversations || []).map(c => ({
        ...c,
        msgSource: 'imessage',
        display_name: c.display_name || c.chat_identifier,
      })))
      setConnected(data.connected !== false)
    } catch {
      setConnected(false)
      setImessageConvos([])
    }
  }, [])

  // Fetch Twilio SMS threads
  const fetchTwilioThreads = useCallback(async () => {
    try {
      const data = await twilioClient.getThreads(50)
      setTwilioThreads((data.threads || []).map(t => ({
        chat_identifier: t.phone,
        display_name: t.phone ? formatPhone(t.phone) : 'Unknown',
        last_message: t.last_message,
        last_msg_time: t.last_msg_time ? new Date(t.last_msg_time).toLocaleString() : '',
        msg_count: null,
        msgSource: 'twilio',
        lead_id: t.lead_id,
      })))
    } catch {
      setTwilioThreads([])
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchImessage(), fetchTwilioThreads()])
    setLastRefresh(new Date())
    setLoading(false)
  }, [fetchImessage, fetchTwilioThreads])

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchAll])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (chat) => {
    setMsgsLoading(true)
    if (chat.msgSource === 'twilio') {
      // Fetch from Twilio
      try {
        const data = await twilioClient.getMessages({ phone: chat.chat_identifier, limit: 100 })
        setMessages((data.messages || []).reverse().map(m => ({
          text: m.body,
          is_from_me: m.direction === 'outbound',
          sent_at: m.created_at ? new Date(m.created_at).toLocaleString() : '',
          service: 'Twilio SMS',
          status: m.status,
        })))
      } catch {
        setMessages([])
      }
    } else {
      // Fetch from iMessage (existing)
      try {
        const res = await fetch(`${WORKER_PROXY_URL}/api/messages/${encodeURIComponent(chat.chat_identifier)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setMessages((data.messages || []).reverse())
      } catch {
        setMessages([])
      }
    }
    setMsgsLoading(false)
  }, [])

  const handleSelectChat = (conv) => {
    setSelectedChat(conv)
    setShowCompose(false)
    fetchMessages(conv)
  }

  // Send SMS reply in thread
  const handleSendSMS = async () => {
    if (!smsInput.trim() || !selectedChat?.chat_identifier) return
    if (!twilioConfigured) return

    setSmsSending(true)
    try {
      await twilioClient.sendSMS(selectedChat.chat_identifier, smsInput.trim())
      setSmsInput('')
      // Refresh messages
      await fetchMessages(selectedChat)
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      console.error('Send SMS error:', err)
    } finally {
      setSmsSending(false)
    }
  }

  // Merge conversations from both sources
  const allConversations = [
    ...(messageSource === 'twilio' ? [] : imessageConvos),
    ...(messageSource === 'imessage' ? [] : twilioThreads),
  ]

  const filtered = allConversations.filter(c => {
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
          <PhoneLineSelector compact />
          <DataSourceToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '10px', color: '#52525b' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => { setShowCompose(true); setSelectedChat(null) }}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)',
              color: '#4ade80', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✏️ New SMS
          </button>
          <button
            onClick={fetchAll}
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
            {connected ? 'iMessage Connected' : 'Waiting'}
          </span>
          {twilioConfigured && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
              SMS Active
            </span>
          )}
        </div>
      </div>

      {/* Source filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {[['all', 'All'], ['imessage', '💬 iMessage'], ['twilio', '📱 Twilio SMS']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMessageSource(key)}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '11px',
              border: messageSource === key ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
              background: messageSource === key ? 'rgba(0,212,255,0.1)' : 'transparent',
              color: messageSource === key ? '#00d4ff' : '#71717a',
              fontWeight: messageSource === key ? 600 : 400, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {allConversations.length === 0 && !loading && !showCompose ? (
        <EmptyState
          icon="💬"
          title="No Messages"
          message={connected ? 'No conversations found' : 'Waiting for Mac node connection...'}
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
                  key={`${conv.msgSource}-${conv.chat_identifier || i}`}
                  onClick={() => handleSelectChat(conv)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderLeft: selectedChat?.chat_identifier === conv.chat_identifier && selectedChat?.msgSource === conv.msgSource
                      ? '3px solid #00d4ff' : '3px solid transparent',
                    background: selectedChat?.chat_identifier === conv.chat_identifier && selectedChat?.msgSource === conv.msgSource
                      ? 'rgba(0,212,255,0.04)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px',
                        background: conv.msgSource === 'twilio' ? 'rgba(168,85,247,0.15)' : 'rgba(0,122,255,0.15)',
                        color: conv.msgSource === 'twilio' ? '#a855f7' : '#007aff',
                      }}>
                        {conv.msgSource === 'twilio' ? 'SMS' : 'iM'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>
                        {conv.display_name || conv.chat_identifier}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#52525b', flexShrink: 0, marginLeft: '8px' }}>
                      {conv.last_msg_time || ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '38px' }}>
                    {conv.last_message || '(no text)'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {showCompose ? (
              <div style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: '#e4e4e7' }}>✏️ New SMS</h3>
                <SMSComposer
                  onSent={() => { setShowCompose(false); fetchAll() }}
                  onClose={() => setShowCompose(false)}
                />
              </div>
            ) : !selectedChat ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '13px', color: '#52525b' }}>Select a conversation</p>
              </div>
            ) : (
              <>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                      background: selectedChat.msgSource === 'twilio' ? 'rgba(168,85,247,0.15)' : 'rgba(0,122,255,0.15)',
                      color: selectedChat.msgSource === 'twilio' ? '#a855f7' : '#007aff',
                    }}>
                      {selectedChat.msgSource === 'twilio' ? 'Twilio SMS' : 'iMessage'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
                      {selectedChat.display_name || selectedChat.chat_identifier}
                    </span>
                  </div>
                  {selectedChat.msg_count != null && (
                    <span style={{ fontSize: '10px', color: '#52525b' }}>
                      {selectedChat.msg_count} messages
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {msgsLoading ? (
                    <div style={{ textAlign: 'center', color: '#52525b', fontSize: '12px', marginTop: '40px' }}>Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#52525b', fontSize: '12px', marginTop: '40px' }}>No messages</div>
                  ) : messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.is_from_me ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%', padding: '8px 12px',
                        borderRadius: msg.is_from_me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.is_from_me
                          ? (selectedChat.msgSource === 'twilio' ? '#6d28d9' : '#007aff')
                          : 'rgba(255,255,255,0.08)',
                        color: msg.is_from_me ? '#fff' : '#e4e4e7',
                        fontSize: '13px', lineHeight: '1.4',
                      }}>
                        <div>{msg.text || '(attachment)'}</div>
                        <div style={{
                          fontSize: '9px',
                          color: msg.is_from_me ? 'rgba(255,255,255,0.6)' : '#52525b',
                          marginTop: '4px', textAlign: 'right',
                          display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center',
                        }}>
                          {msg.sent_at}
                          {msg.service === 'Twilio SMS' && <span>📱</span>}
                          {msg.service === 'iMessage' && <span>💬</span>}
                          {msg.status === 'delivered' && <span>✓✓</span>}
                          {msg.status === 'sent' && <span>✓</span>}
                          {msg.status === 'failed' && <span style={{ color: '#ef4444' }}>✗</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                  padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', gap: '8px',
                }}>
                  {selectedChat.msgSource === 'twilio' && twilioConfigured ? (
                    <>
                      <input
                        type="text"
                        value={smsInput}
                        onChange={(e) => setSmsInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendSMS() } }}
                        placeholder="Type a message..."
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: '20px',
                          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                          color: '#e4e4e7', fontSize: '13px', outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleSendSMS}
                        disabled={!smsInput.trim() || smsSending}
                        style={{
                          padding: '10px 16px', borderRadius: '20px',
                          border: 'none',
                          background: smsInput.trim() ? '#6d28d9' : 'rgba(255,255,255,0.06)',
                          color: smsInput.trim() ? '#fff' : '#52525b',
                          fontSize: '13px', fontWeight: 600, cursor: smsInput.trim() ? 'pointer' : 'default',
                          opacity: smsSending ? 0.6 : 1,
                        }}
                      >
                        {smsSending ? '...' : '📤'}
                      </button>
                    </>
                  ) : (
                    <input
                      type="text"
                      placeholder={selectedChat.msgSource === 'twilio' ? 'Twilio not configured' : 'iMessage (read-only from Mac)'}
                      disabled
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                        color: '#71717a', fontSize: '13px', outline: 'none',
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
