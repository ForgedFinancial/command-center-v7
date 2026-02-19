import { useState, useEffect, useCallback, useRef } from 'react'
import crmClient from '../../../../api/crmClient'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'
import { LEAD_TYPES } from '../../../../config/leadTypes'
import PipelineHistoryPanel from './PipelineHistoryPanel'
import { getCrossPipelineTransitions, checkOverdue, parseTags, isEscalationTag, formatTimeRemaining, getUrgencyColor, getNurtureDripStatus, getRecycleStatus, getEscalationStatus } from '../../../../services/pipelineLogic'
import { DISPOSITION_TAGS, getTagById } from '../../../../config/dispositionTags'

const TABS = [
  { key: 'contact', icon: '📋', label: 'Contact' },
  { key: 'policy', icon: '📄', label: 'Policy' },
  { key: 'beneficiary', icon: '📦', label: 'Beneficiary' },
  { key: 'pipeline', icon: '🔀', label: 'Pipeline' },
  { key: 'activity', icon: '💬', label: 'Activity' },
]

const RELATIONSHIPS = ['', 'Spouse', 'Child', 'My Children', 'Parent', 'Sibling', 'Estate', 'Trust', 'Friend', 'Other']
const PAYMENT_METHODS = ['', 'Bank Draft', 'Credit Card', 'Check', 'Money Order']

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
  color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px',
}

const rowStyle = { display: 'flex', gap: '12px', marginBottom: '12px' }
const groupStyle = { flex: 1 }

function Field({ label, children }) {
  return (
    <div style={groupStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, onAutoSave, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        style={{
          ...inputStyle,
          borderColor: focused ? 'var(--theme-accent)' : 'var(--theme-border)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focused ? '0 0 0 2px rgba(0,212,255,0.1)' : 'none',
        }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onAutoSave?.() }}
        onKeyDown={e => { if (e.key === 'Enter') { e.target.blur() } }}
        {...props}
      />
      {!focused && (
        <span style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '10px', opacity: 0, transition: 'opacity 0.15s', pointerEvents: 'none',
        }} className="pencil-hint">✏️</span>
      )}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)}>
      {options.map(o => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return <option key={v} value={v}>{l || '— Select —'}</option>
      })}
    </select>
  )
}

