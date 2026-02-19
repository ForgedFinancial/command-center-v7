import { useState } from 'react'
import ApprovalQueue from './ApprovalQueue'
import SMSTemplateEditor from './SMSTemplateEditor'
import TimerConfig from './TimerConfig'
import NotificationPrefs from './NotificationPrefs'

const TABS = [
  { id: 'queue', label: 'Approval Queue', icon: '📋', badge: true },
  { id: 'templates', label: 'SMS Templates', icon: '💬' },
  { id: 'timers', label: 'Timers', icon: '⏱' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
]

export default function AutomationView() {
  const [activeTab, setActiveTab] = useState('queue')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>⚡ Automations</h2>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
          SMS approval gate, templates, timers, and notification preferences
        </p>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {activeTab === 'queue' && <ApprovalQueue />}
        {activeTab === 'templates' && <SMSTemplateEditor />}
        {activeTab === 'timers' && <TimerConfig />}
        {activeTab === 'notifications' && <NotificationPrefs />}
      </div>
    </div>
  )
}
