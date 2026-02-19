// ========================================
// Ringing System — Ring tones, incoming call banner, DND
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePhone } from '../../../../context/PhoneContext'

const RING_TONES = [
  { id: 'classic', name: 'Classic', freq: [440, 480], pattern: [2000, 4000] },
  { id: 'digital', name: 'Digital', freq: [523, 659], pattern: [500, 500, 500, 1500] },
  { id: 'gentle', name: 'Gentle', freq: [392, 440], pattern: [1000, 2000] },
  { id: 'urgent', name: 'Urgent', freq: [587, 698], pattern: [300, 200, 300, 200, 300, 1700] },
  { id: 'pulse', name: 'Pulse', freq: [494, 554], pattern: [150, 150, 150, 150, 150, 2250] },
]

const LS_RING_KEY = 'forgedos_ring_prefs'
function loadRingPrefs() {
  try { return JSON.parse(localStorage.getItem(LS_RING_KEY)) || {} } catch { return {} }
}

export function useRinging() {
  const [prefs, setPrefs] = useState(loadRingPrefs)
  const audioCtxRef = useRef(null)
  const ringIntervalRef = useRef(null)

  const dnd = prefs.dnd || false
  const ringTone = prefs.ringTone || 'classic'
  const ringVolume = prefs.ringVolume ?? 0.5

  const savePrefs = (next) => {
    setPrefs(next)
    localStorage.setItem(LS_RING_KEY, JSON.stringify(next))
  }

  const setDND = (val) => savePrefs({ ...prefs, dnd: val })
  const setRingTone = (id) => savePrefs({ ...prefs, ringTone: id })
  const setRingVolume = (v) => savePrefs({ ...prefs, ringVolume: v })

  const startRing = useCallback((toneId) => {
    if (dnd) return
    stopRing()
    const tone = RING_TONES.find(t => t.id === (toneId || ringTone)) || RING_TONES[0]
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    const playBurst = () => {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()
      osc1.frequency.value = tone.freq[0]
      osc2.frequency.value = tone.freq[1]
      gain.gain.value = ringVolume * 0.3
      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)
      osc1.start()
      osc2.start()
      setTimeout(() => { osc1.stop(); osc2.stop(); osc1.disconnect(); osc2.disconnect(); gain.disconnect() }, tone.pattern[0])
    }

    playBurst()
    const totalCycle = tone.pattern.reduce((a, b) => a + b, 0)
    ringIntervalRef.current = setInterval(playBurst, totalCycle)
  }, [dnd, ringTone, ringVolume])

  const stopRing = useCallback(() => {
    if (ringIntervalRef.current) { clearInterval(ringIntervalRef.current); ringIntervalRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
  }, [])

  // Cleanup
  useEffect(() => () => stopRing(), [stopRing])

  return { dnd, setDND, ringTone, setRingTone, ringVolume, setRingVolume, startRing, stopRing, RING_TONES }
}

// Incoming call banner
export function IncomingCallBanner() {
  const { callState, callMeta, acceptCall, rejectCall } = usePhone()

  if (callState !== 'ringing' || !callMeta) return null

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
      width: '340px', padding: '16px 20px', borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(0,212,255,0.1))',
      border: '1px solid rgba(74,222,128,0.3)',
      backdropFilter: 'blur(20px)',
      animation: 'slideIn 0.3s ease-out',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px',
          animation: 'pulse 1s infinite',
        }}>
          📞
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>
            Incoming Call
          </div>
          <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
            {callMeta.leadName || callMeta.phone || 'Unknown'}
          </div>
          {callMeta.phone && callMeta.leadName !== callMeta.phone && (
            <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{callMeta.phone}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={acceptCall} style={{
          flex: 1, padding: '10px', borderRadius: '10px',
          border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.2)',
          color: '#4ade80', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>
          ✓ Accept
        </button>
        <button onClick={rejectCall} style={{
          flex: 1, padding: '10px', borderRadius: '10px',
          border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>
          ✕ Decline
        </button>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
    </div>
  )
}

// Ring settings panel for Settings tab
export function RingSettings() {
  const { dnd, setDND, ringTone, setRingTone, ringVolume, setRingVolume, startRing, stopRing, RING_TONES: tones } = useRinging()

  const previewTone = (id) => {
    startRing(id)
    setTimeout(stopRing, 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>🔔 Ringing</h4>

      {/* DND Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#a1a1aa' }}>🔇 Do Not Disturb</span>
        <button onClick={() => setDND(!dnd)} style={{
          width: '44px', height: '24px', borderRadius: '12px', border: 'none',
          background: dnd ? '#ef4444' : 'rgba(255,255,255,0.1)',
          cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
        }}>
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
            position: 'absolute', top: '3px', transition: 'all 0.2s',
            left: dnd ? '23px' : '3px',
          }} />
        </button>
      </div>

      {/* Ring volume */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>
          Ring Volume: {Math.round(ringVolume * 100)}%
        </label>
        <input type="range" min="0" max="1" step="0.05" value={ringVolume}
          onChange={e => setRingVolume(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#00d4ff' }}
        />
      </div>

      {/* Tone selection */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>
          Ring Tone
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tones.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: '8px',
              background: ringTone === t.id ? 'rgba(0,212,255,0.08)' : 'transparent',
              border: `1px solid ${ringTone === t.id ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
              cursor: 'pointer',
            }} onClick={() => setRingTone(t.id)}>
              <span style={{ fontSize: '12px', color: ringTone === t.id ? '#00d4ff' : '#a1a1aa', fontWeight: ringTone === t.id ? 600 : 400 }}>
                {ringTone === t.id ? '● ' : '○ '}{t.name}
              </span>
              <button onClick={(e) => { e.stopPropagation(); previewTone(t.id) }} style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: '#71717a', cursor: 'pointer',
              }}>
                ▶ Preview
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
