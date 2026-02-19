import { useState, useEffect } from 'react'
import crmClient from '../../../../api/crmClient'

const NOTIFICATION_TYPES = [
  { id: 'new_lead', label: 'New Lead', desc: 'When a new lead enters the pipeline', icon: '🆕' },
  { id: 'stage_change', label: 'Stage Change', desc: 'When a lead moves between stages', icon: '↔️' },
  { id: 'timer_expiry', label: 'Timer Expiry', desc: 'When a stage timer expires (overdue)', icon: '⏰' },
  { id: 'escalation', label: 'Escalation', desc: 'P4 escalation tags (URGENT, CRITICAL, etc.)', icon: '🔺' },
  { id: 'zombie', label: 'ZOMBIE Alert', desc: 'Client contact during Recycle stage', icon: '🧟' },
  { id: 'daily_summary', label: 'Daily Summary', desc: 'Daily 8AM pipeline summary', icon: '📊' },
  { id: 'exception', label: 'Exception Alert', desc: 'New retention exception in P4', icon: '🚨' },
  { id: 'approval_needed', label: 'Approval Needed', desc: 'SMS pending in approval queue', icon: '📝' },
]

const CHANNELS = [
  { id: 'in_app', label: 'In-App' },
  { id: 'sms', label: 'SMS' },
  { id: 'push', label: 'Push' },
]

export default function NotificationPrefs() {
  const [prefs, setPrefs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await crmClient.request('/settings/notifications')
        setPrefs(res.preferences || res.data || res || getDefaults())
      } catch {
        setPrefs(getDefaults())
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const toggle = async (typeId, channelId) => {
    const updated = {
      ...prefs,
      [typeId]: {
        ...(prefs[typeId] || {}),
        [channelId]: !(prefs[typeId]?.[channelId] ?? true),
      },
    }
    setPrefs(updated)
    try {
      await crmClient.request('/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({ preferences: updated }),
      })
      setSaveStatus('Saved!')
    } catch {
      setSaveStatus('Save failed')
    }
    setTimeout(() => setSaveStatus(null), 1500)
  }

  const isEnabled = (typeId, channelId) => prefs[typeId]?.[channelId] ?? true

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading notification preferences...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>Configure which notifications you receive and how.</div>
        {saveStatus && <span style={{ fontSize: 11, color: saveStatus === 'Saved!' ? '#4ade80' : '#ef4444' }}>{saveStatus}</span>}
      </div>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 70px)', gap: 8, padding: '0 14px' }}>
        <div />
        {CHANNELS.map(ch => (
          <div key={ch.id} style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'center' }}>{ch.label}</div>
        ))}
      </div>

      {/* Notification types */}
      {NOTIFICATION_TYPES.map(type => (
        <div key={type.id} style={{
          display: 'grid', gridTemplateColumns: '1fr repeat(3, 70px)', gap: 8, alignItems: 'center',
          padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{type.icon} {type.label}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{type.desc}</div>
          </div>
          {CHANNELS.map(ch => {
            const on = isEnabled(type.id, ch.id)
            return (
              <div key={ch.id} style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => toggle(type.id, ch.id)} style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative',
                  background: on ? '#4ade80' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: on ? 19 : 3, transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function getDefaults() {
  const prefs = {}
  NOTIFICATION_TYPES.forEach(t => {
    prefs[t.id] = { in_app: true, sms: t.id !== 'stage_change', push: t.id === 'zombie' || t.id === 'escalation' || t.id === 'exception' }
  })
  return prefs
}