export default function LeadDetailModal({ lead, pipeline, stages, onClose, onUpdate, onDelete }) {
  const [tab, setTab] = useState('contact')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedDate, setSchedDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [schedTime, setSchedTime] = useState('10:00')
  const [scheduling, setScheduling] = useState(false)
  const [activityItems, setActivityItems] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    if (lead) setForm({ ...lead })
  }, [lead])

  useEffect(() => {
    if (lead?.id && tab === 'activity') {
      setActivityLoading(true)
      crmClient.getLeadActivity(lead.id)
        .then(res => setActivityItems(res.activity || res.data || []))
        .catch(() => setActivityItems([]))
        .finally(() => setActivityLoading(false))
    }
  }, [lead?.id, tab])

  // Auto-save debounced
  const saveTimerRef = useRef(null)
  const autoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const { id, ...data } = form
        const camelToSnake = {
          leadType: 'lead_type', faceAmount: 'face_amount', policyNumber: 'policy_number',
          draftDate: 'draft_date', paymentMethod: 'payment_method', bankName: 'bank_name',
          beneficiaryRelation: 'beneficiary_relation', beneficiary2Relation: 'beneficiary2_relation',
          lastContact: 'last_contact', nextFollowup: 'next_followup', customFields: 'custom_fields',
          followUp: 'next_followup',
        }
        const snakeData = {}
        for (const [k, v] of Object.entries(data)) {
          if (v === undefined) continue
          snakeData[camelToSnake[k] || k] = v
        }
        await crmClient.updateLead(lead.id, snakeData)
        onUpdate({ ...form, id: lead.id }, false) // don't close modal on auto-save
      } catch {}
    }, 500)
  }, [form, lead?.id, onUpdate])

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  if (!lead) return null

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { id, ...data } = form
      // Convert camelCase to snake_case for D1 Worker API
      const snakeData = {}
      const camelToSnake = {
        leadType: 'lead_type', faceAmount: 'face_amount', policyNumber: 'policy_number',
        draftDate: 'draft_date', paymentMethod: 'payment_method', bankName: 'bank_name',
        beneficiaryRelation: 'beneficiary_relation', beneficiary2Relation: 'beneficiary2_relation',
        lastContact: 'last_contact', nextFollowup: 'next_followup', customFields: 'custom_fields',
        followUp: 'next_followup',
      }
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) continue
        snakeData[camelToSnake[k] || k] = v
      }
      await crmClient.updateLead(lead.id, snakeData)
      onUpdate({ ...form, id: lead.id }, true) // close modal on explicit Save
    } catch (e) {
      console.error('Save failed:', e)
    }
    setSaving(false)
  }

  const handleSchedule = async () => {
    setScheduling(true)
    try {
      const leadName = form.name || `${form.first_name || ''} ${form.last_name || ''}`.trim() || 'Lead'
      const start = new Date(`${schedDate}T${schedTime}:00`)
      const end = new Date(start.getTime() + 15 * 60000) // 15 min appointment
      const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events`, {
        method: 'POST',
        headers: getSyncHeaders(),
        body: JSON.stringify({
          title: `Call: ${leadName}`,
          start: start.toISOString(), end: end.toISOString(),
          calendar: 'Work',
          description: `Phone: ${form.phone || 'N/A'}\nEmail: ${form.email || 'N/A'}\nState: ${form.state || 'N/A'}\nLead Type: ${form.lead_type || form.leadType || 'FEX'}`,
          alerts: [10], // 10 min reminder via iCloud VALARM
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Fire internal notification
      const _start = new Date(`${schedDate}T${schedTime}:00`)
      const _dateStr = _start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const _h = _start.getHours(), _ampm = _h >= 12 ? 'PM' : 'AM', _h12 = _h === 0 ? 12 : _h > 12 ? _h - 12 : _h
      const _timeStr = `${_h12}:${String(_start.getMinutes()).padStart(2,'0')} ${_ampm}`
      fetch(`${WORKER_PROXY_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('cc_auth_token') || ''}` },
        body: JSON.stringify({
          title: `📅 Appointment Scheduled`,
          description: `${leadName} — ${_dateStr} at ${_timeStr}`,
          type: 'success',
          meta: { leadId: lead.id, leadName, date: schedDate, time: schedTime }
        })
      }).catch(() => {})
      // Auto-add Appointment Booked tag
      const currentTags = (() => { try { return JSON.parse(form.tags || '[]') } catch { return [] } })()
      if (!currentTags.includes('appt_booked')) {
        const newTags = [...currentTags, 'appt_booked']
        await crmClient.updateLead(lead.id, { tags: JSON.stringify(newTags) })
        onUpdate({ ...form, id: lead.id, tags: JSON.stringify(newTags) }, false)
      }
      setShowSchedule(false)
    } catch (err) {
      console.error('Schedule failed:', err)
    } finally { setScheduling(false) }
  }

  const handleDelete = () => {
    if (confirm('Delete this lead permanently?')) {
      crmClient.deleteLead(lead.id).catch(() => {})
      onDelete(lead.id)
    }
  }

  const addNote = () => {
    if (!newNote.trim()) return
    const notes = form.notes ? `${form.notes}\n[${new Date().toLocaleString()}] ${newNote}` : `[${new Date().toLocaleString()}] ${newNote}`
    setForm(f => ({ ...f, notes }))
    setNewNote('')
    crmClient.updateLead(lead.id, { notes }).catch(err => console.error('[LEAD] Note save failed:', err))
  }

  const initials = (form.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '640px', maxHeight: '85vh', overflow: 'auto',
        background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '0',
      }}>
        <style>{`
          div:hover > .pencil-hint { opacity: 0.5 !important; }
        `}</style>
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--theme-border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700, color: 'var(--theme-accent-text)',
              }}>{initials}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>{form.name || 'Lead'}</h2>
                  {Number(form.premium) > 0 && (
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--theme-success)' }}>
                      (${(Number(form.premium) * 12).toLocaleString()})
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                  background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)',
                }}>{form.stage || 'new_lead'}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: tab === t.key ? 600 : 400,
                border: 'none', cursor: 'pointer',
                background: tab === t.key ? 'var(--theme-accent-muted)' : 'transparent',
                color: tab === t.key ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px' }}>
          {tab === 'contact' && (
            <>
              <div style={rowStyle}>
                <Field label="Client Name"><Input value={form.name} onChange={set('name')} onAutoSave={autoSave} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={set('phone')} onAutoSave={autoSave} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Email"><Input value={form.email} onChange={set('email')} type="email" onAutoSave={autoSave} /></Field>
                <Field label="Lead Type"><Select value={form.leadType} onChange={v => { set('leadType')(v); setTimeout(autoSave, 100) }} options={[['', '— Select —'], ...LEAD_TYPES.map(t => [t, t])]} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Stage"><Select value={form.stage} onChange={v => { set('stage')(v); setTimeout(autoSave, 100) }} options={[['', '— Select —'], ...(stages || []).map(s => [s.id, s.name])]} /></Field>
                <Field label="Priority"><Select value={form.priority} onChange={v => { set('priority')(v); setTimeout(autoSave, 100) }} options={[['Normal', 'Normal'], ['High', 'High'], ['Urgent', 'Urgent']]} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Value ($)"><Input value={form.value} onChange={set('value')} type="number" onAutoSave={autoSave} /></Field>
                <Field label="State"><Input value={form.state} onChange={set('state')} maxLength={2} onAutoSave={autoSave} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Tags">
                  <DispositionTagPicker
                    tags={form.tags}
                    onChange={(updated) => { set('tags')(updated); setTimeout(autoSave, 100) }}
                  />
                </Field>
                <Field label="Follow-up Date"><Input value={form.followUp} onChange={set('followUp')} type="date" onAutoSave={autoSave} /></Field>
              </div>
            </>
          )}

          {tab === 'policy' && (
            <>
              <div style={rowStyle}>
                <Field label="Carrier"><Input value={form.carrier} onChange={set('carrier')} onAutoSave={autoSave} /></Field>
                <Field label="Premium ($/mo)"><Input value={form.premium} onChange={set('premium')} type="number" onAutoSave={autoSave} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Policy Number"><Input value={form.policyNumber} onChange={set('policyNumber')} onAutoSave={autoSave} /></Field>
                <Field label="Face Amount ($)"><Input value={form.faceAmount} onChange={set('faceAmount')} type="number" onAutoSave={autoSave} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Draft Date"><Input value={form.draftDate} onChange={set('draftDate')} type="date" onAutoSave={autoSave} /></Field>
                <Field label="Payment Method"><Select value={form.paymentMethod} onChange={v => { set('paymentMethod')(v); setTimeout(autoSave, 100) }} options={PAYMENT_METHODS.map(m => [m, m || '— Select —'])} /></Field>
              </div>
              <Field label="Notes">
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes')(e.target.value)} onBlur={autoSave} />
              </Field>
            </>
          )}

          {tab === 'beneficiary' && (
            <>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Beneficiary Information</h4>
              <div style={rowStyle}>
                <Field label="Primary Beneficiary"><Input value={form.beneficiary} onChange={set('beneficiary')} onAutoSave={autoSave} /></Field>
                <Field label="Relationship"><Select value={form.beneficiaryRelation} onChange={v => { set('beneficiaryRelation')(v); setTimeout(autoSave, 100) }} options={RELATIONSHIPS.map(r => [r, r || '— Select —'])} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Secondary Beneficiary"><Input value={form.beneficiary2} onChange={set('beneficiary2')} onAutoSave={autoSave} /></Field>
                <Field label="Relationship"><Select value={form.beneficiary2Relation} onChange={v => { set('beneficiary2Relation')(v); setTimeout(autoSave, 100) }} options={RELATIONSHIPS.map(r => [r, r || '— Select —'])} /></Field>
              </div>
              <h4 style={{ margin: '20px 0 12px', fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Personal Details</h4>
              <div style={rowStyle}>
                <Field label="Date of Birth"><Input value={form.dob} onChange={set('dob')} type="date" onAutoSave={autoSave} /></Field>
                <Field label="SSN (Last 4)"><Input value={form.ssn} onChange={set('ssn')} maxLength={4} placeholder="****" onAutoSave={autoSave} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Bank Name"><Input value={form.bankName} onChange={set('bankName')} onAutoSave={autoSave} /></Field>
                <Field label="Routing # (Last 4)"><Input value={form.routing} onChange={set('routing')} maxLength={4} placeholder="****" onAutoSave={autoSave} /></Field>
              </div>
            </>
          )}

          {tab === 'pipeline' && (
            <div style={{ color: 'var(--theme-text-secondary)', fontSize: '13px' }}>
              {/* Current pipeline/stage context */}
              <div style={{
                padding: '12px', borderRadius: '8px', background: 'var(--theme-bg)',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: 'var(--theme-text-secondary)' }}>
                  Current Position
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--theme-text-primary)', fontWeight: 600 }}>
                    {pipeline?.name || 'Pipeline'}
                  </span>
                  <span style={{ color: 'var(--theme-text-secondary)' }}>›</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                    background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontWeight: 600,
                  }}>
                    {stages?.find(s => s.id === (form.stage_id || form.stageId))?.name || form.stage || 'Unknown'}
                  </span>
                </div>
                {/* Tags */}
                {(() => {
                  const tags = parseTags(form.tags)
                  if (tags.length === 0) return null
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {tags.map(tag => (
                        <span key={tag} style={{
                          padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 500,
                          background: isEscalationTag(tag) ? 'rgba(239,68,68,0.1)' : 'rgba(0,212,255,0.08)',
                          color: isEscalationTag(tag) ? '#ef4444' : '#00d4ff',
                        }}>| {tag} |</span>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Stage progression */}
              {stages && stages.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', color: 'var(--theme-text-secondary)' }}>
                    Stage Progression
                  </div>
                  {stages.map((stg, idx) => {
                    const currentStageId = form.stage_id || form.stageId
                    const currentIdx = stages.findIndex(s => s.id === currentStageId)
                    const isCurrent = stg.id === currentStageId
                    const isPast = idx < currentIdx
                    return (
                      <div key={stg.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0',
                        borderLeft: `2px solid ${isPast || isCurrent ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
                        paddingLeft: '16px', marginLeft: '8px',
                      }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', marginLeft: '-22px', flexShrink: 0,
                          background: isCurrent ? 'var(--theme-accent)' : isPast ? 'var(--theme-accent-muted)' : 'var(--theme-surface)',
                          border: isCurrent ? 'none' : '1px solid var(--theme-border)',
                        }} />
                        <span style={{
                          color: isCurrent ? 'var(--theme-accent)' : isPast ? 'var(--theme-text-secondary)' : '#52525b',
                          fontWeight: isCurrent ? 600 : 400, fontSize: '12px',
                        }}>{stg.name}</span>
                        {isCurrent && <span style={{ fontSize: '10px', color: 'var(--theme-accent)' }}>← Current</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pipeline history */}
              <div style={{ borderTop: '1px solid var(--theme-border-subtle)', paddingTop: '12px' }}>
                <PipelineHistoryPanel leadId={lead.id} />
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input style={{ ...inputStyle, flex: 1 }} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Type a note..." onKeyDown={e => e.key === 'Enter' && addNote()} />
                <button onClick={addNote} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>Add</button>
              </div>
              {activityLoading ? (
                <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Loading activity...</div>
              ) : activityItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activityItems.map((item, i) => (
                    <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--theme-bg-tertiary)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--theme-text-primary)' }}>
                          {item.type === 'stage_change' ? '🔀' : item.type === 'call' ? '📞' : item.type === 'note' ? '📝' : '📌'} {item.type?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: 'var(--theme-text-secondary)' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      <div style={{ color: 'var(--theme-text-secondary)' }}>{item.description || item.details || item.content || ''}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {form.notes || 'No activity yet.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--theme-border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleDelete} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-error)',
              background: 'transparent', color: 'var(--theme-error)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>🗑️ Delete</button>
            <button onClick={() => setShowSchedule(!showSchedule)} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
              background: showSchedule ? 'var(--theme-accent-muted)' : 'var(--theme-accent-muted)', color: 'var(--theme-accent)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>📅 Schedule Appointment</button>
          </div>
          {showSchedule && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                style={{ ...inputStyle, width: '140px', padding: '6px 8px', fontSize: '12px' }} />
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                style={{ ...inputStyle, width: '100px', padding: '6px 8px', fontSize: '12px' }} />
              <button onClick={handleSchedule} disabled={scheduling} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', whiteSpace: 'nowrap',
                background: scheduling ? 'var(--theme-surface)' : 'var(--theme-accent)', color: scheduling ? 'var(--theme-text-secondary)' : 'var(--theme-accent-text)',
                fontSize: '12px', fontWeight: 600, cursor: scheduling ? 'default' : 'pointer',
              }}>{scheduling ? '...' : '✓ Add'}</button>
            </div>
          )}
          {!showSchedule && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)',
                background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--theme-success)',
                background: 'var(--theme-accent-muted)', color: 'var(--theme-success)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Disposition Tag Picker — multi-select with colored tags
