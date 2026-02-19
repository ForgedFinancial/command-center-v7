import { useState, useCallback, useEffect, useRef } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import DataSourceToggle from '../../../shared/DataSourceToggle'
import PhoneLineSelector from '../../../shared/PhoneLineSelector'
import CallControls from '../../../shared/CallControls'
import { useDataSource } from '../../../../hooks/useDataSource'
import { usePhone } from '../../../../context/PhoneContext'
import twilioClient from '../../../../services/twilioClient'

const FILTERS = ['All', 'Missed', 'Incoming', 'Outgoing']
const REFRESH_INTERVAL = 60000

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

export default function PhoneView() {
  const { source } = useDataSource()
  const { activeLine, twilioConfigured, callState, setCallState, setActiveCall, setIsMuted } = usePhone()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [macCalls, setMacCalls] = useState([])
  const [twilioCalls, setTwilioCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [dialNumber, setDialNumber] = useState('')
  const [showDialPad, setShowDialPad] = useState(true)
  const [callingName, setCallingName] = useState('')
  const intervalRef = useRef(null)

  // Fetch Mac calls (existing)
  const fetchMacCalls = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/calls`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMacCalls((Array.isArray(data) ? data : data.calls || []).map(c => ({ ...c, source: 'mac' })))
      setConnected(data.connected !== false)
    } catch {
      setConnected(false)
      setMacCalls([])
    }
  }, [])

  // Fetch Twilio calls
  const fetchTwilioCalls = useCallback(async () => {
    try {
      const data = await twilioClient.getCalls({ limit: 50 })
      setTwilioCalls((data.calls || []).map(c => ({
        name: c.lead_id || 'Unknown',
        number: c.direction === 'outbound' ? c.to_number : c.from_number,
        type: c.direction === 'inbound' ? (c.status === 'no-answer' ? 'missed' : 'incoming') : 'outgoing',
        duration: c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}` : '—',
        time: c.created_at ? new Date(c.created_at).toLocaleString() : '—',
        status: c.status,
        source: 'twilio',
        recording_url: c.recording_url,
      })))
    } catch {
      setTwilioCalls([])
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchMacCalls(), fetchTwilioCalls()])
    setLastRefresh(new Date())
    setLoading(false)
  }, [fetchMacCalls, fetchTwilioCalls])

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchAll])

  // Merge calls from both sources
  const allCalls = [...macCalls, ...twilioCalls]

  const filteredCalls = allCalls.filter(c => {
    if (source === 'personal' && c.source === 'business') return false
    if (source === 'business' && c.source !== 'business') return false
    if (filter !== 'All' && c.type?.toLowerCase() !== filter.toLowerCase()) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.number?.includes(q)
    }
    return true
  })

  // Dial pad
  const handleDialDigit = (digit) => {
    setDialNumber(prev => prev + digit)
  }

  const handleDial = async () => {
    const number = dialNumber || search
    if (!number) return

    const isUsingTwilio = activeLine?.type === 'twilio'

    if (isUsingTwilio && twilioConfigured) {
      // Twilio call via REST API
      setCallState('dialing')
      setCallingName('')
      try {
        await twilioClient.makeCall(number)
        setCallState('ringing')
        setTimeout(() => {
          if (callState === 'ringing') setCallState('active')
        }, 5000)
      } catch (err) {
        setError(err.message)
        setCallState('idle')
      }
    } else {
      // Mac/iPhone call (existing)
      fetch(`${WORKER_PROXY_URL}/api/phone/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      }).catch(() => {})
    }
  }

  const handleEndCall = () => {
    setCallState('idle')
    setActiveCall(null)
    setIsMuted(false)
    setCallingName('')
  }

  const dialPadKeys = ['1','2','3','4','5','6','7','8','9','*','0','#']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Phone</h2>
          <PhoneLineSelector />
          <DataSourceToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '10px', color: '#52525b' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAll}
            disabled={loading}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff', fontSize: '12px', fontWeight: 600,
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#4ade80' : '#f59e0b' }} />
            {connected ? 'iPhone Connected' : 'Waiting for connection'}
          </span>
          {twilioConfigured && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
              Twilio Active
            </span>
          )}
        </div>
      </div>

      {/* Main layout — 2 columns */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left: Recent calls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 16px', borderRadius: '8px',
                  border: '1px solid ' + (filter === f ? 'rgba(0,212,255,0.3)' : 'transparent'),
                  background: filter === f ? 'rgba(0,212,255,0.1)' : 'transparent',
                  color: filter === f ? '#00d4ff' : '#71717a',
                  fontSize: '12px', fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calls or dial number..."
            style={{
              padding: '8px 14px', borderRadius: '8px', marginBottom: '12px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          {/* Call list */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredCalls.length === 0 ? (
              <EmptyState
                icon="📞"
                title={connected ? 'No Calls Match Filter' : 'No Call History'}
                message={connected ? 'Try changing the filter or search' : 'Waiting for Mac node connection...'}
              />
            ) : (
              <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.8fr 1fr 1.5fr',
                  padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#52525b', fontWeight: 600,
                }}>
                  <span>Contact</span><span>Number</span><span>Type</span><span>Source</span><span>Duration</span><span>Time</span>
                </div>
                {filteredCalls.map((call, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.8fr 1fr 1.5fr',
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => { if (call.number) { setDialNumber(call.number.replace(/[^\d+]/g, '')); } }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{call.name || 'Unknown'}</span>
                    <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>{formatPhone(call.number) || '—'}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                      color: call.type === 'missed' ? '#ef4444' : call.type === 'incoming' ? '#4ade80' : '#3b82f6',
                      background: call.type === 'missed' ? 'rgba(239,68,68,0.12)' : call.type === 'incoming' ? 'rgba(74,222,128,0.12)' : 'rgba(59,130,246,0.12)',
                      display: 'inline-block', width: 'fit-content',
                    }}>
                      {call.type || '—'}
                    </span>
                    <span style={{
                      fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                      color: call.source === 'twilio' ? '#a855f7' : '#71717a',
                      background: call.source === 'twilio' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                    }}>
                      {call.source === 'twilio' ? 'TW' : '📱'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{call.duration || '—'}</span>
                    <span style={{ fontSize: '11px', color: '#71717a' }}>{call.time || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Dial pad + Active call */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active call controls */}
          {callState !== 'idle' && (
            <CallControls
              contactName={callingName}
              contactNumber={formatPhone(dialNumber)}
              onEnd={handleEndCall}
            />
          )}

          {/* Dial pad */}
          {callState === 'idle' && (
            <div style={{
              padding: '20px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Dial Pad
              </div>

              {/* Number display */}
              <div style={{
                padding: '10px', marginBottom: '12px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '18px', fontWeight: 700, color: '#f59e0b',
                minHeight: '30px', fontVariantNumeric: 'tabular-nums',
              }}>
                {formatPhone(dialNumber) || '\u00A0'}
              </div>

              {/* Keys */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {dialPadKeys.map(key => (
                  <button
                    key={key}
                    onClick={() => handleDialDigit(key)}
                    style={{
                      padding: '14px 0', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#e4e4e7', fontSize: '18px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.1s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Call + Clear buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                  disabled={!dialNumber}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: dialNumber ? '#a1a1aa' : '#52525b',
                    fontSize: '14px', cursor: dialNumber ? 'pointer' : 'default',
                  }}
                >
                  ⌫
                </button>
                <button
                  onClick={handleDial}
                  disabled={!dialNumber && !search}
                  style={{
                    flex: 2, padding: '12px', borderRadius: '10px',
                    border: '1px solid rgba(74,222,128,0.3)',
                    background: (dialNumber || search) ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                    color: (dialNumber || search) ? '#4ade80' : '#52525b',
                    fontSize: '16px', fontWeight: 700, cursor: (dialNumber || search) ? 'pointer' : 'default',
                  }}
                >
                  📞 Call
                </button>
              </div>

              {/* Line indicator */}
              <div style={{ fontSize: '10px', color: '#52525b', marginTop: '10px' }}>
                Calling via: {activeLine?.label || 'iPhone'} ({activeLine?.type === 'twilio' ? 'Twilio' : 'iPhone'})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
