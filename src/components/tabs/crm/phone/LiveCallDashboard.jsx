// ========================================
// Live Call Dashboard — Phase 3B
// Real-time call stats, today's metrics, call log
// Auto-refreshes every 10s during active sessions
// ========================================
import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'
import { usePhone } from '../../../../context/PhoneContext'
import CallRecordingPlayer from './CallRecordingPlayer'

const REFRESH_INTERVAL = 10000 // 10 seconds

function formatDuration(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
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

export default function LiveCallDashboard() {
  const { callState } = usePhone()
  const [stats, setStats] = useState({
    activeCalls: 0,
    callsToday: 0,
    avgDuration: 0,
    connectionRate: 0,
  })
  const [outcomes, setOutcomes] = useState({
    connected: 0,
    no_answer: 0,
    voicemail: 0,
    busy: 0,
  })
  const [todaysCalls, setTodaysCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useState(null)
  // Phase 4C: Intelligence Suite
  const [intelligence, setIntelligence] = useState({
    connectionRateByNumber: {},
    callToCloseRatio: {},
    avgAttemptsToConnect: 0,
    talkTimeVsIdle: { talk: 0, idle: 0 },
    leadSourceROI: {},
  })

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [statsRes, callsRes, intelligenceRes] = await Promise.all([
        fetch(`${WORKER_PROXY_URL}/api/twilio/dashboard/stats`, {
          headers: getSyncHeaders()
        }),
        fetch(`${WORKER_PROXY_URL}/api/twilio/calls?limit=50&today=true`, {
          headers: getSyncHeaders()
        }),
        fetch(`${WORKER_PROXY_URL}/api/twilio/intelligence/call-metrics`, {
          headers: getSyncHeaders()
        })
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats || {})
        setOutcomes(statsData.outcomes || {})
      }

      if (callsRes.ok) {
        const callsData = await callsRes.json()
        setTodaysCalls((callsData.calls || []).map(call => ({
          ...call,
          displayName: call.lead_name || call.lead_id || 'Unknown',
          displayPhone: formatPhone(call.direction === 'outbound' ? call.to_number : call.from_number),
          displayDuration: formatDuration(call.duration),
          displayTime: call.created_at ? new Date(call.created_at).toLocaleTimeString() : '—',
          statusColor: call.status === 'completed' && call.duration > 0 ? '#4ade80' :
                      call.status === 'no-answer' ? '#f59e0b' :
                      call.status === 'busy' ? '#ef4444' : '#71717a',
        })))
      }

      if (intelligenceRes.ok) {
        const intelligenceData = await intelligenceRes.json()
        setIntelligence(intelligenceData.intelligence || {})
      }
    } catch (err) {
      setError(err.message)
      console.error('[DASHBOARD] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 10s when in active call session
    const interval = setInterval(() => {
      if (callState !== 'idle') {
        fetchDashboardData()
      }
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchDashboardData, callState])

  const totalOutcomes = outcomes.connected + outcomes.no_answer + outcomes.voicemail + outcomes.busy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>
          📊 Live Call Dashboard
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: callState !== 'idle' ? '#4ade80' : '#71717a',
            animation: callState !== 'idle' ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: '11px', color: '#71717a' }}>
            {callState !== 'idle' ? 'Live Session' : 'Idle'}
          </span>
          <button 
            onClick={fetchDashboardData} 
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Active Calls"
          value={stats.activeCalls || 0}
          icon="📞"
          color="#4ade80"
        />
        <StatCard
          title="Calls Today"
          value={stats.callsToday || 0}
          icon="📈"
          color="#3b82f6"
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          icon="⏱️"
          color="#f59e0b"
        />
        <StatCard
          title="Connection Rate"
          value={`${Math.round(stats.connectionRate || 0)}%`}
          icon="🎯"
          color="#8b5cf6"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Call Outcomes Chart */}
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
            📊 Call Outcomes (Today)
          </h3>
          
          {totalOutcomes > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <OutcomeBar label="Connected" value={outcomes.connected} total={totalOutcomes} color="#4ade80" />
              <OutcomeBar label="No Answer" value={outcomes.no_answer} total={totalOutcomes} color="#f59e0b" />
              <OutcomeBar label="Voicemail" value={outcomes.voicemail} total={totalOutcomes} color="#8b5cf6" />
              <OutcomeBar label="Busy" value={outcomes.busy} total={totalOutcomes} color="#ef4444" />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#71717a', fontSize: '12px' }}>
              No call data for today yet
            </div>
          )}
        </div>

        {/* Today's Call Log Preview */}
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
            📋 Recent Calls
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxHeight: '300px', overflowY: 'auto' }}>
            {todaysCalls.length > 0 ? (
              todaysCalls.slice(0, 10).map((call, idx) => (
                <CallLogItem key={idx} call={call} />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#71717a', fontSize: '12px' }}>
                No calls today yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phase 4C: Intelligence Suite */}
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(139,92,246,0.05)',
        border: '1px solid rgba(139,92,246,0.2)',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#8b5cf6' }}>
          🧠 Auto-Intelligence Suite
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {/* Connection Rate by Number */}
          <IntelligenceCard
            title="Connection Rate by Number"
            icon="📞"
            data={intelligence.connectionRateByNumber}
            formatter={rate => `${Math.round(rate || 0)}%`}
            colorKey="rate"
          />
          
          {/* Call-to-Close Ratio by Lead Type */}
          <IntelligenceCard
            title="Call-to-Close by Lead Type"
            icon="🎯"
            data={intelligence.callToCloseRatio}
            formatter={ratio => `${Math.round(ratio || 0)}%`}
            colorKey="ratio"
          />
          
          {/* Average Attempts to Connect */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔄</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa' }}>Avg Attempts</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
              {(intelligence.avgAttemptsToConnect || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '10px', color: '#71717a' }}>
              Average attempts before connection
            </div>
          </div>
          
          {/* Talk Time vs Idle Time */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>⏱️</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa' }}>Talk vs Idle</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80' }}>
                  {formatDuration(intelligence.talkTimeVsIdle?.talk || 0)}
                </div>
                <div style={{ fontSize: '9px', color: '#71717a' }}>Talk Time</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                  {formatDuration(intelligence.talkTimeVsIdle?.idle || 0)}
                </div>
                <div style={{ fontSize: '9px', color: '#71717a' }}>Idle Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ fontSize: '24px' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: color, marginBottom: '2px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {title}
        </div>
      </div>
    </div>
  )
}

function OutcomeBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '70px', fontSize: '11px', color: '#a1a1aa' }}>{label}</div>
      <div style={{ 
        flex: 1, 
        height: '20px', 
        borderRadius: '10px', 
        background: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: color,
          borderRadius: '10px',
          transition: 'width 300ms ease',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '8px',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          fontWeight: 600,
          color: percentage > 30 ? '#000' : '#fff',
        }}>
          {value} ({Math.round(percentage)}%)
        </div>
      </div>
    </div>
  )
}

function IntelligenceCard({ title, icon, data, formatter, colorKey }) {
  const entries = Object.entries(data || {}).slice(0, 3) // Show top 3
  
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(139,92,246,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa' }}>{title}</span>
      </div>
      
      {entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#e4e4e7' }}>{key}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#8b5cf6' }}>
                {formatter ? formatter(value) : value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: '#71717a', textAlign: 'center', padding: '12px 0' }}>
          No data available
        </div>
      )}
    </div>
  )
}

function CallLogItem({ call }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#e4e4e7', marginBottom: '2px' }}>
          {call.displayName}
        </div>
        <div style={{ fontSize: '10px', color: '#71717a' }}>
          {call.displayPhone} · {call.displayTime}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: call.statusColor, fontWeight: 600 }}>
          {call.displayDuration}
        </span>
        <div style={{
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: call.statusColor 
        }} />
      </div>
    </div>
  )
}