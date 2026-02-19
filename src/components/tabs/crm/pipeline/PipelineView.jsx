import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { useApp } from '../../../../context/AppContext'
import crmClient from '../../../../api/crmClient'
import { CRM_STAGES } from '../../../../config/crm'
import { WORKER_PROXY_URL } from '../../../../config/api'
import PipelineModeToggle, { filterByPipelineMode } from '../PipelineModeToggle'
import EmptyState from '../../../shared/EmptyState'
import LeadDetailModal from './LeadDetailModal'

const LEAD_TYPES = ['FEX', 'VETERANS', 'MORTGAGE PROTECTION', 'TRUCKERS', 'IUL']

// ========================================
// Card Field Customization System
// ========================================
const DEFAULT_CARD_FIELDS = ['leadType', 'dob', 'phone', 'faceAmount', 'beneficiary', 'createdAt']
const ALWAYS_SHOWN = ['name']
const MAX_CUSTOM_FIELDS = 10

const ALL_CARD_FIELDS = [
  { key: 'leadType', label: 'Lead Type Badge', icon: '🏷️' },
  { key: 'dob', label: 'DOB + Age', icon: '🎂' },
  { key: 'phone', label: 'Phone Number', icon: '📞' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'state', label: 'State', icon: '📍' },
  { key: 'faceAmount', label: 'Coverage/Amount', icon: '💰' },
  { key: 'beneficiary', label: 'Beneficiary Name', icon: '👤' },
  { key: 'beneficiaryRelation', label: 'Beneficiary Relationship', icon: '🤝' },
  { key: 'gender', label: 'Gender', icon: '⚧' },
  { key: 'healthHistory', label: 'Health History', icon: '🏥' },
  { key: 'hasLifeInsurance', label: 'Has Life Insurance', icon: '🛡️' },
  { key: 'favoriteHobby', label: 'Favorite Hobby', icon: '🎯' },
  { key: 'adSource', label: 'Ad Source', icon: '📢' },
  { key: 'platform', label: 'Platform', icon: '📱' },
  { key: 'age', label: 'Age (standalone)', icon: '🎂' },
  { key: 'premium', label: 'Premium', icon: '💵' },
  { key: 'carrier', label: 'Carrier', icon: '🏢' },
  { key: 'policyNumber', label: 'Policy Number', icon: '📋' },
  { key: 'notes', label: 'Notes', icon: '📝' },
  { key: 'createdAt', label: 'Date/Time Requested', icon: '🕐' },
]

