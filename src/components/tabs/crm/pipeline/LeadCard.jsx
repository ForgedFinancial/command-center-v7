import { useState, useRef, useEffect, useMemo } from 'react'
import crmClient from '../../../../api/crmClient'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'
import { DISPOSITION_TAGS, getTagById } from '../../../../config/dispositionTags'
import { renderCardField, timeAgo } from './pipelineHelpers'

export default function LeadCard({ lead, color, cardFields, onDragStart, onClick, onDelete, onPhoneCall, onVideoCall, onMessage, onTransfer, isNew, onMarkSeen, isSelected, onToggleSelect, stages, currentPipelineId, actions, appActions }) {
  const hoverTimer = useRef(null)
  const [showNew, setShowNew] = useState(isNew)
  const [quickNote, setQuickNote] = useState('')
  const [showQuickNote, setShowQuickNote] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Parse lead tags
  const leadTags = useMemo(() => {
    const raw = lead.tags || lead.tag || []
    if (Array.isArray(raw)) return raw.filter(t => typeof t === 'string')
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
    return []
  }, [lead.tags, lead.tag])

  const toggleTag = (tagId, e) => {
    e.stopPropagation()
    const current = [...leadTags]
    const idx = current.indexOf(tagId)
    const updated = idx >= 0 ? current.filter(t => t !== tagId) : [...current, tagId]
    actions?.updateLead({ id: lead.id, tags: updated })
    crmClient.updateLead(lead.id, { tags: JSON.stringify(updated) }).catch(() => {})
  }

  useEffect(() => { setShowNew(isNew) }, [isNew])

  const handleQuickNote = (e) => {
    e.stopPropagation()
    if (!quickNote.trim()) return
    const notes = lead.notes ? `${lead.notes}\n[${new Date().toLocaleString()}] ${quickNote}` : `[${new Date().toLocaleString()}] ${quickNote}`
    actions?.updateLead({ id: lead.id, notes })
    crmClient.updateLead(lead.id, { notes }).catch(() => {})
    setQuickNote('')
    setShowQuickNote(false)
    appActions?.addToast({ id: Date.now(), type: 'success', message: `Note added to ${lead.name}` })
  }

  const handleHoverStart = () => {
    if (!showNew) return
    hoverTimer.current = setTimeout(() => {
      onMarkSeen(lead.id)
      setShowNew(false)
    }, 1500)
  }
  const handleHoverEnd = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
  }

  const [scheduling, setScheduling] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')

  const handleOpenScheduler = (e) => {
    e.stopPropagation()
    const now = new Date()
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setSchedDate(`${yyyy}-${mm}-${dd}`)
    setSchedTime('')
    setShowScheduler(true)
  }

  const handleScheduleSubmit = async (e) => {
    e.stopPropagation()
    if (!schedTime || !schedDate || scheduling) return
    setScheduling(true)
    try {
      // Build a date string in CT, then convert to UTC
      const ctDateTimeStr = `${schedDate}T${schedTime}:00`
      // Create date as if in CT by computing offset
      const naive = new Date(ctDateTimeStr)
      const ctRef = new Date(naive.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const offset = naive.getTime() - ctRef.getTime()
      const startUTC = new Date(naive.getTime() + offset)
      const endUTC = new Date(startUTC.getTime() + 15 * 60 * 1000)
      const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const payload = {
        title: `Call: ${lead.name || 'Unknown'}`,
        startDate: fmt(startUTC),
        endDate: fmt(endUTC),
        calendar: 'Work',
        description: `Phone: ${lead.phone || 'N/A'}\nLead Type: ${lead.lead_type || lead.leadType || 'N/A'}\nState: ${lead.state || 'N/A'}`,
        alerts: [10],
      }
      const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events`, {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Format for toast
      const [y, m, d] = schedDate.split('-')
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const [hh, mi] = schedTime.split(':')
      const h = Number(hh)
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const timeStr = `${h12}:${mi} ${ampm}`
      appActions?.addToast({ id: Date.now(), type: 'success', message: `📅 Scheduled: ${lead.name || 'Unknown'} on ${dateStr} at ${timeStr}` })
      // Auto-add "Appointment Booked" tag
      if (!leadTags.includes('appointment_booked')) {
        toggleTag('appointment_booked', null)
      }
      setShowScheduler(false)
    } catch (err) {
      appActions?.addToast({ id: Date.now(), type: 'error', message: `Failed to schedule: ${err.message}` })
    } finally {
      setScheduling(false)
    }
  }

  const actionBtnStyle = {
    background: 'none', border: '1px solid var(--theme-border)',
    borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
    fontSize: '12px', transition: 'all 0.15s', lineHeight: 1,
  }

  return (
    <div
      draggable="true"
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      style={{
        padding: '10px 12px', borderRadius: '8px',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border-subtle)',
        marginBottom: '8px', cursor: 'grab',
        transition: 'all 0.15s', position: 'relative',
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = `${color}40` }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
    >
      {/* Batch checkbox */}
      <input
        type="checkbox"
        checked={!!isSelected}
        onChange={(e) => onToggleSelect(lead.id, e)}
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', top: '8px', left: '8px', cursor: 'pointer', accentColor: 'var(--theme-accent)', zIndex: 3 }}
      />

      {/* NEW badge */}
      {showNew && (
        <span style={{
          position: 'absolute', top: '-6px', left: '8px',
          fontSize: '9px', fontWeight: 700, color: '#0ff', letterSpacing: '1px',
          padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(0,255,255,0.15)', border: '1px solid rgba(0,255,255,0.3)',
          animation: 'cc7-pulse 1.5s ease-in-out infinite',
          zIndex: 2,
        }}>NEW</span>
      )}

      {/* Action buttons top-right */}
      <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '2px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onTransfer(lead) }}
          title="Transfer to another pipeline"
          style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
            color: '#3b82f6', fontSize: '11px', cursor: 'pointer',
            padding: '3px 5px', borderRadius: '6px', lineHeight: 1, transition: 'all 0.15s',
          }}
        >🔄</button>
        <button
          onClick={(e) => onDelete(lead.id, lead.name, e)}
          title="Delete lead"
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            color: 'var(--theme-error)', fontSize: '11px', cursor: 'pointer',
            padding: '3px 5px', borderRadius: '6px', lineHeight: 1, transition: 'all 0.15s',
          }}
        >🗑️</button>
      </div>

      {/* Name + AP */}
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px', paddingRight: '52px', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {lead.name || 'Unknown'}
        {Number(lead.premium) > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--theme-success)' }}>
            (${(Number(lead.premium) * 12).toLocaleString()})
          </span>
        )}
      </div>

      {/* Lead Type + Disposition Tags — same row, tags right-aligned under 🔄🗑️ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2px', marginBottom: '4px', paddingLeft: '20px', paddingRight: '2px' }}>
        <div style={{ flex: '0 0 auto' }}>
          {(lead.leadType || lead.lead_type) && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{lead.leadType || lead.lead_type}</span>
          )}
        </div>
        {leadTags.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
            {leadTags.map(tagId => {
              const tag = getTagById(tagId)
              if (!tag) return <span key={tagId} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '5px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#a1a1aa' }}>{tagId}</span>
              return (
                <span key={tagId} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px', background: tag.bg, color: tag.color }}>{tag.label}</span>
              )
            })}
          </div>
        )}
      </div>

      {/* Dynamic fields (excluding leadType — rendered above) */}
      {cardFields.filter(key => key !== 'leadType').map(key => renderCardField(key, lead))}

      {/* Time ago */}
      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
        {lead.createdAt || lead.created_at ? timeAgo(lead.createdAt || lead.created_at) : ''}
      </div>

      {/* Disposition Tag Dropdown — between time ago and action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
        <select
          value=""
          onClick={e => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            if (!e.target.value) return
            toggleTag(e.target.value, e)
            e.target.value = ''
          }}
          style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
            border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
            color: 'var(--theme-text-secondary)', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">+ Tag</option>
          {DISPOSITION_TAGS.map(tag => (
            <option key={tag.id} value={tag.id}>
              {leadTags.includes(tag.id) ? '✓ ' : ''}{tag.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px', borderTop: '1px solid var(--theme-border-subtle)', paddingTop: '8px', flexWrap: 'wrap' }}>
        {lead.phone && <>
          <button onClick={(e) => onPhoneCall(lead, e)} title="Phone call" style={{ ...actionBtnStyle, color: 'var(--theme-success)' }}>📞</button>
          <button onClick={(e) => onVideoCall(lead, e)} title="Video call" style={{ ...actionBtnStyle, color: 'var(--theme-accent)' }}>📹</button>
          <button onClick={(e) => onMessage(lead, e)} title="Send message" style={{ ...actionBtnStyle, color: '#a855f7' }}>💬</button>
        </>}
        <button onClick={(e) => { e.stopPropagation(); setShowQuickNote(v => !v) }} title="Quick note" style={{ ...actionBtnStyle, color: '#f59e0b' }}>✏️</button>
        <button onClick={handleOpenScheduler} title="Schedule Appointment" style={{ ...actionBtnStyle, color: '#3b82f6', opacity: scheduling ? 0.5 : 1 }}>{scheduling ? '⏳' : '📅'}</button>
      </div>

      {/* Quick Note Inline */}
      {showQuickNote && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
          <input
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickNote(e)}
            placeholder="Add note..."
            autoFocus
            style={{
              flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', outline: 'none',
            }}
          />
          <button onClick={handleQuickNote} style={{ ...actionBtnStyle, color: 'var(--theme-success)', fontSize: '10px', padding: '3px 6px' }}>✓</button>
          <button onClick={() => { setShowQuickNote(false); setQuickNote('') }} style={{ ...actionBtnStyle, color: 'var(--theme-text-secondary)', fontSize: '10px', padding: '3px 6px' }}>✕</button>
        </div>
      )}

      {/* Schedule Appointment Inline */}
      {showScheduler && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input
            type="date"
            value={schedDate}
            onChange={e => setSchedDate(e.target.value)}
            style={{
              padding: '4px 6px', fontSize: '11px', borderRadius: '4px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', outline: 'none',
            }}
          />
          <input
            type="time"
            value={schedTime}
            onChange={e => setSchedTime(e.target.value)}
            autoFocus
            style={{
              padding: '4px 6px', fontSize: '11px', borderRadius: '4px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', outline: 'none',
            }}
          />
          <button onClick={handleScheduleSubmit} disabled={!schedTime || scheduling} style={{ ...actionBtnStyle, color: 'var(--theme-success)', fontSize: '10px', padding: '3px 6px', opacity: !schedTime || scheduling ? 0.4 : 1 }}>Schedule</button>
          <button onClick={() => setShowScheduler(false)} style={{ ...actionBtnStyle, color: 'var(--theme-text-secondary)', fontSize: '10px', padding: '3px 6px' }}>✕</button>
        </div>
      )}
    </div>
  )
}
