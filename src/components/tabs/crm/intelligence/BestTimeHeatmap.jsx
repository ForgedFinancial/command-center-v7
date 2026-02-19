import { useState, useMemo } from 'react'
import { useCRM } from '../../../../context/CRMContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getHeatColor(value, max) {
  if (!max || !value) return 'transparent'
  const intensity = value / max
  return `rgba(74, 222, 128, ${0.1 + intensity * 0.8})`
}

export default function BestTimeHeatmap() {
  const { state } = useCRM()
  const [hoveredCell, setHoveredCell] = useState(null)

  // Build heatmap data from leads with call history
  const { grid, maxVal, hasData } = useMemo(() => {
    const g = DAYS.map(() => HOURS.map(() => 0))
    let total = 0

    // Scan leads for contact timestamps
    state.leads?.forEach(lead => {
      const lastContact = lead.lastContact || lead.last_contact
      if (!lastContact) return
      const d = new Date(lastContact)
      if (isNaN(d)) return
      const day = (d.getDay() + 6) % 7 // Mon=0
      const hour = d.getHours()
      g[day][hour]++
      total++
    })

    let mx = 0
    g.forEach(row => row.forEach(v => { if (v > mx) mx = v }))
    return { grid: g, maxVal: mx, hasData: total > 0 }
  }, [state.leads])

  return (
    <div style={{
      background: 'var(--theme-surface)',
      borderRadius: '12px',
      border: '1px solid var(--theme-border)',
      padding: '20px',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--theme-text-primary)' }}>
        📞 Best Time to Call
      </h3>

      {!hasData ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--theme-text-secondary)',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>Collecting data...</div>
          <div style={{ fontSize: '12px' }}>Contact rate heatmap will appear as call history builds up.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Hour labels */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px repeat(24, 1fr)',
            gap: '2px',
            marginBottom: '2px',
          }}>
            <div />
            {HOURS.map(h => (
              <div key={h} style={{
                fontSize: '9px',
                color: 'var(--theme-text-secondary)',
                textAlign: 'center',
              }}>
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, di) => (
            <div key={day} style={{
              display: 'grid',
              gridTemplateColumns: '48px repeat(24, 1fr)',
              gap: '2px',
              marginBottom: '2px',
            }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--theme-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500,
              }}>
                {day}
              </div>
              {HOURS.map(h => {
                const val = grid[di][h]
                const isHovered = hoveredCell?.d === di && hoveredCell?.h === h
                return (
                  <div
                    key={h}
                    onMouseEnter={() => setHoveredCell({ d: di, h })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${day} ${h}:00 — ${val} contact${val !== 1 ? 's' : ''}`}
                    style={{
                      aspectRatio: '1',
                      minWidth: '16px',
                      borderRadius: '3px',
                      background: getHeatColor(val, maxVal),
                      border: isHovered ? '1px solid var(--theme-accent)' : '1px solid var(--theme-border)',
                      cursor: 'default',
                      transition: 'border-color 0.15s',
                    }}
                  />
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--theme-text-secondary)',
          }}>
            <span>Less</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
              <div key={v} style={{
                width: '14px', height: '14px', borderRadius: '3px',
                background: `rgba(74, 222, 128, ${v})`,
              }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  )
}
