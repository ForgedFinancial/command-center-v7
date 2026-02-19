import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { useApp } from '../../../../context/AppContext'
import crmClient from '../../../../api/crmClient'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'
import ContactActivityTimeline from './ContactActivityTimeline'
import PipelineModeToggle, { filterByPipelineMode } from '../PipelineModeToggle'
import DataSourceToggle from '../../../shared/DataSourceToggle'
import { useDataSource } from '../../../../hooks/useDataSource'
import { LEAD_TYPES } from '../../../../config/leadTypes'

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

const TAG_COLORS = {
  'VIP Client': { color: 'var(--theme-success)', bg: 'rgba(74,222,128,0.15)' },
  'Lead': { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  'Client': { color: 'var(--theme-accent)', bg: 'var(--theme-accent-muted)' },
  'Prospect': { color: 'var(--theme-phone)', bg: 'rgba(245,158,11,0.15)' },
}

const AVATAR_COLORS = ['#3b82f6', '#ef4444', '#4ade80', '#f59e0b', '#a855f7', '#ec4899', '#f97316', 'var(--theme-accent)']

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// All available columns with their accessor functions
const ALL_COLUMNS = [
  { id: 'name', label: 'Name', width: '2fr', accessor: l => l.name || '—' },
  { id: 'firstName', label: 'First Name', width: '1fr', accessor: l => l.firstName || l.name?.split(' ')[0] || '—' },
  { id: 'lastName', label: 'Last Name', width: '1fr', accessor: l => l.lastName || l.name?.split(' ').slice(1).join(' ') || '—' },
  { id: 'company', label: 'Company', width: '1.5fr', accessor: l => l.carrier || '—' },
  { id: 'email', label: 'Email', width: '1.5fr', accessor: l => l.email || '—' },
  { id: 'phone', label: 'Phone', width: '1fr', accessor: l => formatPhone(l.phone) || '—' },
  { id: 'state', label: 'State', width: '0.6fr', accessor: l => l.state || l.customFields?.state || '—' },
  { id: 'dob', label: 'DOB', width: '0.8fr', accessor: l => l.dob || '—' },
  { id: 'age', label: 'Age', width: '0.5fr', accessor: l => l.dob ? Math.floor((Date.now() - new Date(l.dob).getTime()) / 31557600000).toString() : '—' },
  { id: 'gender', label: 'Gender', width: '0.6fr', accessor: l => l.gender || l.customFields?.gender || '—' },
  { id: 'amtRequested', label: 'Amt Requested', width: '1fr', accessor: l => l.amtRequested || l.customFields?.amt_requested || '—' },
  { id: 'beneficiary', label: 'Beneficiary', width: '1fr', accessor: l => l.beneficiary || '—' },
  { id: 'beneficiaryName', label: 'Beneficiary Name', width: '1fr', accessor: l => l.beneficiaryName || l.beneficiary || '—' },
  { id: 'leadType', label: 'Lead Type', width: '1fr', accessor: l => l.leadType || '—' },
  { id: 'platform', label: 'Platform', width: '0.8fr', accessor: l => l.platform || l.customFields?.platform || '—' },
  { id: 'adSource', label: 'Ad Source', width: '1fr', accessor: l => l.adSource || '—' },
  { id: 'healthHistory', label: 'Health History', width: '1fr', accessor: l => l.healthHistory || '—' },
  { id: 'hasLifeInsurance', label: 'Has Life Insurance', width: '1fr', accessor: l => l.hasLifeInsurance || '—' },
  { id: 'favoriteHobby', label: 'Favorite Hobby', width: '1fr', accessor: l => l.favoriteHobby || '—' },
  { id: 'createdAt', label: 'Created At', width: '0.8fr', accessor: l => l.createdAt ? formatDate(l.createdAt) : '—' },
  { id: 'stage', label: 'Stage', width: '0.8fr', accessor: l => l.stage || '—' },
  { id: 'pipeline', label: 'Pipeline', width: '0.8fr', accessor: l => l.pipeline || '—' },
  { id: 'priority', label: 'Priority', width: '0.7fr', accessor: l => l.priority || '—' },
  { id: 'notes', label: 'Notes', width: '1.5fr', accessor: l => l.notes || '—' },
  { id: 'carrier', label: 'Carrier', width: '1fr', accessor: l => l.carrier || '—' },
  { id: 'premium', label: 'Premium', width: '0.8fr', accessor: l => l.premium ? `$${l.premium}` : '—' },
  { id: 'faceAmount', label: 'Face Amount', width: '1fr', accessor: l => l.faceAmount ? `$${Number(l.faceAmount).toLocaleString()}` : '—' },
  { id: 'policyNumber', label: 'Policy Number', width: '1fr', accessor: l => l.policyNumber || '—' },
  { id: 'tags', label: 'Tags', width: '1fr', accessor: l => l.tags?.join(', ') || '—' },
  { id: 'lastContact', label: 'Last Contact', width: '80px', accessor: l => l.lastContact ? formatDate(l.lastContact) : l.createdAt ? formatDate(l.createdAt) : '—' },
]

const DEFAULT_COLUMNS = ['name', 'company', 'email', 'phone', 'tags', 'lastContact']
const STORAGE_KEY = 'cc7-contacts-columns'

function loadColumnConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Validate column ids exist
      const valid = parsed.filter(id => ALL_COLUMNS.find(c => c.id === id))
      if (valid.length > 0) return valid
    }
  } catch {}
  return DEFAULT_COLUMNS
}

