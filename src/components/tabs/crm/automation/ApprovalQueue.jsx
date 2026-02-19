import { useState, useEffect, useCallback } from 'react'
import crmClient from '../../../../api/crmClient'

const STATUS_COLORS = {
  pending: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: 'Pending' },
  approved: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80', label: 'Approved' },
  declined: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Declined' },
}

export default function ApprovalQueue() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [autoSend, setAutoSend] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [filter, setFilter] = useState('pending')

  const fetchQueue = useCallback(async () => {
    try {
      const res = await crmClient.request('/sms-queue')
      setMessages(Array.isArray(res) ? res : res.messages || res.data || [])
    } catch {
      // Use mock data for now
      setMessages(getMockMessages())
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAutoSend = useCallback(async () => {
    try {
      const res = await crmClient.request('/settings/auto-send')
      setAutoSend(res.enabled || false)
    } catch {}
  }, [])

  useEffect(() => { fetchQueue(); fetchAutoSend() }, [fetchQueue, fetchAutoSend])

  const handleApprove = async (id) => {
    try {
      await crmClient.request(`/sms-queue/${id}/approve`, { method: 'POST' })
    } catch {}
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'approved' } : m))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const handleDecline = async (id) => {
    try {
      await crmClient.request(`/sms-queue/${id}/decline`, { method: 'POST' })
    } catch {}
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'declined' } : m))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const handleBulkApprove = async () => {
    const ids = [...selectedIds]
    try {
      await crmClient.request('/sms-queue/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
    } catch {}
    setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, status: 'approved' } : m))
    setSelectedIds(new Set())
  }

  const toggleAutoSend = async () => {
    if (!autoSend) {
      setShowConfirm(true)
      return
    }
    try {
      await crmClient.request('/settings/auto-send', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      })
    } catch {}
    setAutoSend(false)
  }

  const confirmAutoSend = async () => {
    try {
      await crmClient.request('/settings/auto-send', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: true, confirmed: true }),
      })
    } catch {}
    setAutoSend(true)
    setShowConfirm(false)
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const selectAll = () => {
    const pending = filtered.filter(m => m.status === 'pending')
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pending.map(m => m.id)))
    }
  }

  const filtered = messages.filter(m => filter === 'all' || m.status === filter)

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading approval queue...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending', 'approved', 'declined', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: filter === f ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#3b82f6' : '#94a3b8',
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && <span style={{ marginLeft: 6, background: '#f59e0b', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                {messages.filter(m => m.status === 'pending').length}
              </span>}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedIds.size > 0 && (
            <button onClick={handleBulkApprove} style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#4ade80', color: '#000', fontWeight: 600, fontSize: 13,
            }}>✓ Approve Selected ({selectedIds.size})</button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Auto-Send</span>
            <button onClick={toggleAutoSend} style={{
              width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
              background: autoSend ? '#4ade80' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                left: autoSend ? 21 : 3, transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* Auto-send warning */}
      {autoSend && (
        <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.12)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13 }}>
          ⚠️ Auto-Send is ON — Messages will be sent without review
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, maxWidth: 420, width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 12px', color: '#f59e0b' }}>⚠️ Enable Auto-Send?</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
              Are you sure? Messages will send without review. All automated SMS will be sent immediately without passing through the approval queue.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmAutoSend} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Yes, Enable Auto-Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Messages list */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          {filter === 'pending' ? '✓ No pending messages' : 'No messages'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filter === 'pending' && filtered.some(m => m.status === 'pending') && (
            <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={selectedIds.size === filtered.filter(m => m.status === 'pending').length && selectedIds.size > 0}
                onChange={selectAll} style={{ accentColor: '#3b82f6' }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>Select all</span>
            </div>
          )}
          {filtered.map(msg => {
            const sc = STATUS_COLORS[msg.status] || STATUS_COLORS.pending
            return (
              <div key={msg.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {msg.status === 'pending' && (
                  <input type="checkbox" checked={selectedIds.has(msg.id)} onChange={() => toggleSelect(msg.id)}
                    style={{ marginTop: 4, accentColor: '#3b82f6' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{msg.recipientName || msg.recipient}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{msg.recipientPhone || ''}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.text }}>{sc.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Trigger: {msg.triggerReason || 'Manual'}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{msg.templateName || ''}</span>
                  </div>
                </div>
                {msg.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleApprove(msg.id)} style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: 12, fontWeight: 600,
                    }}>✓ Approve</button>
                    <button onClick={() => handleDecline(msg.id)} style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12, fontWeight: 600,
                    }}>✕ Decline</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getMockMessages() {
  return [
    { id: 'msg-1', recipient: 'client', recipientName: 'John Smith', recipientPhone: '(555) 123-4567', content: 'Hi John! This is {{agent_name}} with Forged Financial. I saw you were interested in life insurance — I\'d love to help! When\'s a good time to chat?', status: 'pending', triggerReason: 'P1 New Lead → On entry', templateName: 'Speed-to-Lead Intro', createdAt: new Date().toISOString() },
    { id: 'msg-2', recipient: 'client', recipientName: 'Sarah Johnson', recipientPhone: '(555) 987-6543', content: 'Great news Sarah! Your application with Mutual of Omaha has been approved! Your agent Dano will be in touch with next steps.', status: 'pending', triggerReason: 'P3 Approved → On entry', templateName: 'Approval Congrats', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'msg-3', recipient: 'agent', recipientName: 'Agent Dano', recipientPhone: '(555) 555-0100', content: '🚨 EXCEPTION ALERT: Policy #LF-2024-0847 for Mike Davis has a billing issue. Check P4 immediately.', status: 'pending', triggerReason: 'P4 New Exception → On entry', templateName: 'Exception Alert', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'msg-4', recipient: 'client', recipientName: 'Lisa Chen', recipientPhone: '(555) 246-8135', content: 'Hey Lisa, life gets busy — totally understand! Just wanted you to know I\'m still here whenever you\'re ready to chat about coverage options.', status: 'approved', triggerReason: 'P7 Nurture → Day 7', templateName: 'Nurture Day 7', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'msg-5', recipient: 'client', recipientName: 'Bob Williams', recipientPhone: '(555) 369-2580', content: 'Hi Bob, we noticed your payment didn\'t go through. Please contact us to resolve this quickly so your coverage stays active.', status: 'declined', triggerReason: 'P4 Active Recovery → On entry', templateName: 'Issue Notification', createdAt: new Date(Date.now() - 172800000).toISOString() },
  ]
}
