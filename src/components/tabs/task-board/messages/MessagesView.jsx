import { useState } from 'react'
import EmptyState from '../../../shared/EmptyState'

export default function MessagesView() {
  const [search, setSearch] = useState('')
  const [conversations] = useState([]) // empty — no fake data
  const [selectedConversation, setSelectedConversation] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Messages</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
            iMessage Connected
          </span>
        </div>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No Messages"
          message="Your conversations will appear here when connected to iMessage."
        />
      ) : (
        <div style={{ display: 'flex', flex: 1, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {/* Conversation list */}
          <div style={{
            width: '300px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '12px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#e4e4e7',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderLeft: selectedConversation?.id === conv.id ? '3px solid #00d4ff' : '3px solid transparent',
                    background: selectedConversation?.id === conv.id ? 'rgba(0,212,255,0.04)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{conv.name}</span>
                    <span style={{ fontSize: '10px', color: '#52525b' }}>{conv.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!selectedConversation ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '13px', color: '#52525b' }}>Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Message header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>{selectedConversation.name}</span>
                </div>
                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px' }} />
                {/* Input */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  gap: '8px',
                }}>
                  <input
                    type="text"
                    placeholder="iMessage"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#e4e4e7',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#00d4ff',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    ↑
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
