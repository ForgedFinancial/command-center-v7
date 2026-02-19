import { useState } from 'react'
import { usePhone } from '../../../../context/PhoneContext'

export default function PhoneLinesSection() {
  const { lines, primaryLine, twilioConfigured, switchPrimaryLine, loadLines } = usePhone()
  const [switching, setSwitching] = useState(null)

  if (!twilioConfigured) {
    return (
      <div style={cardStyle}>
        <h3 style={sectionTitle}>📞 Phone Lines</h3>
        <div style={emptyState}>
          <span style={{ fontSize: '28px', marginBottom: '8px' }}>📵</span>
          <p>Twilio not configured yet.</p>
          <p style={{ fontSize: '11px', opacity: 0.7 }}>
            Phone lines will appear here once Twilio integration is set up.
          </p>
        </div>
      </div>
    )
  }

  const handleSetPrimary = async (lineId) => {
    setSwitching(lineId)
    try {
      await switchPrimaryLine(lineId)
    } catch { /* error handled in context */ }
    setSwitching(null)
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ ...sectionTitle, margin: 0 }}>📞 Phone Lines</h3>
        <button onClick={loadLines} style={refreshBtn}>↻ Refresh</button>
      </div>

      {lines.length === 0 ? (
        <div style={emptyState}>No phone lines found.</div>
      ) : (
        lines.map(line => {
          const isPrimary = primaryLine?.id === line.id || primaryLine === line.id
          return (
            <div key={line.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '10px',
              background: 'var(--theme-bg)',
              border: `1px solid ${isPrimary ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
              marginBottom: '8px',
            }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                background: line.health === 'green' || line.status === 'active'
                  ? 'var(--theme-success)'
                  : line.health === 'yellow' ? '#f59e0b' : 'var(--theme-error)',
              }} />

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
                  {line.number || line.phoneNumber}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                  {line.label || line.area || line.friendlyName || 'Unlabeled'}
                  {isPrimary && <span style={{ marginLeft: '8px', color: 'var(--theme-accent)', fontWeight: 600 }}>★ Primary</span>}
                </div>
              </div>

              {!isPrimary && (
                <button
                  onClick={() => handleSetPrimary(line.id)}
                  disabled={switching === line.id}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                    border: '1px solid var(--theme-accent)',
                    background: 'var(--theme-accent-muted)',
                    color: 'var(--theme-accent)',
                    cursor: 'pointer', opacity: switching === line.id ? 0.5 : 1,
                  }}
                >
                  {switching === line.id ? '...' : 'Set Primary'}
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

const cardStyle = {
  padding: '24px', borderRadius: '12px',
  background: 'var(--theme-surface)',
  border: '1px solid var(--theme-border)',
  marginBottom: '16px',
}
const sectionTitle = {
  margin: '0 0 16px', fontSize: '15px', fontWeight: 600,
  color: 'var(--theme-text-primary)',
}
const emptyState = {
  padding: '24px', textAlign: 'center', borderRadius: '8px',
  border: '1px dashed var(--theme-border)',
  color: 'var(--theme-text-secondary)', fontSize: '12px',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
}
const refreshBtn = {
  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
  border: '1px solid var(--theme-border)', background: 'transparent',
  color: 'var(--theme-text-secondary)', cursor: 'pointer',
}
