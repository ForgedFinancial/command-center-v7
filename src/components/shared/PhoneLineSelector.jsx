// ========================================
// Phone Line Selector — Dropdown for switching active line
// ========================================
import { useState, useRef, useEffect } from 'react'
import { usePhone } from '../../context/PhoneContext'

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

export default function PhoneLineSelector({ compact = false }) {
  const { lines, activeLine, setActiveLine, twilioConfigured } = usePhone()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (lines.length <= 1 && !twilioConfigured) return null

  const currentLine = activeLine || lines[0]
  const icon = currentLine?.type === 'iphone' ? '📱' : '💼'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: compact ? '4px 8px' : '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--theme-text-primary)', fontSize: compact ? '11px' : '12px',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <span>{icon}</span>
        <span style={{ fontWeight: 600 }}>{currentLine?.label || 'Select Line'}</span>
        {!compact && (
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12px' }}>
            {formatPhone(currentLine?.number)}
          </span>
        )}
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: currentLine?.is_active ? '#4ade80' : '#71717a',
        }} />
        <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          minWidth: '260px', padding: '6px',
          background: 'var(--theme-surface)', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}>
          {lines.map(line => {
            const isActive = activeLine?.id === line.id
            const lineIcon = line.type === 'iphone' ? '📱' : '💼'
            return (
              <div
                key={line.id}
                onClick={() => { setActiveLine(line); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: isActive ? 'var(--theme-accent-muted)' : 'transparent',
                  border: isActive ? '1px solid var(--theme-accent)' : '1px solid transparent',
                  marginBottom: '2px',
                }}
              >
                <span style={{ fontSize: '16px' }}>{lineIcon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
                    {line.label}
                    {line.is_primary ? (
                      <span style={{ fontSize: '9px', color: 'var(--theme-accent)', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRIMARY</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
                    {formatPhone(line.number)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>
                    {line.type === 'iphone' ? 'iPhone / iMessage / FaceTime' : 'Twilio / SMS / Voice'}
                  </div>
                </div>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: line.is_active ? '#4ade80' : '#71717a',
                }} />
              </div>
            )
          })}

          {!twilioConfigured && (
            <div style={{
              padding: '10px 12px', fontSize: '11px', color: 'var(--theme-text-secondary)',
              borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', paddingTop: '10px',
            }}>
              💡 Add Twilio credentials in Settings → Phone Lines to enable work numbers
            </div>
          )}
        </div>
      )}
    </div>
  )
}
