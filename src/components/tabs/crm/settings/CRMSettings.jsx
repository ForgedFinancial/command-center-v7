import { useState } from 'react'

const STAGE_CONFIG = [
  { stage: 'new_lead', label: 'New Leads', color: '#3b82f6', note: 'Auto-assign enabled' },
  { stage: 'contact', label: 'Contacted', color: '#a855f7', note: '3-day follow-up' },
  { stage: 'engaged', label: 'Qualified', color: '#00d4ff', note: 'Manual review' },
  { stage: 'qualified', label: 'Proposal Sent', color: '#f59e0b', note: '7-day expiry' },
  { stage: 'application', label: 'Negotiation', color: '#f97316', note: 'Alert on stale' },
  { stage: 'sold', label: 'Won', color: '#4ade80', note: 'Triggers onboarding' },
]

export default function CRMSettings() {
  const cardStyle = {
    padding: '24px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: '16px',
  }

  const sectionTitle = {
    margin: '0 0 16px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#e4e4e7',
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>CRM Settings</h2>
      <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#71717a' }}>Configure your CRM preferences</p>

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          {/* Pipeline Stages */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Pipeline Stages</h3>
            {STAGE_CONFIG.map(s => (
              <div key={s.stage} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                marginBottom: '6px',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: s.color, marginRight: '12px', flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: '13px', color: '#e4e4e7' }}>{s.label}</span>
                <span style={{ fontSize: '11px', color: '#71717a', marginRight: '12px' }}>{s.note}</span>
                <span style={{ fontSize: '14px', color: '#52525b', cursor: 'pointer' }}>⚙️</span>
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Notifications</h3>
            <NotificationToggle label="New lead alerts" defaultOn />
            <NotificationToggle label="Deal stage changes" defaultOn />
            <NotificationToggle label="Stale deal warnings" defaultOn />
            <NotificationToggle label="Weekly pipeline digest" defaultOn={false} />
            <NotificationToggle label="Send task updates to Telegram" defaultOn storageKey="telegramNotifications" />
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationToggle({ label, defaultOn = true, storageKey = null }) {
  const [on, setOn] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) return stored !== 'false'
    }
    return defaultOn
  })
  const toggle = () => {
    const next = !on
    setOn(next)
    if (storageKey) localStorage.setItem(storageKey, String(next))
  }
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '12px',
    }}>
      <span style={{ fontSize: '13px', color: '#e4e4e7' }}>{label}</span>
      <div
        onClick={toggle}
        style={{
          width: '36px', height: '20px', borderRadius: '10px',
          background: on ? '#00d4ff' : 'rgba(255,255,255,0.1)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: on ? '#fff' : '#71717a',
          position: 'absolute', top: '2px',
          left: on ? '18px' : '2px',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}
