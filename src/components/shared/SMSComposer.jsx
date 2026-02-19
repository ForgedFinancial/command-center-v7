// ========================================
// SMS Composer — Send SMS form with character count
// ========================================
import { useState, useRef, useEffect } from 'react'
import twilioClient from '../../services/twilioClient'
import { usePhone } from '../../context/PhoneContext'

export default function SMSComposer({ defaultTo = '', contactId = null, onSent, onClose }) {
  const { twilioConfigured, activeLine } = usePhone()
  const [to, setTo] = useState(defaultTo)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const charCount = body.length
  const segments = Math.ceil(charCount / 160) || 0

  const handleSend = async () => {
    if (!to || !body.trim()) return
    if (!twilioConfigured) {
      setError('Twilio not configured — add credentials in Settings → Phone Lines')
      return
    }

    setSending(true)
    setError(null)
    try {
      await twilioClient.sendSMS(to, body.trim(), contactId)
      setSuccess(true)
      setBody('')
      if (onSent) onSent()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isIphone = !activeLine || activeLine.type === 'iphone'

  return (
    <div style={{
      padding: '16px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {isIphone && !twilioConfigured && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          color: '#f59e0b', fontSize: '11px',
        }}>
          📱 iPhone is active line — SMS sends via iMessage. Switch to Twilio line for SMS from work number.
        </div>
      )}

      {!twilioConfigured && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
          background: 'rgba(113,113,122,0.1)', border: '1px solid rgba(113,113,122,0.2)',
          color: '#71717a', fontSize: '11px',
        }}>
          💡 Twilio not connected — Add your credentials in Settings → Phone Lines
        </div>
      )}

      {/* To field */}
      {!defaultTo && (
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#71717a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>To</label>
          <input
            ref={inputRef}
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Phone number"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: '#f59e0b', fontSize: '13px', fontWeight: 700, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Message body */}
      <textarea
        ref={defaultTo ? inputRef : undefined}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        rows={3}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
          color: '#e4e4e7', fontSize: '13px', outline: 'none', resize: 'vertical',
          minHeight: '60px', boxSizing: 'border-box',
        }}
      />

      {/* Footer: char count + send */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <div style={{ fontSize: '10px', color: '#52525b' }}>
          {charCount}/160 · {segments} segment{segments !== 1 ? 's' : ''}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {error && <span style={{ fontSize: '11px', color: '#ef4444' }}>⚠️ {error}</span>}
          {success && <span style={{ fontSize: '11px', color: '#4ade80' }}>✅ Sent!</span>}

          {onClose && (
            <button onClick={onClose} style={{
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: '#71717a', fontSize: '12px', cursor: 'pointer',
            }}>Cancel</button>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !to || !body.trim()}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid var(--theme-accent)',
              background: (to && body.trim()) ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
              color: (to && body.trim()) ? 'var(--theme-accent)' : '#52525b',
              fontSize: '12px', fontWeight: 600, cursor: (to && body.trim()) ? 'pointer' : 'default',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending...' : '📤 Send SMS'}
          </button>
        </div>
      </div>
    </div>
  )
}
