import { useState, useEffect } from 'react'
import crmClient from '../../../../api/crmClient'
import { WORKER_PROXY_URL } from '../../../../config/api'

const TABS = [
  { key: 'contact', icon: '📋', label: 'Contact' },
  { key: 'policy', icon: '📄', label: 'Policy' },
  { key: 'beneficiary', icon: '📦', label: 'Beneficiary' },
  { key: 'progress', icon: '📈', label: 'Progress' },
  { key: 'activity', icon: '💬', label: 'Activity' },
]

const STAGE_OPTIONS = [
  ['new_lead', 'New Lead'], ['contact', 'Contacted'], ['engaged', 'Engaged'],
  ['qualified', 'Qualified'], ['proposal', 'Proposal'], ['sold', 'Won'],
]

const LEAD_TYPES = ['FEX', 'IUL', 'TRUCKER', 'TERM', 'WHOLE', 'ANNUITY', 'MORTGAGE PROTECTION', 'VETERANS']
const RELATIONSHIPS = ['', 'Spouse', 'Child', 'Parent', 'Sibling', 'Estate', 'Trust', 'Other']
const PAYMENT_METHODS = ['', 'Bank Draft', 'Credit Card', 'Check', 'Money Order']

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: '#e4e4e7', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#71717a',
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

function Input({ value, onChange, ...props }) {
  return <input style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} {...props} />
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