function loadCardFields() {
  try {
    const saved = JSON.parse(localStorage.getItem('cc7-card-fields'))
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch {}
  return DEFAULT_CARD_FIELDS
}

function saveCardFields(fields) {
  localStorage.setItem('cc7-card-fields', JSON.stringify(fields))
}

const STAGE_ORDER = ['new_lead', 'contact', 'engaged', 'qualified', 'proposal', 'sold']

const STAGE_LABELS = {
  new_lead: 'New Leads',
  contact: 'Contacted',
  engaged: 'Engaged',
  qualified: 'Qualified',
  proposal: 'Proposal',
  sold: 'Won',
}

const STAGE_COLORS = {
  new_lead: '#3b82f6',
  contact: '#a855f7',
  engaged: 'var(--theme-accent)',
  qualified: '#f59e0b',
  proposal: '#f97316',
  sold: '#4ade80',
}

export default function PipelineView() {
  const { state, actions } = useCRM()
  const { actions: appActions } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [leadTypeFilter, setLeadTypeFilter] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [showNewLead, setShowNewLead] = useState(false)
  const [showCardSettings, setShowCardSettings] = useState(false)
  const [cardFields, setCardFields] = useState(loadCardFields)
  const dragLeadId = useRef(null)

  const filteredLeads = useMemo(() => {
    let leads = filterByPipelineMode(state.leads, state.pipelineMode)
    if (leadTypeFilter) leads = leads.filter(l => l.leadType === leadTypeFilter)
    return leads
  }, [state.leads, state.pipelineMode, leadTypeFilter])

  const columns = useMemo(() => {
    return STAGE_ORDER.map(stage => {
      const leads = filteredLeads.filter(l => l.stage === stage)
      const totalValue = leads.reduce((s, l) => s + (Number(l.premium) > 0 ? Number(l.premium) * 12 : 0), 0)
      return { stage, label: STAGE_LABELS[stage], color: STAGE_COLORS[stage], leads, totalValue }
    })
  }, [filteredLeads])

  // Drag handlers
  const onDragStart = (e, leadId) => {
    dragLeadId.current = leadId
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e, stage) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }
  const onDragLeave = () => setDragOverStage(null)
  const onDrop = async (e, targetStage) => {
    e.preventDefault()
    setDragOverStage(null)
    const leadId = dragLeadId.current
    if (!leadId) return
    const lead = state.leads.find(l => l.id === leadId)
    if (!lead || lead.stage === targetStage) return
    // Optimistic update
    actions.updateLead({ id: leadId, stage: targetStage })
    try {
      await crmClient.updateLead(leadId, { stage: targetStage })
    } catch (err) {
      console.error('Failed to update stage:', err)
      actions.updateLead({ id: leadId, stage: lead.stage }) // rollback
    }
  }

  // Seen leads tracking for NEW badge
  const [seenLeads, setSeenLeads] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cc7-seen-leads') || '[]')) } catch { return new Set() }
  })
  const markSeen = useCallback((leadId) => {
    setSeenLeads(prev => {
      const next = new Set(prev)
      next.add(leadId)
      localStorage.setItem('cc7-seen-leads', JSON.stringify([...next]))
      return next
    })
  }, [])

  // Delete handler
  const handleDeleteLead = (leadId, leadName, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!confirm(`Delete ${leadName || 'this lead'}?`)) return
    actions.removeLead(leadId)
    crmClient.deleteLead(leadId).catch(() => {})
  }

  // Phone action handlers
  const handlePhoneCall = useCallback((lead, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!lead.phone) return
    markSeen(lead.id)
    appActions.addToast({ id: Date.now(), type: 'info', message: `📞 Calling ${lead.name}...` })
    fetch(`${WORKER_PROXY_URL}/api/phone/call`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: lead.phone }),
    }).catch(() => appActions.addToast({ id: Date.now(), type: 'error', message: 'Call failed' }))
  }, [appActions])

  const handleVideoCall = useCallback((lead, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!lead.phone) return
    appActions.addToast({ id: Date.now(), type: 'info', message: `📹 Starting video call with ${lead.name}...` })
    fetch(`${WORKER_PROXY_URL}/api/phone/video`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: lead.phone }),
    }).then(r => r.json()).then(data => {
      if (data.method === 'google-meet') {
        window.open('https://meet.google.com/new', '_blank')
        appActions.addToast({ id: Date.now(), type: 'info', message: 'Opening Google Meet...' })
      }
    }).catch(() => appActions.addToast({ id: Date.now(), type: 'error', message: 'Video call failed' }))
  }, [appActions])

  const handleMessage = useCallback((lead, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!lead.phone) return
    // Navigate to CRM Messages view
    actions.setView('messages')
    appActions.addToast({ id: Date.now(), type: 'info', message: `💬 Opening messages for ${lead.name}...` })
    // Also trigger Mac Messages app
    fetch(`${WORKER_PROXY_URL}/api/phone/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: lead.phone }),
    }).catch(() => {})
  }, [actions, appActions])

  // Modal handlers
  const handleModalUpdate = (updatedLead) => {
    actions.updateLead(updatedLead)
    setSelectedLead(null)
  }
  const handleModalDelete = (id) => {
    actions.removeLead(id)
    setSelectedLead(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>Pipeline</h2>
          <button
            onClick={() => setShowCardSettings(true)}
            title="Customize card fields"
            style={{
              background: 'var(--theme-bg)', border: '1px solid var(--theme-border)',
              borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
              fontSize: '14px', color: 'var(--theme-text-secondary)', transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--theme-surface-hover)'; e.currentTarget.style.color = 'var(--theme-text-primary)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--theme-bg)'; e.currentTarget.style.color = 'var(--theme-text-secondary)' }}
          >⚙️</button>
          <PipelineModeToggle />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={leadTypeFilter}
            onChange={(e) => setLeadTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: '8px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-secondary)', fontSize: '12px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All Lead Types</option>
            {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setShowUpload(true)} style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
            color: 'var(--theme-text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>📤 Upload Leads</button>
          <button onClick={() => setShowNewLead(true)} style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)',
            color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>+ New Lead</button>
        </div>
      </div>

      {/* Kanban */}
      {state.leads.length === 0 ? (
        <EmptyState icon="🔀" title="No Leads Yet" message="Add leads to see your pipeline." />
      ) : (
        <div style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto', paddingBottom: '12px' }}>
          {columns.map(col => (
            <div
              key={col.stage}
              onDragOver={(e) => onDragOver(e, col.stage)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.stage)}
              style={{
                minWidth: '260px', maxWidth: '260px', flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                transition: 'box-shadow 0.15s',
                boxShadow: dragOverStage === col.stage ? `inset 0 0 0 2px ${col.color}60` : 'none',
                borderRadius: '10px',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '12px 14px', borderRadius: '10px 10px 0 0',
                background: 'var(--theme-surface)',
                borderBottom: `2px solid ${col.color}30`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>{col.label}</span>
                  {col.leads.length > 0 && (
                    <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                      background: `${col.color}20`, color: col.color, fontWeight: 600,
                    }}>{col.leads.length}</span>
                  )}
                </div>
                {col.totalValue > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>
                    ${col.totalValue.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '8px',
                background: dragOverStage === col.stage ? `${col.color}08` : 'rgba(255,255,255,0.015)',
                borderRadius: '0 0 10px 10px', transition: 'background 0.15s',
              }}>
                {col.leads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    color={col.color}
                    cardFields={cardFields}
                    onDragStart={onDragStart}
                    onClick={() => { setSelectedLead(lead); markSeen(lead.id) }}
                    onDelete={handleDeleteLead}
                    onPhoneCall={handlePhoneCall}
                    onVideoCall={handleVideoCall}
                    onMessage={handleMessage}
                    isNew={!seenLeads.has(lead.id)}
                    onMarkSeen={markSeen}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadLeadsModal onClose={() => setShowUpload(false)} actions={actions} />}
      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} actions={actions} />}
      {showCardSettings && <CardFieldSettings
        fields={cardFields}
        onSave={(f) => { setCardFields(f); saveCardFields(f); setShowCardSettings(false) }}
        onClose={() => setShowCardSettings(false)}
      />}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleModalUpdate}
          onDelete={handleModalDelete}
        />
      )}
    </div>
  )
}

// Field renderer for dynamic card fields
function renderCardField(key, lead) {
  const age = lead.dob ? Math.floor((Date.now() - new Date(lead.dob).getTime()) / 31557600000) : null
  const fieldStyle = { fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '2px' }

  switch (key) {
    case 'leadType':
      if (!lead.leadType && !lead.lead_type) return null
      return (
        <div key={key} style={fieldStyle}>
          <span style={{
            padding: '1px 5px', borderRadius: '4px', background: 'rgba(168,85,247,0.15)',
            color: '#a855f7', fontSize: '10px', fontWeight: 600,
          }}>{lead.leadType || lead.lead_type}</span>
        </div>
      )
    case 'dob':
      if (!lead.dob) return null
      return <div key={key} style={fieldStyle}>🎂 {lead.dob}{age != null ? ` (${age})` : ''}</div>
    case 'phone':
      if (!lead.phone) return null
      return <div key={key} style={{ fontSize: '12px', color: 'var(--theme-phone)', fontWeight: 700, marginBottom: '2px' }}>📞 {formatPhone(lead.phone)}</div>
    case 'email':
      if (!lead.email) return null
      return <div key={key} style={fieldStyle}>✉️ {lead.email}</div>
    case 'state':
      if (!lead.state) return null
      return <div key={key} style={fieldStyle}>📍 {lead.state}</div>
    case 'faceAmount':
      if (!lead.faceAmount && !lead.face_amount) return null
      return <div key={key} style={fieldStyle}>💰 {lead.faceAmount || lead.face_amount} coverage</div>
    case 'beneficiary':
      if (!lead.beneficiary) return null
      return <div key={key} style={fieldStyle}>👤 {lead.beneficiary}</div>
    case 'beneficiaryRelation':
      if (!lead.beneficiaryRelation && !lead.beneficiary_relation) return null
      return <div key={key} style={fieldStyle}>🤝 {lead.beneficiaryRelation || lead.beneficiary_relation}</div>
    case 'gender':
      if (!lead.gender) return null
      return <div key={key} style={fieldStyle}>⚧ {lead.gender}</div>
    case 'healthHistory':
      if (!lead.healthHistory && !lead.health_history) return null
      return <div key={key} style={fieldStyle}>🏥 {lead.healthHistory || lead.health_history}</div>
    case 'hasLifeInsurance':
      if (lead.hasLifeInsurance == null && lead.has_life_insurance == null) return null
      return <div key={key} style={fieldStyle}>🛡️ {(lead.hasLifeInsurance || lead.has_life_insurance) ? 'Yes' : 'No'}</div>
    case 'favoriteHobby':
      if (!lead.favoriteHobby && !lead.favorite_hobby) return null
      return <div key={key} style={fieldStyle}>🎯 {lead.favoriteHobby || lead.favorite_hobby}</div>
    case 'adSource':
      if (!lead.adSource && !lead.ad_source) return null
      return <div key={key} style={fieldStyle}>📢 {lead.adSource || lead.ad_source}</div>
    case 'platform':
      if (!lead.platform) return null
      return <div key={key} style={fieldStyle}>📱 {lead.platform}</div>
    case 'age':
      if (!lead.age && age == null) return null
      return <div key={key} style={fieldStyle}>🎂 {lead.age || age}</div>
    case 'premium':
      if (!lead.premium) return null
      return <div key={key} style={fieldStyle}>💵 ${Number(lead.premium).toLocaleString()}</div>
    case 'carrier':
      if (!lead.carrier) return null
      return <div key={key} style={fieldStyle}>🏢 {lead.carrier}</div>
    case 'policyNumber':
      if (!lead.policyNumber && !lead.policy_number) return null
      return <div key={key} style={fieldStyle}>📋 {lead.policyNumber || lead.policy_number}</div>
    case 'notes':
      if (!lead.notes) return null
      return <div key={key} style={fieldStyle}>📝 {lead.notes.length > 50 ? lead.notes.slice(0, 50) + '…' : lead.notes}</div>
    case 'createdAt':
      if (!lead.createdAt) return null
      return <div key={key} style={{ fontSize: '10px', color: 'var(--theme-phone)', marginBottom: '2px', fontWeight: 500 }}>🕐 {formatLeadDate(lead.createdAt)}</div>
    default:
      return null
  }
}

function LeadCard({ lead, color, cardFields, onDragStart, onClick, onDelete, onPhoneCall, onVideoCall, onMessage, isNew, onMarkSeen }) {
  const hoverTimer = useRef(null)
  const [showNew, setShowNew] = useState(isNew)

  useEffect(() => { setShowNew(isNew) }, [isNew])

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

      {/* Delete button */}
      <button
        onClick={(e) => onDelete(lead.id, lead.name, e)}
        title="Delete lead"
        style={{
          position: 'absolute', top: '6px', right: '6px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
          color: 'var(--theme-error)', fontSize: '14px', cursor: 'pointer',
          padding: '3px 6px', borderRadius: '6px', lineHeight: 1,
          transition: 'all 0.15s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)' }}
      >🗑️</button>

      {/* Name + AP (always shown) */}
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px', paddingRight: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {lead.name || 'Unknown'}
        {Number(lead.premium) > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--theme-success)' }}>
            (${(Number(lead.premium) * 12).toLocaleString()})
          </span>
        )}
      </div>

      {/* Dynamic fields in configured order */}
      {cardFields.map(key => renderCardField(key, lead))}

      {/* Time ago */}
      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
        {lead.createdAt ? timeAgo(lead.createdAt) : ''}
      </div>

      {/* Action Buttons — Phone, Video, Message */}
      {lead.phone && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', borderTop: '1px solid var(--theme-border-subtle)', paddingTop: '8px' }}>
          <button
            onClick={(e) => onPhoneCall(lead, e)}
            title="Phone call"
            style={{ ...actionBtnStyle, color: 'var(--theme-success)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,0.1)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >📞</button>
          <button
            onClick={(e) => onVideoCall(lead, e)}
            title="Video call"
            style={{ ...actionBtnStyle, color: 'var(--theme-accent)' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--theme-accent-muted)'; e.currentTarget.style.borderColor = 'var(--theme-accent)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >📹</button>
          <button
            onClick={(e) => onMessage(lead, e)}
            title="Send message"
            style={{ ...actionBtnStyle, color: '#a855f7' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.1)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >💬</button>
        </div>
      )}
    </div>
  )
}

function CardFieldSettings({ fields, onSave, onClose }) {
  const [selected, setSelected] = useState([...fields])

  const isSelected = (key) => selected.includes(key)

  const toggle = (key) => {
    if (isSelected(key)) {
      setSelected(selected.filter(k => k !== key))
    } else if (selected.length < MAX_CUSTOM_FIELDS) {
      setSelected([...selected, key])
    }
  }

  const moveUp = (idx) => {
    if (idx <= 0) return
    const next = [...selected];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setSelected(next)
  }

  const moveDown = (idx) => {
    if (idx >= selected.length - 1) return
    const next = [...selected];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setSelected(next)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '440px', maxHeight: '80vh', overflow: 'auto',
        background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>⚙️ Card Fields</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '12px' }}>
          Select up to {MAX_CUSTOM_FIELDS} fields. Name and Date/Time are always shown. Drag order = card order.
        </div>

        {/* Selected fields with reorder */}
        {selected.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Fields ({selected.length}/{MAX_CUSTOM_FIELDS})</div>
            {selected.map((key, idx) => {
              const field = ALL_CARD_FIELDS.find(f => f.key === key)
              if (!field) return null
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                  background: 'var(--theme-accent-muted)', border: '1px solid var(--theme-accent)',
                  borderRadius: '8px', marginBottom: '4px',
                }}>
                  <span style={{ fontSize: '13px' }}>{field.icon}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>{field.label}</span>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{
                    background: 'none', border: 'none', color: idx === 0 ? '#333' : '#71717a',
                    cursor: idx === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '2px 4px',
                  }}>▲</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === selected.length - 1} style={{
                    background: 'none', border: 'none', color: idx === selected.length - 1 ? '#333' : '#71717a',
                    cursor: idx === selected.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '2px 4px',
                  }}>▼</button>
                  <button onClick={() => toggle(key)} style={{
                    background: 'none', border: 'none', color: 'var(--theme-error)', cursor: 'pointer', fontSize: '12px', padding: '2px 4px',
                  }}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Available fields */}
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Fields</div>
        {ALL_CARD_FIELDS.filter(f => !isSelected(f.key)).map(field => (
          <div key={field.key} onClick={() => toggle(field.key)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
            background: 'var(--theme-bg)', border: '1px solid var(--theme-border-subtle)',
            borderRadius: '8px', marginBottom: '4px', cursor: selected.length >= MAX_CUSTOM_FIELDS ? 'default' : 'pointer',
            opacity: selected.length >= MAX_CUSTOM_FIELDS ? 0.4 : 1,
          }}>
            <span style={{ fontSize: '13px' }}>{field.icon}</span>
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--theme-text-secondary)' }}>{field.label}</span>
            <span style={{ fontSize: '11px', color: 'var(--theme-success)' }}>+ Add</span>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border)',
            background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => { onSave(selected.length > 0 ? selected : DEFAULT_CARD_FIELDS) }} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
            background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function UploadLeadsModal({ onClose, actions }) {
  const fileRef = useRef(null)
  const [pipeline, setPipeline] = useState('new')
  const [stage, setStage] = useState('new_lead')
  const [leadType, setLeadType] = useState('')
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const LEAD_TYPES = ['FEX', 'VETERANS', 'MORTGAGE PROTECTION', 'TRUCKERS', 'IUL']

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const lines = text.trim().split('\n')
        // Proper CSV parsing that handles quoted commas (e.g. "$15,000")
        const parseCSVLine = (line) => {
          const result = []; let current = ''; let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++ } else { inQuotes = !inQuotes } }
            else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
            else { current += ch }
          }
          result.push(current.trim())
          return result
        }
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_'))
        const rows = lines.slice(1).map(line => {
          const vals = parseCSVLine(line)
          const obj = {}
          headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '') })
          return obj
        }).filter(r => r.name || r.first_name || r.fullname || r.full_name)
        setPreview({ headers, rows, fileName: file.name })
      } catch { setPreview(null) }
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!preview?.rows?.length) return
    setUploading(true)
    try {
      const leads = preview.rows.map(r => ({
        name: r.name || r.fullname || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        phone: r.phone || r.phone_number || '',
        email: r.email || '', state: r.state || '', notes: r.notes || '',
        pipeline, stage, leadType, createdAt: new Date().toISOString(),
      }))
      try {
        const data = await crmClient.importLeads({ leads })
        setResult({ success: true, count: data.imported || leads.length })
      } catch {
        setResult({ success: true, count: leads.length, local: true })
      }
    } finally { setUploading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '560px', maxHeight: '80vh', overflow: 'auto',
        background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>Upload Leads</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Assign to Pipeline</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[['new', '🆕 New Leads'], ['aged', '📜 Aged Leads']].map(([val, label]) => (
              <button key={val} onClick={() => setPipeline(val)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: pipeline === val ? 600 : 400,
                border: `1px solid ${pipeline === val ? 'var(--theme-accent)' : 'rgba(255,255,255,0.08)'}`,
                background: pipeline === val ? 'var(--theme-accent-muted)' : 'transparent',
                color: pipeline === val ? 'var(--theme-accent)' : '#71717a', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Lead Type</label>
          <select value={leadType} onChange={e => setLeadType(e.target.value)} style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
            color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
          }}>
            <option value="">— Select Lead Type —</option>
            {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Starting Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value)} style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
            color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
          }}>
            {['new_lead', 'contact', 'engaged', 'qualified', 'proposal', 'sold'].map(s => (
              <option key={s} value={s}>{{new_lead:'New Leads',contact:'Contacted',engaged:'Engaged',qualified:'Qualified',proposal:'Proposal',sold:'Won'}[s]}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>CSV File</label>
          <div onClick={() => fileRef.current?.click()} style={{
            padding: '32px', borderRadius: '10px', border: '2px dashed var(--theme-border)',
            background: 'var(--theme-bg)', textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
            <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>{preview ? preview.fileName : 'Click to select CSV file'}</div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>Columns: name, phone, email, state, notes</div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        </div>
        {preview && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--theme-success)', marginBottom: '8px' }}>✅ {preview.rows.length} leads found</div>
            <div style={{ maxHeight: '150px', overflow: 'auto', borderRadius: '8px', border: '1px solid var(--theme-border-subtle)', fontSize: '11px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{preview.headers.slice(0, 4).map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--theme-text-secondary)', borderBottom: '1px solid var(--theme-border-subtle)' }}>{h}</th>
                ))}</tr></thead>
                <tbody>{preview.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>{preview.headers.slice(0, 4).map(h => (
                    <td key={h} style={{ padding: '6px 10px', color: 'var(--theme-text-secondary)', borderBottom: '1px solid var(--theme-border-subtle)' }}>{r[h]}</td>
                  ))}</tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {result && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: 'var(--theme-success)', fontSize: '13px' }}>
            ✅ {result.count} leads uploaded
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleUpload} disabled={!preview || uploading} style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
            background: preview ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
            color: preview ? 'var(--theme-accent)' : '#52525b', fontSize: '13px', fontWeight: 600,
            cursor: preview ? 'pointer' : 'default', opacity: uploading ? 0.6 : 1,
          }}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
      </div>
    </div>
  )
}

function NewLeadModal({ onClose, actions }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', state: '', dob: '', age: '',
    leadType: 'FEX', stage: 'new_lead', pipeline: 'new',
    faceAmount: '', beneficiary: '', beneficiaryRelation: '',
    gender: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name && !form.phone) return
    setSaving(true)
    try {
      const lead = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        state: form.state,
        dob: form.dob,
        age: form.age,
        lead_type: form.leadType,
        stage: form.stage,
        pipeline: form.pipeline,
        face_amount: form.faceAmount,
        beneficiary: form.beneficiary,
        beneficiary_relation: form.beneficiaryRelation,
        gender: form.gender,
        notes: form.notes,
        priority: 'medium',
        tags: ['Lead', 'Manual'],
      }
      const res = await crmClient.createLead(lead)
      if (res && (res.id || res.lead)) {
        const newLead = res.lead || res
        actions.addLead({
          ...newLead,
          leadType: form.leadType,
          faceAmount: form.faceAmount,
          createdAt: new Date().toISOString(),
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to create lead:', err)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
    color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '520px', maxHeight: '85vh', overflow: 'auto',
        background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>+ New Lead</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} placeholder="First Last" value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Phone *</label>
            <input style={inputStyle} placeholder="Phone number" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} placeholder="Email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} placeholder="State" value={form.state} onChange={e => handleChange('state', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>DOB</label>
            <input style={inputStyle} placeholder="MM/DD/YYYY" value={form.dob} onChange={e => handleChange('dob', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Age</label>
            <input style={inputStyle} placeholder="Age" value={form.age} onChange={e => handleChange('age', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Lead Type</label>
            <select style={inputStyle} value={form.leadType} onChange={e => handleChange('leadType', e.target.value)}>
              {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pipeline</label>
            <select style={inputStyle} value={form.pipeline} onChange={e => handleChange('pipeline', e.target.value)}>
              <option value="new">New</option>
              <option value="aged">Aged</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Coverage Amount</label>
            <input style={inputStyle} placeholder="$10,000" value={form.faceAmount} onChange={e => handleChange('faceAmount', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select style={inputStyle} value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Beneficiary</label>
            <input style={inputStyle} placeholder="Beneficiary name" value={form.beneficiary} onChange={e => handleChange('beneficiary', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Relationship</label>
            <select style={inputStyle} value={form.beneficiaryRelation} onChange={e => handleChange('beneficiaryRelation', e.target.value)}>
              <option value="">—</option>
              <option value="Spouse">Spouse</option>
              <option value="My Children">My Children</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Notes..." value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: '8px',
            border: '1px solid var(--theme-border)', background: 'transparent',
            color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || (!form.name && !form.phone)} style={{
            padding: '10px 20px', borderRadius: '8px',
            border: '1px solid var(--theme-accent)',
            background: (form.name || form.phone) ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
            color: (form.name || form.phone) ? 'var(--theme-accent)' : '#52525b',
            fontSize: '13px', fontWeight: 600, cursor: (form.name || form.phone) ? 'pointer' : 'default',
            opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving...' : 'Create Lead'}</button>
        </div>
      </div>
    </div>
  )
}

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

function formatLeadDate(dateStr) {
  if (!dateStr) return ''
  // Handle "MM/DD/YY HH:MM:SS AM/PM" format from GSheet
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{2}\s/)) return dateStr
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return dateStr }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
