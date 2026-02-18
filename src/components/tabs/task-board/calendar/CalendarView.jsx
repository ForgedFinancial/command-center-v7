import { useState, useMemo, useCallback, useEffect } from 'react'
import { WORKER_PROXY_URL } from '../../../../config/api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEWS = ['Month', 'Week', 'Day']

const CAL_COLORS = {
  Work: '#3b82f6',
  Personal: '#a855f7',
  Reminders: '#f59e0b',
  Home: '#10b981',
}

function getCalColor(name) {
  return CAL_COLORS[name] || '#3b82f6'
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('Month')
  const [events, setEvents] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [syncError, setSyncError] = useState(false)

  // Create event modal state
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [calendars, setCalendars] = useState([])
  const [creating, setCreating] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00', calendar: 'Work', location: '', description: '', alerts: [15] })

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

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/calendars`)
      if (res.ok) {
        const data = await res.json()
        if (data.calendars?.length) setCalendars(data.calendars)
      }
    } catch {}
  }, [])

  useEffect(() => { fetchEvents(); fetchCalendars() }, [fetchEvents, fetchCalendars])

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

  // Open create modal
  const openCreateModal = (date) => {
    const d = date || new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setForm({ title: '', date: dateStr, startTime: '09:00', endTime: '10:00', calendar: calendars[0]?.name || 'Work', location: '', description: '', alerts: [15] })
    setEditingEvent(null)
    setModalDate(d)
    setShowModal(true)
  }

  // Open edit modal for existing event
  const openEditModal = (evt) => {
    const startDt = new Date(evt.start)
    const endDt = evt.end ? new Date(evt.end) : new Date(startDt.getTime() + 3600000)
    const dateStr = `${startDt.getFullYear()}-${String(startDt.getMonth() + 1).padStart(2, '0')}-${String(startDt.getDate()).padStart(2, '0')}`
    const startTime = `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`
    const endTime = `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`
    setForm({
      title: evt.summary || '', date: dateStr, startTime, endTime,
      calendar: evt.calendar || 'Work', location: evt.location || '', description: evt.description || '',
      alerts: [15],
    })
    setEditingEvent(evt)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.date) return
    setCreating(true)
    try {
      const start = new Date(`${form.date}T${form.startTime}:00`)
      const end = new Date(`${form.date}T${form.endTime}:00`)
      const payload = {
        title: form.title,
        start: start.toISOString(),
        end: end.toISOString(),
        calendar: form.calendar,
        location: form.location || undefined,
        description: form.description || undefined,
        alerts: form.alerts?.filter(a => a !== null && a !== undefined) || [],
      }

      if (editingEvent?.uid) {
        // Update existing event
        const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events/${encodeURIComponent(editingEvent.uid)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-api-key': '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } else {
        // Create new event
        const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      }
      setShowModal(false)
      setEditingEvent(null)
      setTimeout(() => fetchEvents(), 1500)
    } catch (err) {
      alert(`Failed to ${editingEvent ? 'update' : 'create'} event: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent?.uid) return
    if (!confirm(`Delete "${editingEvent.summary}"?`)) return
    setCreating(true)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events/${encodeURIComponent(editingEvent.uid)}`, {
        method: 'DELETE',
        headers: { 'x-api-key': '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setShowModal(false)
      setEditingEvent(null)
      setTimeout(() => fetchEvents(), 1500)
    } catch (err) {
      alert(`Failed to delete event: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Calendar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          <div style={{ display: 'flex', gap: '2px' }}>
            {VIEWS.map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 14px',
                borderRadius: v === 'Month' ? '8px 0 0 8px' : v === 'Day' ? '0 8px 8px 0' : '0',
                border: '1px solid rgba(255,255,255,0.1)',
                background: view === v ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: view === v ? '#00d4ff' : '#71717a',
                fontSize: '12px', fontWeight: view === v ? 600 : 400, cursor: 'pointer',
              }}>{v}</button>
            ))}
          </div>

          <button onClick={prev} style={navBtn}>←</button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7', minWidth: '140px', textAlign: 'center' }}>{monthName}</span>
          <button onClick={next} style={navBtn}>→</button>

          <button onClick={() => openCreateModal()} style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.1)',
            color: '#00d4ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>+ Event</button>
        </div>
      </div>

      {events.length === 0 && !syncing && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#71717a', textAlign: 'center' }}>
          No events — connect iCloud calendar to sync
        </div>
      )}

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {DAYS.map(d => (
          <div key={d} style={{ padding: '8px', fontSize: '11px', fontWeight: 600, color: '#71717a', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', flex: 1, border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none' }}>
        {calendarDays.map((d, i) => {
          const dayEvents = events.filter(e => {
            const eDate = new Date(e.start)
            return eDate.toDateString() === d.date.toDateString()
          })

          return (
            <div
              key={i}
              onClick={() => openCreateModal(d.date)}
              style={{
                padding: '6px 8px', cursor: 'pointer',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderBottom: i < 35 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: isToday(d) ? 'rgba(0,212,255,0.04)' : 'transparent',
                minHeight: '80px',
              }}
            >
              <div style={{
                fontSize: '12px', fontWeight: isToday(d) ? 700 : 400,
                color: !d.current ? '#3f3f46' : isToday(d) ? '#00d4ff' : '#a1a1aa',
                marginBottom: '4px',
              }}>{d.day}</div>
              {dayEvents.slice(0, 3).map((evt, j) => {
                const color = getCalColor(evt.calendar)
                const time = evt.start ? new Date(evt.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
                return (
                  <div key={j} onClick={e => { e.stopPropagation(); openEditModal(evt) }} style={{
                    padding: '2px 6px', borderRadius: '4px', cursor: 'pointer',
                    background: `${color}20`, borderLeft: `2px solid ${color}`,
                    color, fontSize: '10px', fontWeight: 500, marginBottom: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={`${evt.summary || evt.title}${evt.location ? ' — ' + evt.location : ''} — Click to edit`}>
                    {time ? <span style={{ opacity: 0.7 }}>{time} </span> : null}{evt.summary || evt.title}
                  </div>
                )
              })}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: '9px', color: '#71717a', paddingLeft: '6px' }}>+{dayEvents.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '28px', width: '420px', maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#e4e4e7' }}>{editingEvent ? 'Edit Event' : 'New Event'}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Title" required>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title" autoFocus style={inputStyle} />
              </Field>

              <Field label="Date" required>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </Field>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Field label="Start Time" style={{ flex: 1 }}>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="End Time" style={{ flex: 1 }}>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={inputStyle} />
                </Field>
              </div>

              <Field label="Calendar">
                <select value={form.calendar} onChange={e => setForm(f => ({ ...f, calendar: e.target.value }))} style={inputStyle}>
                  {(calendars.length ? calendars : [{ name: 'Work' }, { name: 'Personal' }, { name: 'Reminders' }]).map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Location">
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Optional" style={inputStyle} />
              </Field>

              <Field label="Description">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>

              <Field label="Alerts">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(form.alerts || []).map((alert, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select value={alert} onChange={e => {
                        const newAlerts = [...form.alerts]; newAlerts[idx] = parseInt(e.target.value, 10)
                        setForm(f => ({ ...f, alerts: newAlerts }))
                      }} style={{ ...inputStyle, flex: 1 }}>
                        <option value={0}>At time of event</option>
                        <option value={5}>5 minutes before</option>
                        <option value={10}>10 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                        <option value={60}>1 hour before</option>
                        <option value={120}>2 hours before</option>
                        <option value={1440}>1 day before</option>
                        <option value={2880}>2 days before</option>
                        <option value={10080}>1 week before</option>
                      </select>
                      <button onClick={() => setForm(f => ({ ...f, alerts: f.alerts.filter((_, i) => i !== idx) }))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setForm(f => ({ ...f, alerts: [...(f.alerts || []), 15] }))}
                    style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#00d4ff', fontSize: '12px', padding: '4px 12px', cursor: 'pointer' }}>
                    + Add Alert
                  </button>
                </div>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              {editingEvent?.uid ? (
                <button onClick={handleDeleteEvent} disabled={creating} style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                }}>🗑️ Delete</button>
              ) : <div />}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowModal(false); setEditingEvent(null) }} style={{
                  padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#a1a1aa', fontSize: '13px', cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={handleSave} disabled={creating || !form.title} style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: creating || !form.title ? '#27272a' : '#00d4ff', color: creating || !form.title ? '#52525b' : '#000',
                  fontSize: '13px', fontWeight: 600, cursor: creating || !form.title ? 'default' : 'pointer',
                }}>{creating ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#71717a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: '#e4e4e7', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const navBtn = {
  padding: '4px 10px', borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  color: '#a1a1aa', fontSize: '14px', cursor: 'pointer',
}