export default function LeadDetailModal({ lead, onClose, onUpdate, onDelete }) {
  const [tab, setTab] = useState('contact')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedDate, setSchedDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [schedTime, setSchedTime] = useState('10:00')
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    if (lead) setForm({ ...lead })
  }, [lead])

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
      onUpdate({ ...form, id: lead.id })
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
      const end = new Date(start.getTime() + 30 * 60000) // 30 min appointment
      const res = await fetch(`${WORKER_PROXY_URL}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0' },
        body: JSON.stringify({
          title: `Call: ${leadName}`,
          start: start.toISOString(), end: end.toISOString(),
          calendar: 'Work',
          description: `Phone: ${form.phone || 'N/A'}\nEmail: ${form.email || 'N/A'}\nState: ${form.state || 'N/A'}\nLead Type: ${form.lead_type || 'FEX'}`,
          alerts: [10], // 10 min reminder
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setShowSchedule(false)
      alert(`📅 Scheduled: Call ${leadName} on ${schedDate} at ${schedTime} (10-min reminder set)`)
    } catch (err) {
      alert(`Failed to schedule: ${err.message}`)
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
  }

  const initials = (form.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '640px', maxHeight: '85vh', overflow: 'auto',
        background: '#1a1a2e', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)', padding: '0',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700, color: '#fff',
              }}>{initials}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e4e4e7' }}>{form.name || 'Lead'}</h2>
                  {form.premium && Number(form.premium) > 0 && (
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80' }}>
                      (${(Number(form.premium) * 12).toLocaleString()})
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                  background: 'rgba(0,212,255,0.15)', color: '#00d4ff',
                }}>{form.stage || 'new_lead'}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: tab === t.key ? 600 : 400,
                border: 'none', cursor: 'pointer',
                background: tab === t.key ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: tab === t.key ? '#00d4ff' : '#71717a',
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px' }}>
          {tab === 'contact' && (
            <>
              <div style={rowStyle}>
                <Field label="Client Name"><Input value={form.name} onChange={set('name')} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Email"><Input value={form.email} onChange={set('email')} type="email" /></Field>
                <Field label="Lead Type"><Select value={form.leadType} onChange={set('leadType')} options={[['', '— Select —'], ...LEAD_TYPES.map(t => [t, t])]} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Stage"><Select value={form.stage} onChange={set('stage')} options={STAGE_OPTIONS} /></Field>
                <Field label="Priority"><Select value={form.priority} onChange={set('priority')} options={[['Normal', 'Normal'], ['High', 'High'], ['Urgent', 'Urgent']]} /></Field>
                <Field label="Pipeline"><Select value={form.pipeline} onChange={set('pipeline')} options={[['new', 'New Leads'], ['aged', 'Aged Leads']]} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Value ($)"><Input value={form.value} onChange={set('value')} type="number" /></Field>
                <Field label="State"><Input value={form.state} onChange={set('state')} maxLength={2} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Tags"><Input value={form.tags} onChange={set('tags')} placeholder="warm, referral" /></Field>
                <Field label="Follow-up Date"><Input value={form.followUp} onChange={set('followUp')} type="date" /></Field>
              </div>
            </>
          )}

          {tab === 'policy' && (
            <>
              <div style={rowStyle}>
                <Field label="Carrier"><Input value={form.carrier} onChange={set('carrier')} /></Field>
                <Field label="Premium ($/mo)"><Input value={form.premium} onChange={set('premium')} type="number" /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Policy Number"><Input value={form.policyNumber} onChange={set('policyNumber')} /></Field>
                <Field label="Face Amount ($)"><Input value={form.faceAmount} onChange={set('faceAmount')} type="number" /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Draft Date"><Input value={form.draftDate} onChange={set('draftDate')} type="date" /></Field>
                <Field label="Payment Method"><Select value={form.paymentMethod} onChange={set('paymentMethod')} options={PAYMENT_METHODS.map(m => [m, m || '— Select —'])} /></Field>
              </div>
              <Field label="Notes">
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.notes || ''} onChange={e => set('notes')(e.target.value)} />
              </Field>
            </>
          )}

          {tab === 'beneficiary' && (
            <>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#a1a1aa' }}>Beneficiary Information</h4>
              <div style={rowStyle}>
                <Field label="Primary Beneficiary"><Input value={form.beneficiary} onChange={set('beneficiary')} /></Field>
                <Field label="Relationship"><Select value={form.beneficiaryRelation} onChange={set('beneficiaryRelation')} options={RELATIONSHIPS.map(r => [r, r || '— Select —'])} /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Secondary Beneficiary"><Input value={form.beneficiary2} onChange={set('beneficiary2')} /></Field>
                <Field label="Relationship"><Select value={form.beneficiary2Relation} onChange={set('beneficiary2Relation')} options={RELATIONSHIPS.map(r => [r, r || '— Select —'])} /></Field>
              </div>
              <h4 style={{ margin: '20px 0 12px', fontSize: '13px', color: '#a1a1aa' }}>Personal Details</h4>
              <div style={rowStyle}>
                <Field label="Date of Birth"><Input value={form.dob} onChange={set('dob')} type="date" /></Field>
                <Field label="SSN (Last 4)"><Input value={form.ssn} onChange={set('ssn')} maxLength={4} placeholder="****" /></Field>
              </div>
              <div style={rowStyle}>
                <Field label="Bank Name"><Input value={form.bankName} onChange={set('bankName')} /></Field>
                <Field label="Routing # (Last 4)"><Input value={form.routing} onChange={set('routing')} maxLength={4} placeholder="****" /></Field>
              </div>
            </>
          )}

          {tab === 'progress' && (
            <div style={{ color: '#71717a', fontSize: '13px' }}>
              <h4 style={{ margin: '0 0 12px', color: '#a1a1aa' }}>Stage Timeline</h4>
              {STAGE_OPTIONS.map(([val, label]) => {
                const isCurrent = form.stage === val
                const isPast = STAGE_OPTIONS.findIndex(s => s[0] === form.stage) >= STAGE_OPTIONS.findIndex(s => s[0] === val)
                return (
                  <div key={val} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
                    borderLeft: `2px solid ${isPast ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`, paddingLeft: '16px', marginLeft: '8px',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', marginLeft: '-22px',
                      background: isCurrent ? '#00d4ff' : isPast ? '#00d4ff80' : 'rgba(255,255,255,0.1)',
                    }} />
                    <span style={{ color: isCurrent ? '#00d4ff' : isPast ? '#a1a1aa' : '#52525b', fontWeight: isCurrent ? 600 : 400 }}>{label}</span>
                    {isCurrent && <span style={{ fontSize: '10px', color: '#00d4ff' }}>← Current</span>}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'activity' && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input style={{ ...inputStyle, flex: 1 }} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Type a note..." onKeyDown={e => e.key === 'Enter' && addNote()} />
                <button onClick={addNote} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: 'rgba(0,212,255,0.15)', color: '#00d4ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>Add</button>
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1aa', whiteSpace: 'pre-wrap' }}>
                {form.notes || <span style={{ color: '#52525b' }}>No notes yet.</span>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleDelete} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>🗑️ Delete</button>
            <button onClick={() => setShowSchedule(!showSchedule)} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.3)',
              background: showSchedule ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.08)', color: '#00d4ff',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>📅 Schedule Call</button>
          </div>
          {showSchedule && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                style={{ ...inputStyle, width: '140px', padding: '6px 8px', fontSize: '12px' }} />
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                style={{ ...inputStyle, width: '100px', padding: '6px 8px', fontSize: '12px' }} />
              <button onClick={handleSchedule} disabled={scheduling} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', whiteSpace: 'nowrap',
                background: scheduling ? '#27272a' : '#00d4ff', color: scheduling ? '#52525b' : '#000',
                fontSize: '12px', fontWeight: 600, cursor: scheduling ? 'default' : 'pointer',
              }}>{scheduling ? '...' : '✓ Add'}</button>
            </div>
          )}
          {!showSchedule && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#a1a1aa', fontSize: '12px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.3)',
                background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
