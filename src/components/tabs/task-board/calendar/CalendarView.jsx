import { useState, useMemo, useCallback, useEffect } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEWS = ['Month', 'Week', 'Day']

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('Month')
  const [events, setEvents] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [syncError, setSyncError] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const fetchEvents = useCallback(async () => {
    setSyncing(true)
    setSyncError(false)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : data.events || [])
      setLastSync(new Date())
    } catch {
      setSyncError(true)
      setEvents([])
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const days = []

    const prevMonthLast = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthLast - i, current: false, date: new Date(year, month - 1, prevMonthLast - i) })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ day: d, current: true, date: new Date(year, month, d) })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, current: false, date: new Date(year, month + 1, d) })
    }
    return days
  }, [year, month])

  const today = new Date()
  const isToday = (d) => d.date.toDateString() === today.toDateString()

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prev = () => setCurrentDate(new Date(year, month - 1, 1))
  const next = () => setCurrentDate(new Date(year, month + 1, 1))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Calendar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* iCloud sync indicator */}
          <button
            onClick={fetchEvents}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid ' + (syncError ? 'rgba(239,68,68,0.3)' : lastSync ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'),
              background: syncError ? 'rgba(239,68,68,0.08)' : lastSync ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
              color: syncError ? '#ef4444' : lastSync ? '#4ade80' : '#71717a',
              fontSize: '11px', fontWeight: 500, cursor: syncing ? 'default' : 'pointer',
              opacity: syncing ? 0.6 : 1,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: syncError ? '#ef4444' : lastSync ? '#4ade80' : '#f59e0b' }} />
            {syncing ? 'Syncing...' : syncError ? 'Sync Failed — Retry' : lastSync ? 'Synced with iCloud' : 'Sync Now'}
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {VIEWS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 14px',
                  borderRadius: v === 'Month' ? '8px 0 0 8px' : v === 'Day' ? '0 8px 8px 0' : '0',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: view === v ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: view === v ? '#00d4ff' : '#71717a',
                  fontSize: '12px',
                  fontWeight: view === v ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Nav */}
          <button onClick={prev} style={navBtn}>←</button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7', minWidth: '140px', textAlign: 'center' }}>
            {monthName}
          </span>
          <button onClick={next} style={navBtn}>→</button>

          {/* + Event */}
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Event
          </button>
        </div>
      </div>

      {/* Empty state if no events */}
      {events.length === 0 && !syncing && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#71717a', textAlign: 'center' }}>
          No events — connect iCloud calendar to sync
        </div>
      )}

      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {DAYS.map(d => (
          <div key={d} style={{
            padding: '8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#71717a',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: 'repeat(6, 1fr)',
        flex: 1,
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: 'none',
      }}>
        {calendarDays.map((d, i) => {
          const dayEvents = events.filter(e => {
            const eDate = new Date(e.start)
            return eDate.toDateString() === d.date.toDateString()
          })

          return (
            <div
              key={i}
              style={{
                padding: '6px 8px',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderBottom: i < 35 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: isToday(d) ? 'rgba(0,212,255,0.04)' : 'transparent',
                minHeight: '80px',
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: isToday(d) ? 700 : 400,
                color: !d.current ? '#3f3f46' : isToday(d) ? '#00d4ff' : '#a1a1aa',
                marginBottom: '4px',
              }}>
                {d.day}
              </div>
              {dayEvents.map(evt => (
                <div
                  key={evt.id}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${evt.color || '#3b82f6'}20`,
                    color: evt.color || '#3b82f6',
                    fontSize: '10px',
                    fontWeight: 500,
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {evt.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const navBtn = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#a1a1aa',
  fontSize: '14px',
  cursor: 'pointer',
}
