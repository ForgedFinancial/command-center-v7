import { useState, useEffect } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'

const ACTIVITY_ICONS = {
  call: '📞',
  message: '💬',
  email: '📧',
  stage_change: '🔄',
  calendar: '📅',
  note: '📝',
  task: '✅',
  default: '•',
}

export default function ContactActivityTimeline({ contactId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    setLoading(true)
    fetch(`${WORKER_PROXY_URL}/api/contacts/${contactId}/activity`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setActivities(Array.isArray(data) ? data : data.activities || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false))
  }, [contactId])

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>Loading activity...</div>
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No Activity Yet"
        message="Calls, messages, stage changes, and notes will appear here."
      />
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '24px' }}>
      {/* Vertical timeline line */}
      <div style={{
        position: 'absolute', left: '7px', top: '4px', bottom: '4px',
        width: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px',
      }} />

      {activities.map((item, i) => (
        <div key={item.id || i} style={{ position: 'relative', marginBottom: '16px', paddingLeft: '8px' }}>
          {/* Dot */}
          <div style={{
            position: 'absolute', left: '-22px', top: '3px',
            width: '12px', height: '12px', borderRadius: '50%',
            background: 'rgba(0,212,255,0.15)', border: '2px solid rgba(0,212,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '7px',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>
              {ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.default}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#e4e4e7', fontWeight: 500 }}>
                {item.description || item.message || item.title}
              </div>
              <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
