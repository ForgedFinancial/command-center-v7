// ========================================
// Power Dialer — 4-Phase Auto-Dial Session
// Built by Mason (FF-BLD-001) — 2026-02-20
// ========================================
import { useState, useCallback, useEffect, useRef } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'
import { usePhone } from '../../../../context/PhoneContext'

const DISPOSITIONS = [
  { key: 'contacted', label: 'Contacted', icon: '✅', color: '#22c55e' },
  { key: 'no-answer', label: 'No Answer', icon: '📵', color: '#f59e0b' },
  { key: 'voicemail', label: 'Voicemail', icon: '📧', color: '#8b5cf6' },
  { key: 'callback', label: 'Callback', icon: '🔄', color: '#3b82f6' },
  { key: 'dnc', label: 'DNC', icon: '🚫', color: '#ef4444' },
  { key: 'not-interested', label: 'Not Interested', icon: '👎', color: '#6b7280' },
]

const api = (path, opts = {}) => fetch(`${WORKER_PROXY_URL}${path}`, { headers: getSyncHeaders(), ...opts })

export default function PowerDialerView() {
  const { makeCall } = usePhone()
  const [phase, setPhase] = useState('load')  // load | active | disposition | summary
  const [session, setSession] = useState(null)
  const [currentLead, setCurrentLead] = useState(null)
  const [callTimer, setCallTimer] = useState(0)
  const [notes, setNotes] = useState('')
  const [leadSources, setLeadSources] = useState([])
  const [selectedSource, setSelectedSource] = useState('')
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  // Fetch lead sources
  useEffect(() => {
    api('/api/settings/lead-sources').then(r => r.json()).then(d => {
      setLeadSources(d.sources || d.data || [])
    }).catch(() => {})
  }, [])

  const startSession = useCallback(async () => {
    if (!leads.length) return
    setLoading(true)
    try {
      const res = await api('/api/twilio/dialer/session', {
        method: 'POST',
        body: JSON.stringify({ leadListId: selectedSource, agentId: 'dano', leads })
      })
      const data = await res.json()
      if (data.session) {
        setSession(data.session)
        setCurrentLead(data.session.leads[0] || null)
        setPhase('active')
      }
    } catch {}
    setLoading(false)
  }, [leads, selectedSource])

  const startCall = useCallback(() => {
    if (!currentLead?.phone) return
    try { makeCall(currentLead.phone) } catch {}
    setCallTimer(0)
    timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000)
  }, [currentLead, makeCall])

  const endCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('disposition')
  }, [])

  const submitDisposition = useCallback(async (disposition) => {
    if (!session) return
    try {
      const res = await api(`/api/twilio/dialer/session/${session.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'disposition', disposition, notes })
      })
      const data = await res.json()
      if (data.session) {
        setSession(data.session)
        setNotes('')
        if (data.session.status === 'ended') {
          setPhase('summary')
        } else {
          setCurrentLead(data.session.leads[data.session.currentIndex] || null)
          setPhase('active')
          setCallTimer(0)
        }
      }
    } catch {}
  }, [session, notes])

  const pauseSession = useCallback(async () => {
    if (!session) return
    await api(`/api/twilio/dialer/session/${session.id}`, {
      method: 'PATCH', body: JSON.stringify({ action: 'pause' })
    })
    setSession(s => ({ ...s, status: 'paused' }))
  }, [session])

  const resumeSession = useCallback(async () => {
    if (!session) return
    await api(`/api/twilio/dialer/session/${session.id}`, {
      method: 'PATCH', body: JSON.stringify({ action: 'resume' })
    })
    setSession(s => ({ ...s, status: 'active' }))
  }, [session])

  const endSession = useCallback(async () => {
    if (!session) return
    if (timerRef.current) clearInterval(timerRef.current)
    await api(`/api/twilio/dialer/session/${session.id}`, {
      method: 'PATCH', body: JSON.stringify({ action: 'end' })
    })
    setPhase('summary')
  }, [session])

  const resetSession = () => {
    setSession(null)
    setCurrentLead(null)
    setPhase('load')
    setCallTimer(0)
    setNotes('')
    setLeads([])
  }

  const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  // === PHASE 1: Load List ===
  if (phase === 'load') {
    return (
      <div style={{ padding: 24 }}>
        <h3 style={{ color: '#f59e0b', marginBottom: 16 }}>⚡ Power Dialer</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#9ca3af', fontSize: 13 }}>Lead Source</label>
          <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, background: '#1a1a2e', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>
            <option value="">Select a lead source...</option>
            {leadSources.map(s => <option key={s.id || s.name} value={s.id || s.name}>{s.name} ({s.count || '?'} leads)</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16, color: '#9ca3af', fontSize: 13 }}>
          {leads.length > 0 ? `${leads.length} leads loaded` : 'Select a source or paste leads below'}
        </div>
        <textarea placeholder="Or paste leads (name, phone per line)" rows={5}
          style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #333', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}
          onChange={e => {
            const lines = e.target.value.split('\n').filter(l => l.trim())
            setLeads(lines.map((l, i) => {
              const parts = l.split(',').map(p => p.trim())
              return { name: parts[0] || `Lead ${i+1}`, phone: parts[1] || parts[0] }
            }))
          }}
        />
        <button onClick={startSession} disabled={!leads.length || loading}
          style={{ marginTop: 16, padding: '10px 24px', background: leads.length ? '#f59e0b' : '#333', color: '#000', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: leads.length ? 'pointer' : 'default' }}>
          {loading ? 'Starting...' : `Start Dialing Session (${leads.length} leads)`}
        </button>
      </div>
    )
  }

  // === PHASE 2: Active Call ===
  if (phase === 'active') {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#f59e0b', margin: 0 }}>⚡ Active Session</h3>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>{session?.currentIndex + 1} / {session?.leads?.length || 0}</span>
        </div>
        <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 10, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>{currentLead?.name || 'Unknown'}</div>
          <div style={{ fontSize: 16, color: '#9ca3af', marginTop: 4 }}>{currentLead?.phone || '—'}</div>
          <div style={{ fontSize: 28, color: '#f59e0b', marginTop: 12, fontFamily: 'monospace' }}>{fmtTime(callTimer)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {callTimer === 0 && (
            <button onClick={startCall} style={{ padding: '10px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>📞 Call</button>
          )}
          {callTimer > 0 && (
            <button onClick={endCall} style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>End Call</button>
          )}
          {session?.status === 'active' ? (
            <button onClick={pauseSession} style={{ padding: '10px 24px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>⏸ Pause</button>
          ) : (
            <button onClick={resumeSession} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>▶ Resume</button>
          )}
          <button onClick={endSession} style={{ padding: '10px 24px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>End Session</button>
        </div>
      </div>
    )
  }

  // === PHASE 3: Disposition ===
  if (phase === 'disposition') {
    return (
      <div style={{ padding: 24 }}>
        <h3 style={{ color: '#f59e0b', marginBottom: 16 }}>Disposition — {currentLead?.name || 'Lead'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {DISPOSITIONS.map(d => (
            <button key={d.key} onClick={() => submitDisposition(d.key)}
              style={{ padding: 14, background: '#1a1a2e', color: '#fff', border: `2px solid ${d.color}`, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              {d.icon} {d.label}
            </button>
          ))}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
          style={{ width: '100%', padding: 8, background: '#1a1a2e', color: '#fff', border: '1px solid #333', borderRadius: 6, marginBottom: 8 }} rows={3} />
      </div>
    )
  }

  // === PHASE 4: Summary ===
  if (phase === 'summary') {
    const s = session?.stats || {}
    return (
      <div style={{ padding: 24 }}>
        <h3 style={{ color: '#f59e0b', marginBottom: 16 }}>📊 Session Complete</h3>
        <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 10 }}>
          {[
            ['Total Calls', s.total], ['Contacted', s.contacted], ['No Answer', s.noAnswer],
            ['Voicemail', s.voicemail], ['Callbacks', s.callback], ['DNC', s.dnc], ['Not Interested', s.notInterested]
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #333' }}>
              <span style={{ color: '#9ca3af' }}>{label}</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{val || 0}</span>
            </div>
          ))}
        </div>
        <button onClick={resetSession} style={{ marginTop: 16, padding: '10px 24px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
          Start New Session
        </button>
      </div>
    )
  }

  return null
}
