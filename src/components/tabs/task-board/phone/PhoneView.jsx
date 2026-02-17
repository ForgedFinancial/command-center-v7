import { useState } from 'react'
import EmptyState from '../../../shared/EmptyState'

const FILTERS = ['All', 'Missed', 'Incoming', 'Outgoing']

export default function PhoneView() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [calls] = useState([]) // empty — no fake data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Phone</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717a' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
            iPhone Connected
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or dial number..."
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7',
              fontSize: '12px',
              outline: 'none',
              width: '200px',
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
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid ' + (filter === f ? 'rgba(0,212,255,0.3)' : 'transparent'),
              background: filter === f ? 'rgba(0,212,255,0.1)' : 'transparent',
              color: filter === f ? '#00d4ff' : '#71717a',
              fontSize: '12px',
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table or empty state */}
      {calls.length === 0 ? (
        <EmptyState
          icon="📞"
          title="No Call History"
          message="Your call log will appear here when connected to your phone."
        />
      ) : (
        <div style={{
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr 1fr',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#52525b',
            fontWeight: 600,
          }}>
            <span>Contact</span>
            <span>Number</span>
            <span>Type</span>
            <span>Duration</span>
            <span>Time</span>
            <span>Actions</span>
          </div>
        </div>
      )}
    </div>
  )
}
