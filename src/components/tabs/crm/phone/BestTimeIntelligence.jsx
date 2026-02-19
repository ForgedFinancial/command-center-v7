// ========================================
// Best Time to Call Intelligence — Phase 4B
// Heatmap showing connection rates by hour/day/state/type
// Weekly digest data for Monday briefs
// ========================================
import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const STATES = ['IL', 'TX', 'CA', 'NC', 'FL', 'NY', 'AZ', 'OH']
const LEAD_TYPES = ['Life Insurance', 'Final Expense', 'Term Life', 'Whole Life']

function formatHour(hour) {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function getHeatmapColor(rate) {
  if (rate >= 80) return { bg: '#4ade80', text: '#000' } // Green
  if (rate >= 60) return { bg: '#fbbf24', text: '#000' } // Yellow  
  if (rate >= 40) return { bg: '#f97316', text: '#fff' } // Orange
  if (rate >= 20) return { bg: '#dc2626', text: '#fff' } // Red
  return { bg: 'rgba(255,255,255,0.1)', text: '#71717a' } // Gray
}

export default function BestTimeIntelligence() {
  const [data, setData] = useState({
    hourlyRates: {},
    dailyRates: {},
    stateRates: {},
    typeRates: {},
    weeklyDigest: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('hourly') // hourly, daily, state, type
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d

  const fetchIntelligenceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${WORKER_PROXY_URL}/api/twilio/intelligence/best-time?range=${timeRange}`, {
        headers: getSyncHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || {})
      } else {
        // Mock data for development
        setData({
          hourlyRates: {
            9: 78, 10: 82, 11: 89, 12: 76, 13: 71, 14: 85, 15: 79, 16: 73, 17: 68,
            18: 62, 19: 55, 8: 65, 7: 45, 20: 48, 21: 42, 6: 32, 22: 28, 5: 18,
          },
          dailyRates: {
            0: 45, 1: 72, 2: 78, 3: 81, 4: 79, 5: 65, 6: 38
          },
          stateRates: {
            'IL': 84, 'TX': 79, 'CA': 73, 'NC': 76, 'FL': 82, 'NY': 68, 'AZ': 71, 'OH': 77
          },
          typeRates: {
            'Life Insurance': 82, 'Final Expense': 89, 'Term Life': 75, 'Whole Life': 79
          },
          weeklyDigest: {
            bestHour: { hour: 11, rate: 89 },
            bestDay: { day: 'Wednesday', rate: 81 },
            bestState: { state: 'IL', rate: 84 },
            bestType: { type: 'Final Expense', rate: 89 },
            totalCalls: 1247,
            connectedCalls: 942,
            overallRate: 76,
          }
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchIntelligenceData()
  }, [fetchIntelligenceData])

  const currentData = data[`${viewMode}Rates`] || {}
  const labels = viewMode === 'hourly' ? HOURS 
    : viewMode === 'daily' ? DAYS.map((_, i) => i)
    : viewMode === 'state' ? STATES
    : LEAD_TYPES

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>
          🧠 Best Time Intelligence
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#e4e4e7',
              fontSize: '11px',
              outline: 'none',
            }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={fetchIntelligenceData}
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
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
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

      {/* Weekly Digest Summary */}
      {data.weeklyDigest && (
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'rgba(74,222,128,0.05)',
          border: '1px solid rgba(74,222,128,0.2)',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>
            📊 Weekly Intelligence Digest
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <DigestCard
              icon="⏰"
              title="Best Hour"
              value={`${formatHour(data.weeklyDigest.bestHour.hour)}`}
              subtitle={`${data.weeklyDigest.bestHour.rate}% connection rate`}
            />
            <DigestCard
              icon="📅"
              title="Best Day"
              value={DAYS[data.weeklyDigest.bestDay.day] || data.weeklyDigest.bestDay.day}
              subtitle={`${data.weeklyDigest.bestDay.rate}% connection rate`}
            />
            <DigestCard
              icon="🗺️"
              title="Best State"
              value={data.weeklyDigest.bestState.state}
              subtitle={`${data.weeklyDigest.bestState.rate}% connection rate`}
            />
            <DigestCard
              icon="🎯"
              title="Best Lead Type"
              value={data.weeklyDigest.bestType.type}
              subtitle={`${data.weeklyDigest.bestType.rate}% connection rate`}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px', 
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(74,222,128,0.2)',
          }}>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              <strong style={{ color: '#e4e4e7' }}>{data.weeklyDigest.totalCalls}</strong> total calls
            </div>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              <strong style={{ color: '#4ade80' }}>{data.weeklyDigest.connectedCalls}</strong> connected
            </div>
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              <strong style={{ color: '#f59e0b' }}>{data.weeklyDigest.overallRate}%</strong> overall rate
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[
          { key: 'hourly', label: 'By Hour', icon: '⏰' },
          { key: 'daily', label: 'By Day', icon: '📅' },
          { key: 'state', label: 'By State', icon: '🗺️' },
          { key: 'type', label: 'By Type', icon: '🎯' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: viewMode === tab.key ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
              background: viewMode === tab.key ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.05)',
              color: viewMode === tab.key ? '#00d4ff' : '#a1a1aa',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#e4e4e7' }}>
          Connection Rate Heatmap - {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
        </h3>
        
        {viewMode === 'hourly' && (
          <HourlyHeatmap data={currentData} />
        )}
        
        {viewMode === 'daily' && (
          <DailyHeatmap data={currentData} />
        )}
        
        {(viewMode === 'state' || viewMode === 'type') && (
          <SimpleHeatmap 
            data={currentData} 
            labels={labels}
            labelKey={viewMode === 'state' ? 'state' : 'type'}
          />
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Connection Rate:</span>
          {[
            { rate: 80, label: '80%+' },
            { rate: 60, label: '60-79%' },
            { rate: 40, label: '40-59%' },
            { rate: 20, label: '20-39%' },
            { rate: 0, label: '<20%' },
          ].map(item => {
            const colors = getHeatmapColor(item.rate)
            return (
              <div key={item.rate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: colors.bg,
                }} />
                <span style={{ fontSize: '10px', color: '#a1a1aa' }}>{item.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DigestCard({ icon, title, value, subtitle }) {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(74,222,128,0.2)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#e4e4e7', marginBottom: '2px' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
        {title}
      </div>
      <div style={{ fontSize: '11px', color: '#4ade80' }}>
        {subtitle}
      </div>
    </div>
  )
}

function HourlyHeatmap({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px' }}>
      {HOURS.map(hour => {
        const rate = data[hour] || 0
        const colors = getHeatmapColor(rate)
        return (
          <div
            key={hour}
            style={{
              padding: '8px 4px',
              borderRadius: '4px',
              background: colors.bg,
              color: colors.text,
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 600,
            }}
            title={`${formatHour(hour)}: ${rate}% connection rate`}
          >
            <div>{formatHour(hour).replace(' ', '')}</div>
            <div style={{ fontSize: '9px', marginTop: '2px' }}>{rate}%</div>
          </div>
        )
      })}
    </div>
  )
}

function DailyHeatmap({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
      {DAYS.map((day, index) => {
        const rate = data[index] || 0
        const colors = getHeatmapColor(rate)
        return (
          <div
            key={day}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              background: colors.bg,
              color: colors.text,
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
            }}
            title={`${day}: ${rate}% connection rate`}
          >
            <div>{day.slice(0, 3)}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0' }}>{rate}%</div>
          </div>
        )
      })}
    </div>
  )
}

function SimpleHeatmap({ data, labels, labelKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
      {labels.map(label => {
        const rate = data[label] || 0
        const colors = getHeatmapColor(rate)
        return (
          <div
            key={label}
            style={{
              padding: '16px 12px',
              borderRadius: '8px',
              background: colors.bg,
              color: colors.text,
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}
            title={`${label}: ${rate}% connection rate`}
          >
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{rate}%</div>
            <div style={{ fontSize: '10px' }}>{label}</div>
          </div>
        )
      })}
    </div>
  )
}