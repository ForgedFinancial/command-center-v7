import { useState, useCallback, useEffect, useRef } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import DataSourceToggle from '../../../shared/DataSourceToggle'
import { useDataSource } from '../../../../hooks/useDataSource'

const FILTERS = ['All', 'Missed', 'Incoming', 'Outgoing']
const REFRESH_INTERVAL = 30000

export default function PhoneView() {
  const { source } = useDataSource()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const intervalRef = useRef(null)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/calls`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCalls(Array.isArray(data) ? data : data.calls || [])
      setConnected(data.connected !== false)
      setLastRefresh(new Date())
    } catch {
      setError('Could not fetch call logs')
      setConnected(false)
      setCalls([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalls()
    intervalRef.current = setInterval(fetchCalls, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchCalls])

  const filteredCalls = calls.filter(c => {
    // Data source filter
    if (source === 'personal' && c.source === 'business') return false
    if (source === 'business' && c.source !== 'business') return false
    if (filter !== 'All' && c.type?.toLowerCase() !== filter.toLowerCase()) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.number?.includes(q)
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Phone</h2>
          <DataSourceToggle />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefresh && (
            <span style={{ fontSize: '10px', color: '#52525b' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchCalls}
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
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or dial number..."
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7', fontSize: '12px', outline: 'none', width: '200px',
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
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

      {/* Content */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {filteredCalls.length === 0 ? (
        <EmptyState
          icon="📞"
          title={connected ? "No Calls Match Filter" : "No Call History"}
          message={connected ? "Try changing the filter or search" : "Waiting for Mac node connection..."}
        />
      ) : (
        <div style={{ borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr',
            padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#52525b', fontWeight: 600,
          }}>
            <span>Contact</span><span>Number</span><span>Type</span><span>Duration</span><span>Time</span>
          </div>
          {filteredCalls.map((call, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr',
              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{call.name || 'Unknown'}</span>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{call.number || '—'}</span>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                color: call.type === 'missed' ? '#ef4444' : call.type === 'incoming' ? '#4ade80' : '#3b82f6',
                background: call.type === 'missed' ? 'rgba(239,68,68,0.12)' : call.type === 'incoming' ? 'rgba(74,222,128,0.12)' : 'rgba(59,130,246,0.12)',
                display: 'inline-block', width: 'fit-content',
              }}>
                {call.type || '—'}
              </span>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{call.duration || '—'}</span>
              <span style={{ fontSize: '11px', color: '#71717a' }}>{call.time || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