function saveColumnConfig(cols) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)) } catch {}
}

export default function ContactsView() {
  const { state, actions } = useCRM()
  const { actions: appActions } = useApp()
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [leadTypeFilter, setLeadTypeFilter] = useState('')
  const { source } = useDataSource()
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
  const handleDeleteLead = useCallback((leadId, leadName, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!confirm(`Delete ${leadName || 'this lead'}?`)) return
    actions.removeLead(leadId)
    crmClient.deleteLead(leadId).catch(() => {})
  }, [actions])
  const [expandedContact, setExpandedContact] = useState(null)
  const [detailTab, setDetailTab] = useState('info')
  const [activeColumns, setActiveColumns] = useState(loadColumnConfig)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const pickerRef = useRef(null)

  // Close picker on outside click
  useEffect(() => {
    if (!showColumnPicker) return
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowColumnPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnPicker])

  const handleDial = useCallback((lead) => {
    if (!lead.phone) return
    markSeen(lead.id)
    appActions.addToast({ id: Date.now(), type: 'info', message: `Dialing ${lead.name}...` })
    fetch(`${WORKER_PROXY_URL}/api/dial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: lead.phone, name: lead.name }),
    }).catch(() => {})
  }, [appActions])

  const filteredLeads = useMemo(() => {
    let leads = filterByPipelineMode([...state.leads], state.pipelineMode)
    if (source === 'personal') leads = leads.filter(l => l.source === 'personal' || l.source === 'mac')
    if (source === 'business') leads = leads.filter(l => !l.source || l.source === 'business' || l.source === 'crm')
    if (search) {
      const q = search.toLowerCase()
      leads = leads.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      )
    }
    if (tagFilter) leads = leads.filter(l => l.tags?.includes(tagFilter))
    if (leadTypeFilter) leads = leads.filter(l => l.leadType === leadTypeFilter)
    return leads.sort((a, b) => new Date(b.lastContact || b.createdAt) - new Date(a.lastContact || a.createdAt))
  }, [state.leads, search, tagFilter, leadTypeFilter, state.pipelineMode, source])

  const allTags = useMemo(() => {
    const tags = new Set()
    state.leads.forEach(l => l.tags?.forEach(t => tags.add(t)))
    return Array.from(tags)
  }, [state.leads])

  const page = state.currentPage
  const pageSize = state.pageSize
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const paginatedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)

  const visibleColumns = useMemo(() => {
    return activeColumns.map(id => ALL_COLUMNS.find(c => c.id === id)).filter(Boolean)
  }, [activeColumns])

  const gridTemplate = visibleColumns.map(c => c.width).join(' ') + ' 40px'

  const toggleColumn = (colId) => {
    setActiveColumns(prev => {
      const next = prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
      saveColumnConfig(next)
      return next
    })
  }

  const moveColumn = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= activeColumns.length) return
    setActiveColumns(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      saveColumnConfig(next)
      return next
    })
  }

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--theme-border)',
    background: 'var(--theme-bg)',
    color: 'var(--theme-text-secondary)',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>Contacts</h2>
          <DataSourceToggle />
          <PipelineModeToggle />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', fontSize: '12px', outline: 'none', width: '180px',
            }}
          />
          <select value={leadTypeFilter} onChange={(e) => setLeadTypeFilter(e.target.value)} style={selectStyle}>
            <option value="">All Lead Types</option>
            {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={selectStyle}>
            <option value="">All Tags</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          {/* Column Picker */}
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              title="Customize columns"
              style={{
                padding: '8px 10px', borderRadius: '8px',
                border: '1px solid var(--theme-border)', background: showColumnPicker ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
                color: showColumnPicker ? 'var(--theme-accent)' : '#a1a1aa', fontSize: '14px', cursor: 'pointer',
              }}
            >
              ⚙️
            </button>
            {showColumnPicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                width: '320px', maxHeight: '420px', overflowY: 'auto',
                background: 'var(--theme-surface)', border: '1px solid var(--theme-border)',
                borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
                padding: '12px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Visible Columns
                </div>
                {/* Active columns — reorderable */}
                {activeColumns.map((colId, idx) => {
                  const col = ALL_COLUMNS.find(c => c.id === colId)
                  if (!col) return null
                  return (
                    <div
                      key={colId}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIdx !== null) moveColumn(dragIdx, idx); setDragIdx(null) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                        borderRadius: '6px', marginBottom: '2px', cursor: 'grab',
                        background: dragIdx === idx ? 'var(--theme-accent-muted)' : 'transparent',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', cursor: 'grab' }}>⠿</span>
                      <span style={{ flex: 1, fontSize: '12px', color: 'var(--theme-text-primary)' }}>{col.label}</span>
                      <button onClick={() => moveColumn(idx, idx - 1)} disabled={idx === 0}
                        style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#71717a', fontSize: '10px', cursor: 'pointer', padding: '2px' }}>▲</button>
                      <button onClick={() => moveColumn(idx, idx + 1)} disabled={idx === activeColumns.length - 1}
                        style={{ background: 'none', border: 'none', color: idx === activeColumns.length - 1 ? '#333' : '#71717a', fontSize: '10px', cursor: 'pointer', padding: '2px' }}>▼</button>
                      <button onClick={() => toggleColumn(colId)}
                        style={{ background: 'none', border: 'none', color: 'var(--theme-error)', fontSize: '11px', cursor: 'pointer', padding: '2px' }}>✕</button>
                    </div>
                  )
                })}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Available Columns
                </div>
                {ALL_COLUMNS.filter(c => !activeColumns.includes(c.id)).map(col => (
                  <div
                    key={col.id}
                    onClick={() => toggleColumn(col.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                      borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--theme-bg)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--theme-success)' }}>+</span>
                    <span style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>{col.label}</span>
                  </div>
                ))}
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setActiveColumns(DEFAULT_COLUMNS); saveColumnConfig(DEFAULT_COLUMNS) }}
                    style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >Reset to Default</button>
                </div>
              </div>
            )}
          </div>
          <button
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Table */}
      {state.leads.length === 0 ? (
        <EmptyState icon="👥" title="No Contacts Yet" message="Add contacts to manage your relationships." />
      ) : filteredLeads.length === 0 ? (
        <EmptyState icon="🔍" title="No Results" message="No contacts match your search." />
      ) : (
        <>
          <div style={{
            borderRadius: '10px',
            border: '1px solid var(--theme-border-subtle)',
            overflow: 'auto',
            flex: 1,
            minHeight: 0,
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              padding: '10px 16px',
              borderBottom: '1px solid var(--theme-border-subtle)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--theme-text-secondary)',
              fontWeight: 600,
              position: 'sticky',
              top: 0,
              background: '#0f0f1e',
              zIndex: 1,
            }}>
              {visibleColumns.map(col => (
                <span key={col.id}>{col.label}</span>
              ))}
              <span></span>
            </div>

            {/* Rows */}
            {paginatedLeads.map(lead => {
              const tagStyle = lead.tags?.[0] ? TAG_COLORS[lead.tags[0]] || { color: 'var(--theme-text-secondary)', bg: 'rgba(113,113,122,0.15)' } : null
              return (
                <div key={lead.id}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridTemplate,
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--theme-border-subtle)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onClick={() => { setExpandedContact(expandedContact === lead.id ? null : lead.id); setDetailTab('info') }}
                  onMouseEnter={(e) => { if (!seenLeads.has(lead.id)) { e.currentTarget._seenTimer = setTimeout(() => markSeen(lead.id), 1500) } }}
                  onMouseLeave={(e) => { if (e.currentTarget._seenTimer) { clearTimeout(e.currentTarget._seenTimer); e.currentTarget._seenTimer = null } }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  {visibleColumns.map(col => {
                    // Special rendering for name column (with avatar + NEW badge)
                    if (col.id === 'name') {
                      return (
                        <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: getAvatarColor(lead.name || ''),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>{getInitials(lead.name || '?')}</div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>{lead.name}</span>
                          {!seenLeads.has(lead.id) && (
                            <span style={{
                              fontSize: '9px', fontWeight: 700, color: '#0ff', letterSpacing: '1px',
                              padding: '1px 6px', borderRadius: '4px',
                              background: 'var(--theme-accent-muted)', border: '1px solid var(--theme-accent)',
                              animation: 'cc7-pulse 1.5s ease-in-out infinite',
                            }}>NEW</span>
                          )}
                        </div>
                      )
                    }
                    // Phone column with dial button
                    if (col.id === 'phone') {
                      return (
                        <span key={col.id} style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {formatPhone(lead.phone) || '—'}
                          {lead.phone && (
                            <span onClick={(e) => { e.stopPropagation(); handleDial(lead) }}
                              title={`Call ${lead.name}`}
                              style={{ cursor: 'pointer', fontSize: '14px', opacity: 0.7, transition: 'opacity 0.15s' }}
                              onMouseOver={(e) => { e.currentTarget.style.opacity = '1' }}
                              onMouseOut={(e) => { e.currentTarget.style.opacity = '0.7' }}
                            >📞</span>
                          )}
                        </span>
                      )
                    }
                    // Tags column with color
                    if (col.id === 'tags') {
                      return (
                        <span key={col.id}>
                          {lead.tags?.[0] && tagStyle ? (
                            <span style={{
                              fontSize: '10px', padding: '3px 10px', borderRadius: '4px', fontWeight: 600,
                              color: tagStyle.color, background: tagStyle.bg,
                            }}>{lead.tags[0]}</span>
                          ) : '—'}
                        </span>
                      )
                    }
                    // Default
                    return (
                      <span key={col.id} style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.accessor(lead)}
                      </span>
                    )
                  })}
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteLead(lead.id, lead.name, e)}
                    title="Delete lead"
                    style={{
                      background: 'transparent', border: '1px solid var(--theme-error)',
                      color: 'var(--theme-error)', fontSize: '14px', cursor: 'pointer',
                      padding: '3px 6px', borderRadius: '6px', lineHeight: 1,
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)' }}
                  >🗑️</button>
                </div>
                {expandedContact === lead.id && (
                  <div style={{
                    gridColumn: '1 / -1',
                    padding: '16px 20px',
                    background: 'rgba(0,212,255,0.02)',
                    borderBottom: '1px solid var(--theme-border-subtle)',
                  }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                      {['info', 'activity'].map(tab => (
                        <button
                          key={tab}
                          onClick={(e) => { e.stopPropagation(); setDetailTab(tab) }}
                          style={{
                            padding: '5px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                            border: '1px solid ' + (detailTab === tab ? 'var(--theme-accent)' : 'transparent'),
                            background: detailTab === tab ? 'var(--theme-accent-muted)' : 'transparent',
                            color: detailTab === tab ? 'var(--theme-accent)' : '#71717a',
                            cursor: 'pointer', textTransform: 'capitalize',
                          }}
                        >
                          {tab === 'activity' ? '📋 Activity Timeline' : 'ℹ️ Info'}
                        </button>
                      ))}
                    </div>
                    {detailTab === 'info' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Email:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{lead.email || '—'}</span></div>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Phone:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{formatPhone(lead.phone) || '—'}</span>
                          {lead.phone && <span onClick={(e) => { e.stopPropagation(); handleDial(lead) }} style={{ cursor: 'pointer', marginLeft: '6px' }}>📞</span>}
                        </div>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Company:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{lead.carrier || '—'}</span></div>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Lead Type:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{lead.leadType || '—'}</span></div>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Stage:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{lead.stage || '—'}</span></div>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Tags:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{lead.tags?.join(', ') || '—'}</span></div>
                        <div><span style={{ color: 'var(--theme-text-secondary)' }}>Value:</span> <span style={{ color: 'var(--theme-text-primary)' }}>{lead.value || lead.premium ? `$${lead.value || lead.premium}` : '—'}</span></div>
                      </div>
                    ) : (
                      <ContactActivityTimeline contactId={lead.id} />
                    )}
                  </div>
                )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: '8px', padding: '16px 0', flexShrink: 0,
            }}>
              <button
                onClick={() => actions.setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid var(--theme-border)', background: 'transparent',
                  color: page <= 1 ? '#52525b' : '#a1a1aa', fontSize: '11px',
                  cursor: page <= 1 ? 'default' : 'pointer',
                }}
              >← Prev</button>
              <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => actions.setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid var(--theme-border)', background: 'transparent',
                  color: page >= totalPages ? '#52525b' : '#a1a1aa', fontSize: '11px',
                  cursor: page >= totalPages ? 'default' : 'pointer',
                }}
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
