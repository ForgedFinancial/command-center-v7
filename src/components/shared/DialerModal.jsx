// ========================================
// Draggable Dialer Modal — Power Dialer UI
// Opens/minimizes, draggable anywhere on screen
// ========================================
import { useState, useRef, useCallback, useEffect } from 'react'
import { usePhone } from '../../context/PhoneContext'

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

function formatDuration(s) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

const DIAL_KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#']

export default function DialerModal() {
  const {
    callState, callMeta, callDuration,
    isMuted, isOnHold,
    makeCall, endCall, toggleMute, toggleHold,
    lines, activeLine, setActiveLine,
    twilioConfigured,
  } = usePhone()

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [dialInput, setDialInput] = useState('')
  const [recentCalls, setRecentCalls] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cc7-recent-dials') || '[]') } catch { return [] }
  })
  const [activeTab, setActiveTab] = useState('dialpad') // dialpad | recent | lines

  // Drag state — shared across all three states (closed button, minimized, expanded)
  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cc7-dialer-pos'))
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved
    } catch {}
    return { x: window.innerWidth - 76, y: window.innerHeight - 76 }
  })
  const dragRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const didDrag = useRef(false)

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button:not([data-drag-handle])') || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
    isDragging.current = true
    didDrag.current = false
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    document.body.style.userSelect = 'none'
  }, [pos])

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return
      didDrag.current = true
      const x = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.current.x))
      const y = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.current.y))
      setPos({ x, y })
    }
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.userSelect = ''
        // Persist position
        setPos(p => { localStorage.setItem('cc7-dialer-pos', JSON.stringify(p)); return p })
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // Auto-open when call starts
  useEffect(() => {
    if (callState === 'connecting' || callState === 'ringing') {
      setIsOpen(true)
      setIsMinimized(false)
    }
  }, [callState])

  const handleDial = useCallback(() => {
    if (!dialInput.trim()) return
    const digits = dialInput.replace(/\D/g, '')
    if (digits.length < 10) return
    makeCall(digits, { leadName: formatPhone(digits) })
    // Save to recent
    const updated = [{ number: digits, time: Date.now() }, ...recentCalls.filter(r => r.number !== digits)].slice(0, 20)
    setRecentCalls(updated)
    localStorage.setItem('cc7-recent-dials', JSON.stringify(updated))
  }, [dialInput, makeCall, recentCalls])

  const handleKeyPress = useCallback((key) => {
    setDialInput(prev => prev + key)
  }, [])

  const isInCall = callState !== 'idle'

  // ── Floating Toggle Button (always visible, draggable) ──
  if (!isOpen) {
    return (
      <div
        data-drag-handle="true"
        onMouseDown={onMouseDown}
        onClick={() => { if (!didDrag.current) { setIsOpen(true); setIsMinimized(false) } }}
        style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 9998,
          width: '56px', height: '56px', borderRadius: '50%',
          background: isInCall ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none', color: '#fff', fontSize: '24px',
          cursor: 'grab', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: isInCall ? 'dialerPulse 2s ease-in-out infinite' : 'none',
          transition: isDragging.current ? 'none' : 'transform 150ms ease',
        }}
        onMouseOver={e => { if (!isDragging.current) e.currentTarget.style.transform = 'scale(1.1)' }}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Open Dialer (drag to move)"
      >
        📞
        {isInCall && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: '#4ade80', border: '2px solid #0a0e1a',
          }} />
        )}
      </div>
    )
  }

  // ── Minimized State ──
  if (isMinimized) {
    return (
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
          width: '280px', height: '48px', borderRadius: '12px',
          background: 'rgba(24,24,27,0.95)', backdropFilter: 'blur(16px)',
          border: `1px solid ${isInCall ? 'rgba(74,222,128,0.4)' : 'rgba(59,130,246,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', cursor: 'grab', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isInCall && <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80',
            animation: 'dialerPulse 2s ease-in-out infinite',
          }} />}
          <span style={{ color: '#e4e4e7', fontSize: '12px', fontWeight: 600 }}>
            {isInCall ? `${callMeta?.leadName || 'Call'} · ${formatDuration(callDuration)}` : '📞 Dialer'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setIsMinimized(false)} style={miniBtn} title="Expand">⬆</button>
          <button onClick={() => setIsOpen(false)} style={miniBtn} title="Close">✕</button>
        </div>
      </div>
    )
  }

  // ── Full Dialer Modal ──
  return (
    <div
      ref={dragRef}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
        width: '360px', borderRadius: '16px',
        background: 'rgba(15,15,20,0.97)', backdropFilter: 'blur(20px)',
        border: `1px solid ${isInCall ? 'rgba(74,222,128,0.3)' : 'rgba(59,130,246,0.2)'}`,
        boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {/* Title Bar — Draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', cursor: 'grab',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📞</span>
          <span style={{ color: '#e4e4e7', fontSize: '13px', fontWeight: 600 }}>Power Dialer</span>
          {!twilioConfigured && <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Not Configured</span>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setIsMinimized(true)} style={miniBtn} title="Minimize">─</button>
          <button onClick={() => setIsOpen(false)} style={miniBtn} title="Close">✕</button>
        </div>
      </div>

      {/* Active Call Display */}
      {isInCall && (
        <div style={{
          padding: '12px 14px',
          background: callState === 'active' ? 'rgba(74,222,128,0.06)' : 'rgba(245,158,11,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#e4e4e7', fontSize: '14px', fontWeight: 600 }}>{callMeta?.leadName || 'Unknown'}</div>
              <div style={{ color: '#a1a1aa', fontSize: '11px' }}>{formatPhone(callMeta?.phone)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                color: callState === 'active' ? '#4ade80' : '#f59e0b',
                fontSize: '18px', fontWeight: 300, fontVariantNumeric: 'tabular-nums',
              }}>
                {formatDuration(callDuration)}
              </div>
              <div style={{ color: '#71717a', fontSize: '10px', textTransform: 'uppercase' }}>
                {callState === 'connecting' ? 'Connecting...' : callState === 'ringing' ? 'Ringing...' : callState === 'active' ? (isOnHold ? 'On Hold' : 'Connected') : callState}
              </div>
            </div>
          </div>

          {/* In-call controls */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
            <CallCtrlBtn active={isMuted} color="#ef4444" icon={isMuted ? '🔇' : '🔊'} label={isMuted ? 'Unmute' : 'Mute'} onClick={toggleMute} />
            <CallCtrlBtn active={isOnHold} color="#f59e0b" icon={isOnHold ? '▶️' : '⏸️'} label={isOnHold ? 'Resume' : 'Hold'} onClick={toggleHold} disabled={callState !== 'active'} />
            <CallCtrlBtn active={true} color="#ef4444" icon="🔴" label="End" onClick={endCall} />
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'dialpad', label: '⌨️ Dialpad' },
          { id: 'recent', label: '🕐 Recent' },
          { id: 'lines', label: '📱 Lines' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 0', fontSize: '11px', fontWeight: 600,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? '#00d4ff' : '#71717a',
              borderBottom: activeTab === tab.id ? '2px solid #00d4ff' : '2px solid transparent',
              transition: 'color 150ms',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '12px 14px', maxHeight: '400px', overflowY: 'auto' }}>

        {/* Dialpad Tab */}
        {activeTab === 'dialpad' && (
          <>
            {/* Number Input */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <input
                value={dialInput}
                onChange={e => setDialInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDial()}
                placeholder="Enter phone number..."
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#e4e4e7', fontSize: '16px', fontWeight: 300,
                  letterSpacing: '1px', outline: 'none', fontVariantNumeric: 'tabular-nums',
                }}
              />
              {dialInput && (
                <button onClick={() => setDialInput('')} style={{
                  padding: '0 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#71717a', fontSize: '16px', cursor: 'pointer',
                }}>⌫</button>
              )}
            </div>

            {/* Keypad Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px', marginBottom: '12px',
            }}>
              {DIAL_KEYS.map(key => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  style={{
                    padding: '14px 0', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e4e4e7', fontSize: '20px', fontWeight: 300,
                    cursor: 'pointer', transition: 'all 100ms ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Call Button */}
            <button
              onClick={handleDial}
              disabled={!dialInput.trim() || isInCall}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                border: 'none', fontWeight: 600, fontSize: '14px',
                cursor: dialInput.trim() && !isInCall ? 'pointer' : 'not-allowed',
                background: dialInput.trim() && !isInCall
                  ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                  : 'rgba(255,255,255,0.06)',
                color: dialInput.trim() && !isInCall ? '#000' : '#52525b',
                transition: 'all 150ms ease',
              }}
            >
              📞 {isInCall ? 'In Call' : 'Call'}
            </button>
          </>
        )}

        {/* Recent Tab */}
        {activeTab === 'recent' && (
          <div>
            {recentCalls.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#52525b', fontSize: '12px', padding: '20px 0' }}>No recent calls</div>
            ) : recentCalls.map((call, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div>
                  <div style={{ color: '#e4e4e7', fontSize: '13px' }}>{formatPhone(call.number)}</div>
                  <div style={{ color: '#52525b', fontSize: '10px' }}>{new Date(call.time).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => { setDialInput(call.number); setActiveTab('dialpad') }}
                  style={{
                    padding: '4px 10px', borderRadius: '6px',
                    border: '1px solid rgba(74,222,128,0.3)',
                    background: 'rgba(74,222,128,0.1)',
                    color: '#4ade80', fontSize: '11px', cursor: 'pointer',
                  }}
                >
                  📞 Redial
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Lines Tab */}
        {activeTab === 'lines' && (
          <div>
            {lines.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#52525b', fontSize: '12px', padding: '20px 0' }}>No phone lines configured</div>
            ) : lines.map(line => (
              <div
                key={line.id || line.number}
                onClick={() => setActiveLine(line)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 8px', borderRadius: '8px', marginBottom: '4px', cursor: 'pointer',
                  background: activeLine?.number === line.number ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: activeLine?.number === line.number ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                  transition: 'all 150ms ease',
                }}
              >
                <div>
                  <div style={{ color: '#e4e4e7', fontSize: '13px', fontWeight: 600 }}>{line.label || formatPhone(line.number)}</div>
                  <div style={{ color: '#71717a', fontSize: '10px' }}>{line.type === 'twilio' ? 'Twilio' : 'iPhone'} · {line.state || 'All States'}</div>
                </div>
                {activeLine?.number === line.number && (
                  <span style={{ color: '#00d4ff', fontSize: '11px', fontWeight: 600 }}>Active ✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Line selector at bottom */}
      {activeLine && (
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#52525b', fontSize: '10px' }}>Calling from:</span>
          <span style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>{activeLine.label || formatPhone(activeLine.number)}</span>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes dialerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

// Small control button style
const miniBtn = {
  width: '24px', height: '24px', borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#71717a', fontSize: '12px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// In-call control button
function CallCtrlBtn({ active, color, icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        padding: '8px 16px', borderRadius: '10px',
        border: active ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.08)',
        background: active ? `${color}15` : 'rgba(255,255,255,0.04)',
        color: active ? color : '#a1a1aa',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 150ms ease',
        fontSize: '18px',
      }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: '9px', fontWeight: 600 }}>{label}</span>
    </button>
  )
}