function DispositionTagPicker({ tags, onChange }) {
  const [open, setOpen] = useState(false)

  // Parse tags to array
  const tagList = Array.isArray(tags) ? tags : (() => {
    if (!tags) return []
    if (typeof tags === 'string') { try { return JSON.parse(tags) } catch { return tags.split(',').map(t => t.trim()).filter(Boolean) } }
    return []
  })()

  const toggle = (tagId) => {
    const updated = tagList.includes(tagId) ? tagList.filter(t => t !== tagId) : [...tagList, tagId]
    onChange(updated)
  }

  return (
    <div>
      {/* Current tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px', minHeight: '24px' }}>
        {tagList.map(tagId => {
          const tag = getTagById(tagId)
          return (
            <span
              key={tagId}
              onClick={() => toggle(tagId)}
              style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                background: tag?.bg || 'rgba(255,255,255,0.08)', color: tag?.color || '#a1a1aa',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {tag?.label || tagId} <span style={{ fontSize: '8px', opacity: 0.7 }}>✕</span>
            </span>
          )
        })}
        <button
          onClick={() => setOpen(!open)}
          style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--theme-text-secondary)',
          }}
        >+ Tag</button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', padding: '4px' }}>
          {DISPOSITION_TAGS.map(tag => {
            const active = tagList.includes(tag.id)
            return (
              <div
                key={tag.id}
                onClick={() => toggle(tag.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 8px', borderRadius: '4px', cursor: 'pointer',
                  background: active ? tag.bg : 'transparent', marginBottom: '1px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: active ? tag.color : 'var(--theme-text-secondary)', fontWeight: active ? 600 : 400, flex: 1 }}>{tag.label}</span>
                {active && <span style={{ fontSize: '10px', color: tag.color }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
