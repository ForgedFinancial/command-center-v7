// ========================================
// Call Controls — In-call UI (mute, hold, end, dial pad)
// ========================================
import { useState } from 'react'
import { usePhone } from '../../context/PhoneContext'
import twilioClient from '../../services/twilioClient'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CallControls({ contactName, contactNumber, onEnd }) {
  const { callState, callDuration, isMuted, toggleMute, isOnHold, toggleHold, activeCall } = usePhone()
  const [showDtmf, setShowDtmf] = useState(false)

  if (callState === 'idle') return null

  const handleMute = () => toggleMute()

  const handleHold = async () => toggleHold()

  const handleEnd = () => {
    setIsOnHold(false)
    if (activeCall) {
      activeCall.disconnect()
    }
    if (onEnd) onEnd()
  }

  const sendDtmf = (digit) => {
    if (activeCall && activeCall.sendDigits) {
      activeCall.sendDigits(digit)
    }
  }

  const dtmfKeys = ['1','2','3','4','5','6','7','8','9','*','0','#']
  const stateLabel = { dialing: 'Dialing...', ringing: 'Ringing...', active: 'Connected', ended: 'Call Ended' }

  return (
    <div>
    <style>{`
      @keyframes holdPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.3); }
        50% { box-shadow: 0 0 12px 4px rgba(245,158,11,0.2); }
      }
    `}</style>
    <div style={{
      padding: '20px', borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(168,85,247,0.06))',
      border: '1px solid rgba(0,212,255,0.2)',
      textAlign: 'center',
    }}>
      {/* Contact info */}
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#e4e4e7', marginBottom: '4px' }}>
        📞 {contactName || 'Unknown'}
      </div>
      <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>
        {contactNumber || ''}
      </div>

      {/* Status + timer */}
      <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '4px' }}>
        {stateLabel[callState] || callState}
      </div>
      {(callState === 'active' || callState === 'ended') && (
        <div style={{ fontSize: '24px', fontWeight: 300, color: 'var(--theme-accent)', marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
          ⏱ {formatDuration(callDuration)}
        </div>
      )}

      {/* Controls */}
      {callState !== 'ended' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={handleMute}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: isMuted ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
              background: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
              color: isMuted ? '#ef4444' : '#e4e4e7',
              fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            onClick={handleHold}
            disabled={callState !== 'active'}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: isOnHold ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
              background: isOnHold ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
              color: isOnHold ? '#f59e0b' : '#e4e4e7',
              fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isOnHold ? 'holdPulse 2s ease-in-out infinite' : 'none',
              opacity: callState !== 'active' ? 0.4 : 1,
            }}
            title={isOnHold ? 'Resume' : 'Hold'}
          >
            {isOnHold ? '▶️' : '⏸️'}
          </button>

          <button
            onClick={() => setShowDtmf(!showDtmf)}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.15)',
              background: showDtmf ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.06)',
              color: '#e4e4e7', fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Dial Pad"
          >
            ⌨️
          </button>

          <button
            onClick={handleEnd}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '2px solid #ef4444',
              background: 'rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="End Call"
          >
            📵
          </button>
        </div>
      )}

      {/* DTMF pad */}
      {showDtmf && callState !== 'ended' && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 48px)',
          gap: '6px', justifyContent: 'center', marginTop: '8px',
        }}>
          {dtmfKeys.map(key => (
            <button
              key={key}
              onClick={() => sendDtmf(key)}
              style={{
                width: '48px', height: '40px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                color: '#e4e4e7', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* End state */}
      {callState === 'ended' && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={onEnd}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: '#a1a1aa', fontSize: '12px', cursor: 'pointer',
            }}
          >
            ✕ Dismiss
          </button>
        </div>
      )}
    </div>
    </div>
  )
}
