import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../../../../context/AppContext'
import { useCRM } from '../../../../context/CRMContext'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import PipelineModeToggle, { filterByPipelineMode } from '../PipelineModeToggle'

export default function FollowUpQueue() {
  const { actions: appActions } = useApp()
  const { state: crmState } = useCRM()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${WORKER_PROXY_URL}/api/contacts/follow-up-queue`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setQueue(Array.isArray(data) ? data : data.contacts || []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false))
  }, [])

  const handleDial = useCallback((contact) => {
    if (!contact.phone) return
    appActions.addToast({ id: Date.now(), type: 'info', message: `Dialing ${contact.name}...` })
    fetch(`${WORKER_PROXY_URL}/api/dial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: contact.phone, name: contact.name }),
    }).catch(() => {})
  }, [appActions])

  const filteredQueue = useMemo(() => filterByPipelineMode(queue, crmState.pipelineMode), [queue, crmState.pipelineMode])

  const getDaysOverdue = (lastContact) => {
    if (!lastContact) return '—'
    const diff = Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000)
    return diff
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>Follow-Up Queue</h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Contacts prioritized by days since last contact</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <PipelineModeToggle />
          <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>{filteredQueue.length} contacts</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--theme-text-secondary)', fontSize: '12px' }}>Loading...</div>
      ) : filteredQueue.length === 0 ? (
        <EmptyState icon="📋" title="No Follow-Ups" message="All contacts are up to date, or connect your CRM to populate this queue." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredQueue.map((contact, i) => {
            const daysOverdue = getDaysOverdue(contact.lastContact)
            const urgency = typeof daysOverdue === 'number'
              ? daysOverdue > 14 ? '#ef4444' : daysOverdue > 7 ? '#f59e0b' : '#4ade80'
              : '#71717a'

            return (
              <div
                key={contact.id || i}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                {/* Priority indicator */}
                <div style={{
                  width: '4px', height: '40px', borderRadius: '2px',
                  background: urgency, flexShrink: 0,
                }} />

                {/* Contact info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '2px' }}>
                    {contact.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                    {contact.phone || 'No phone'} · {contact.stage || 'No stage'}
                  </div>
                </div>

                {/* Days overdue */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: urgency }}>
                    {typeof daysOverdue === 'number' ? daysOverdue : '—'}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    days
                  </div>
                </div>

                {/* Last contact */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Last contact</div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                    {contact.lastContact ? new Date(contact.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                  </div>
                </div>

                {/* Dial button */}
                {contact.phone && (
                  <button
                    onClick={() => handleDial(contact)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      border: '1px solid var(--theme-success)', background: 'var(--theme-accent-muted)',
                      color: 'var(--theme-success)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    📞 Call
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
