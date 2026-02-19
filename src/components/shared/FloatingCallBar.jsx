// ========================================
// Floating Call Bar — Phase 1 Power Dialer
// 56px fixed-bottom bar during active calls
// Transforms to disposition prompt after call ends
// ========================================
import { useState, useEffect, useRef } from 'react'
import { usePhone } from '../../context/PhoneContext'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

export default function FloatingCallBar() {
  const {
    callState, callMeta, callDuration,
    isMuted, isOnHold,
    endCall, toggleMute, toggleHold,
    showDisposition, applyDisposition, dismissCall,
    DISPOSITIONS,
  } = usePhone()

  const [dispoNotes, setDispoNotes] = useState('')
  const [autoSkipSeconds, setAutoSkipSeconds] = useState(30)
  const autoSkipRef = useRef(null)

  // Auto-skip disposition after 30s
  useEffect(() => {
    if (showDisposition) {
      setAutoSkipSeconds(30)
      autoSkipRef.current = setInterval(() => {
        setAutoSkipSeconds(prev => {
          if (prev <= 1) {
            clearInterval(autoSkipRef.current)
            applyDisposition('called', '')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (autoSkipRef.current) clearInterval(autoSkipRef.current) }
  }, [showDisposition, applyDisposition])

  // Don't render if idle and not showing disposition
  if (callState === 'idle' && !showDisposition) return null

  // ── Disposition View ──
  if (showDisposition) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(9,9,11,0.99) 100%)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(74,222,128,0.3)',
        padding: '12px 16px',
        transition: 'all 200ms ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4ade80' }}>✅</span>
            <span style={{ color: '#e4e4e7', fontSize: '13px', fontWeight: 600 }}>
              Call ended · {callMeta?.leadName || 'Unknown'} · ⏱ {formatDuration(callDuration)}
            </span>
          </div>
          <button
            onClick={() => { applyDisposition('called', '') }}
            style={{
              padding: '4px 12px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#71717a',
              fontSize: '11px', cursor: 'pointer',
            }}
          >
            Skip · {autoSkipSeconds}s
          </button>
        </div>

        {/* Disposition Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '6px', marginBottom: '8px',
        }}>
          {DISPOSITIONS.map(d => (
            <button
              key={d.id}
              onClick={() => applyDisposition(d.id, dispoNotes)}
              style={{
                padding: '6px 8px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e4e4e7', fontSize: '11px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'background 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              <span>{d.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            </button>
          ))}
        </div>

        {/* Notes input */}
        <input
          type="text"
          placeholder="Notes (optional)..."
          value={dispoNotes}
          onChange={e => setDispoNotes(e.target.value)}
          style={{
            width: '100%', padding: '6px 10px', borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: '#e4e4e7', fontSize: '12px', outline: 'none',
          }}
          onKeyDown={e => { if (e.key === 'Enter' && dispoNotes) applyDisposition('called', dispoNotes) }}
        />
      </div>
    )
  }

  // ── Active Call Bar ──
  const isConnecting = callState === 'connecting' || callState === 'ringing'
  const isActive = callState === 'active'
  const isEnded = callState === 'ended'

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      height: '56px',
      background: 'rgba(24,24,27,0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${isActive ? 'rgba(74,222,128,0.4)' : isConnecting ? 'rgba(245,158,11,0.4)' : 'rgba(113,113,122,0.3)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      transition: 'transform 200ms ease',
      transform: 'translateY(0)',
    }}>
      {/* Left: Status + Lead Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Pulsing dot */}
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: isActive ? '#4ade80' : isConnecting ? '#f59e0b' : '#71717a',
          boxShadow: isActive ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
          animation: (isActive || isConnecting) ? 'callPulse 2s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />

        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#e4e4e7', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {callMeta?.leadName || 'Unknown'} · {formatPhone(callMeta?.phone)}
          </div>
          <div style={{ color: '#71717a', fontSize: '11px' }}>
            {isConnecting ? 'Connecting...' : isOnHold ? '⏸ On Hold' : isActive ? 'Connected' : 'Call Ended'}
            {callMeta?.fromDisplay ? ` · via ${callMeta.fromDisplay}` : ''}
          </div>
        </div>
      </div>

      {/* Center: Timer */}
      <div style={{
        color: 'var(--theme-accent, #00d4ff)', fontSize: '18px', fontWeight: 300,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '1px',
      }}>
        ⏱ {formatDuration(callDuration)}
      </div>

      {/* Right: Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {!isEnded && (
          <>
            {/* Mute */}
            <button
              onClick={toggleMute}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: isMuted ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
                background: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                color: isMuted ? '#ef4444' : '#e4e4e7',
                fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Hold */}
            <button
              onClick={toggleHold}
              disabled={!isActive}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: isOnHold ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                background: isOnHold ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                color: isOnHold ? '#f59e0b' : '#e4e4e7',
                fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: !isActive ? 0.4 : 1,
              }}
              title={isOnHold ? 'Resume' : 'Hold'}
            >
              {isOnHold ? '▶️' : '⏸️'}
            </button>

            {/* End */}
            <button
              onClick={endCall}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '2px solid #ef4444',
                background: 'rgba(239,68,68,0.2)',
                color: '#ef4444', fontSize: '16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="End Call"
            >
              🔴
            </button>
          </>
        )}

        {isEnded && (
          <button
            onClick={dismissCall}
            style={{
              padding: '6px 12px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: '#a1a1aa', fontSize: '12px', cursor: 'pointer',
            }}
          >
            ✕ Dismiss
          </button>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes callPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
