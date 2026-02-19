// ========================================
// Phone View — Tabbed: Dialer | Call History | Voicemail | Settings
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useCallback, useEffect, useRef } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import DataSourceToggle from '../../../shared/DataSourceToggle'
import PhoneLineSelector from '../../../shared/PhoneLineSelector'
import CallControls from '../../../shared/CallControls'
import { useDataSource } from '../../../../hooks/useDataSource'
import { usePhone } from '../../../../context/PhoneContext'
import twilioClient from '../../../../services/twilioClient'
import CallRecordingPlayer from '../../crm/phone/CallRecordingPlayer'
import VoicemailInbox from '../../crm/phone/VoicemailInbox'
import VoicemailDropManager from '../../crm/phone/VoicemailDropManager'
import AudioDeviceSelector from '../../crm/phone/AudioDeviceSelector'
import PhoneNumberHealth from '../../crm/phone/PhoneNumberHealth'
import { RingSettings } from '../../crm/phone/RingingSystem'

const TABS = ['Dialer', 'Call History', 'Voicemail', 'Settings']
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
  const { activeLine, twilioConfigured, callState, setCallState, setActiveCall, setIsMuted, makeCall: ctxMakeCall } = usePhone()
  const [activeTab, setActiveTab] = useState('Dialer')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [macCalls, setMacCalls] = useState([])
  const [twilioCalls, setTwilioCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [dialNumber, setDialNumber] = useState('')
  const [callingName, setCallingName] = useState('')
  const [vmBadge, setVmBadge] = useState(0)
  const intervalRef = useRef(null)

  // Fetch Mac calls
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
        name: c.lead_name || c.lead_id || 'Unknown',
        number: c.direction === 'outbound' ? c.to_number : c.from_number,
        type: c.direction === 'inbound' ? (c.status === 'no-answer' ? 'missed' : 'incoming') : 'outgoing',
        duration: c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}` : '—',
        time: c.created_at ? new Date(c.created_at).toLocaleString() : '—',
        status: c.status,
        source: 'twilio',
        recording_url: c.recording_url,
        callSid: c.twilio_sid,
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

  const handleDialDigit = (digit) => setDialNumber(prev => prev + digit)

  const handleDial = async () => {
    const number = dialNumber || search
    if (!number) return
    if (twilioConfigured && activeLine?.type === 'twilio') {
      try {
        await ctxMakeCall({ phone: number, name: callingName || number })
      } catch (err) {
        setError(err.message)
      }
    } else {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Phone</h2>
          <PhoneLineSelector />
          <DataSourceToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefresh && <span style={{ fontSize: '10px', color: '#52525b' }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={fetchAll} disabled={loading} style={{
            padding: '6px 14px', borderRadius: '8px',
            border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.1)',
            color: '#00d4ff', fontSize: '12px', fontWeight: 600,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          {connected && <StatusDot color="#4ade80" label="iPhone" />}
          {twilioConfigured && <StatusDot color="#4ade80" label="Twilio" />}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', fontSize: '12px', fontWeight: activeTab === tab ? 700 : 400,
            color: activeTab === tab ? '#00d4ff' : '#71717a',
            background: activeTab === tab ? 'rgba(0,212,255,0.06)' : 'transparent',
            border: 'none', borderBottom: activeTab === tab ? '2px solid #00d4ff' : '2px solid transparent',
            cursor: 'pointer', position: 'relative',
          }}>
            {tab}
            {tab === 'Voicemail' && vmBadge > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {vmBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'Dialer' && (
          <DialerTab
            callState={callState} dialNumber={dialNumber} setDialNumber={setDialNumber}
            callingName={callingName} handleDial={handleDial} handleDialDigit={handleDialDigit}
            handleEndCall={handleEndCall} activeLine={activeLine} search={search}
            dialPadKeys={dialPadKeys} formatPhone={formatPhone}
          />
        )}
        {activeTab === 'Call History' && (
          <CallHistoryTab
            filteredCalls={filteredCalls} filter={filter} setFilter={setFilter}
            search={search} setSearch={setSearch} error={error}
            setDialNumber={setDialNumber} setActiveTab={setActiveTab}
            formatPhone={formatPhone}
          />
        )}
        {activeTab === 'Voicemail' && (
          <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <VoicemailInbox onBadgeCount={setVmBadge} />
            </div>
            <div style={{ width: '300px', flexShrink: 0 }}>
              <VoicemailDropManager />
            </div>
          </div>
        )}
        {activeTab === 'Settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  )
}

function StatusDot({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}

function SettingsTab() {
  const { multiLineMode, setMultiLineMode, amdEnabled, setAmdEnabled } = usePhone()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
      {/* Phase 2: Multi-Line Power Dialing Settings */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
          Power Dialing Settings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Multi-Line Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>Multi-Line Dialing</div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>Dial 2-3 leads simultaneously, first to answer connects</div>
            </div>
            <button
              onClick={() => setMultiLineMode(!multiLineMode)}
              style={{
                position: 'relative',
                width: '48px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: multiLineMode ? '#4ade80' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'background 200ms ease',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: multiLineMode ? '26px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 200ms ease',
              }} />
            </button>
          </div>

          {/* AMD Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>Answering Machine Detection</div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>Automatically detect and handle voicemail systems</div>
            </div>
            <button
              onClick={() => setAmdEnabled(!amdEnabled)}
              style={{
                position: 'relative',
                width: '48px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: amdEnabled ? '#4ade80' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'background 200ms ease',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: amdEnabled ? '26px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 200ms ease',
              }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      
      <AudioDeviceSelector />
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      <RingSettings />
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      <PhoneNumberHealth />
    </div>
  )
}

function DialerTab({ callState, dialNumber, setDialNumber, callingName, handleDial, handleDialDigit, handleEndCall, activeLine, search, dialPadKeys, formatPhone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
      <div style={{ width: '300px' }}>
        {callState !== 'idle' ? (
          <CallControls contactName={callingName} contactNumber={formatPhone(dialNumber)} onEnd={handleEndCall} />
        ) : (
          <div style={{
            padding: '24px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Dial Pad
            </div>
            <div style={{
              padding: '10px', marginBottom: '12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '18px', fontWeight: 700, color: '#f59e0b', minHeight: '30px', fontVariantNumeric: 'tabular-nums',
            }}>
              {formatPhone(dialNumber) || '\u00A0'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {dialPadKeys.map(key => (
                <button key={key} onClick={() => handleDialDigit(key)} style={{
                  padding: '14px 0', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  color: '#e4e4e7', fontSize: '18px', fontWeight: 600, cursor: 'pointer',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  {key}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setDialNumber(prev => prev.slice(0, -1))} disabled={!dialNumber} style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                color: dialNumber ? '#a1a1aa' : '#52525b', fontSize: '14px', cursor: dialNumber ? 'pointer' : 'default',
              }}>⌫</button>
              <button onClick={handleDial} disabled={!dialNumber && !search} style={{
                flex: 2, padding: '12px', borderRadius: '10px',
                border: '1px solid rgba(74,222,128,0.3)',
                background: (dialNumber || search) ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                color: (dialNumber || search) ? '#4ade80' : '#52525b',
                fontSize: '16px', fontWeight: 700, cursor: (dialNumber || search) ? 'pointer' : 'default',
              }}>📞 Call</button>
            </div>
            <div style={{ fontSize: '10px', color: '#52525b', marginTop: '10px' }}>
              Via: {activeLine?.label || 'iPhone'} ({activeLine?.type === 'twilio' ? 'Twilio' : 'iPhone'})
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CallHistoryTab({ filteredCalls, filter, setFilter, search, setSearch, error, setDialNumber, setActiveTab, formatPhone }) {
  const [expandedIdx, setExpandedIdx] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: '8px',
            border: '1px solid ' + (filter === f ? 'rgba(0,212,255,0.3)' : 'transparent'),
            background: filter === f ? 'rgba(0,212,255,0.1)' : 'transparent',
            color: filter === f ? '#00d4ff' : '#71717a',
            fontSize: '12px', fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
          }}>
            {f}
          </button>
        ))}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search calls..."
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

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredCalls.length === 0 ? (
          <EmptyState icon="📞" title="No Calls Match Filter" message="Try changing the filter or search" />
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
              <div key={i}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.8fr 1fr 1.5fr',
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center',
                  cursor: 'pointer', background: expandedIdx === i ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}
                onClick={() => { setExpandedIdx(expandedIdx === i ? null : i); if (call.number) setDialNumber(call.number.replace(/[^\d+]/g, '')) }}
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
                {/* Expanded: recording player */}
                {expandedIdx === i && call.recording_url && (
                  <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <CallRecordingPlayer recordingUrl={call.recording_url} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
