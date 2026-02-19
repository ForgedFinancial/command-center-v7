import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { useApp } from '../../../../context/AppContext'
import { usePhone } from '../../../../context/PhoneContext'
import crmClient from '../../../../api/crmClient'
import { WORKER_PROXY_URL } from '../../../../config/api'
import PipelineSwitcher, { usePipelines } from './PipelineSwitcher'
import EmptyState from '../../../shared/EmptyState'
import LeadDetailModal from './LeadDetailModal'
import StageTransitionModal from './StageTransitionModal'
import { validateTransition, checkOverdue, getUrgencyColor, formatTimeRemaining } from '../../../../services/pipelineLogic'
import { useKeyboardShortcuts, KeyboardShortcutOverlay } from '../../../../hooks/useKeyboardShortcuts.jsx'

import { LEAD_TYPES } from '../../../../config/leadTypes'
import PipelineModeToggle from '../PipelineModeToggle'

// Shimmer skeleton for loading state
function SkeletonCard() {
  return (
    <div style={{
      padding: '12px', borderRadius: '8px', background: 'var(--theme-surface)',
      border: '1px solid var(--theme-border-subtle)', marginBottom: '8px',
      animation: 'cc7-shimmer 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: '14px', width: '70%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }} />
      <div style={{ height: '10px', width: '50%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', marginBottom: '6px' }} />
      <div style={{ height: '10px', width: '60%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

function SkeletonColumn() {
  return (
    <div style={{ minWidth: '260px', maxWidth: '260px', flexShrink: 0 }}>
      <div style={{ padding: '12px 14px', borderRadius: '10px 10px 0 0', background: 'var(--theme-surface)' }}>
        <div style={{ height: '12px', width: '60%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ padding: '8px', background: 'rgba(255,255,255,0.015)', borderRadius: '0 0 10px 10px' }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <style>{`@keyframes cc7-shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}

// ========================================
// Card Field Customization System
// ========================================
const DEFAULT_CARD_FIELDS = ['leadType', 'dob', 'phone', 'faceAmount', 'beneficiary', 'createdAt']
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

// Discover custom fields from leads for card field options
function discoverCustomCardFields(leads) {
  const keys = new Set()
  leads.forEach(l => {
    const cf = l.customFields || l.custom_fields
    if (!cf) return
    try {
      const parsed = typeof cf === 'string' ? JSON.parse(cf) : cf
      Object.keys(parsed).forEach(k => keys.add(k))
    } catch {}
  })
  return Array.from(keys).map(key => ({
    key: `cf_${key.replace(/\s+/g, '_').toLowerCase()}`,
    label: key,
    icon: '📋',
    isCustom: true,
    customKey: key,
  }))
}

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

// Default stage colors for dynamic stages
const STAGE_COLOR_PALETTE = [
  '#3b82f6', '#a855f7', '#00d4ff', '#f59e0b', '#f97316',
  '#4ade80', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444',
]

export default function PipelineView() {
  const { state, actions } = useCRM()
  const { actions: appActions } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [leadTypeFilter, setLeadTypeFilter] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [showNewLead, setShowNewLead] = useState(false)
  const [showCardSettings, setShowCardSettings] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(null) // lead to transfer
  const [stageTransition, setStageTransition] = useState(null) // { lead, fromStage, toStage }
  const [cardFields, setCardFields] = useState(loadCardFields)
  // Discover custom fields from leads for card field picker
  const customCardFields = useMemo(() => discoverCustomCardFields(state.leads), [state.leads])
  const allCardFieldOptions = useMemo(() => [...ALL_CARD_FIELDS, ...customCardFields], [customCardFields])
  const dragLeadId = useRef(null)

  // Pipeline management
  const {
    pipelines, stages, currentPipelineId, loading,
    leadCounts, selectPipeline, fetchPipelines, setLeadCounts,
  } = usePipelines()

  // Filter leads for current pipeline
  const pipelineLeads = useMemo(() => {
    if (!currentPipelineId) return []
    return state.leads.filter(l => l.pipeline_id === currentPipelineId || l.pipelineId === currentPipelineId)
  }, [state.leads, currentPipelineId])

  const filteredLeads = useMemo(() => {
    let leads = pipelineLeads
    if (leadTypeFilter) leads = leads.filter(l => (l.leadType || l.lead_type) === leadTypeFilter)
    // Filter by pipeline mode (New/Aged/All)
    if (state.pipelineMode === 'new') leads = leads.filter(l => (l.lead_age || l.leadAge || 'new_lead') !== 'aged')
    if (state.pipelineMode === 'aged') leads = leads.filter(l => (l.lead_age || l.leadAge) === 'aged')
    return leads
  }, [pipelineLeads, leadTypeFilter, state.pipelineMode])

  // Build dynamic columns from stages
  const columns = useMemo(() => {
    if (!stages || stages.length === 0) return []
    return stages.map((stage, idx) => {
      const stageLeads = filteredLeads.filter(l => l.stage_id === stage.id || l.stageId === stage.id)
      const totalValue = stageLeads.reduce((s, l) => s + (Number(l.premium) > 0 ? Number(l.premium) * 12 : 0), 0)
      return {
        stage: stage.id,
        label: stage.name,
        color: stage.color || STAGE_COLOR_PALETTE[idx % STAGE_COLOR_PALETTE.length],
        leads: stageLeads,
        totalValue,
      }
    })
  }, [stages, filteredLeads])

  // Update lead counts when leads change
  useEffect(() => {
    if (pipelines.length > 0) {
      const counts = {}
      pipelines.forEach(p => {
        counts[p.id] = state.leads.filter(l => l.pipeline_id === p.id || l.pipelineId === p.id).length
      })
      setLeadCounts(counts)
    }
  }, [state.leads, pipelines])

  // Drag handlers
  const onDragStart = (e, leadId) => {
    dragLeadId.current = leadId
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }
  const onDragLeave = () => setDragOverStage(null)
  const onDrop = async (e, targetStageId) => {
    e.preventDefault()
    setDragOverStage(null)
    const leadId = dragLeadId.current
    if (!leadId) return
    const lead = state.leads.find(l => l.id === leadId)
    if (!lead) return
    const currentStageId = lead.stage_id || lead.stageId
    if (currentStageId === targetStageId) return

    const fromStage = stages.find(s => s.id === currentStageId)
    const toStage = stages.find(s => s.id === targetStageId)

    // Validate required fields
    const validation = validateTransition(lead, toStage)
    if (!validation.valid) {
      // Show transition modal for required fields
      setStageTransition({ lead, fromStage, toStage })
      return
    }

    // Direct move (no required fields gate)
    await executeStageMove(lead, currentStageId, targetStageId)
  }

  const executeStageMove = async (lead, fromStageId, toStageId, fieldUpdates) => {
    const leadId = lead.id
    const updateData = { id: leadId, stage_id: toStageId, stageId: toStageId, ...fieldUpdates }
    actions.updateLead(updateData)
    try {
      if (fieldUpdates && Object.keys(fieldUpdates).length > 0) {
        await crmClient.updateLead(leadId, fieldUpdates)
      }
      await crmClient.moveLead(
        leadId, currentPipelineId, toStageId,
        lead.pipeline_id || lead.pipelineId, fromStageId
      )
    } catch (err) {
      console.error('Failed to update stage:', err)
      actions.updateLead({ id: leadId, stage_id: fromStageId, stageId: fromStageId })
    }
  }

  const handleTransitionConfirm = async (payload) => {
    const lead = stageTransition.lead
    const fromStageId = lead.stage_id || lead.stageId
    setStageTransition(null)
    await executeStageMove(lead, fromStageId, payload.to_stage_id, payload.fieldUpdates)
  }

  // Cross-pipeline transfer
  const handleTransfer = async (lead, toPipelineId, toStageId) => {
    const fromPipelineId = lead.pipeline_id || lead.pipelineId
    const fromStageId = lead.stage_id || lead.stageId
    // Optimistic update
    actions.updateLead({
      id: lead.id,
      pipeline_id: toPipelineId, pipelineId: toPipelineId,
      stage_id: toStageId, stageId: toStageId,
    })
    setShowTransferModal(null)
    try {
      await crmClient.moveLead(lead.id, toPipelineId, toStageId, fromPipelineId, fromStageId, 'Cross-pipeline transfer')
      appActions.addToast({ id: Date.now(), type: 'success', message: `Lead transferred successfully` })
    } catch (err) {
      console.error('Transfer failed:', err)
      actions.updateLead({
        id: lead.id,
        pipeline_id: fromPipelineId, pipelineId: fromPipelineId,
        stage_id: fromStageId, stageId: fromStageId,
      })
      appActions.addToast({ id: Date.now(), type: 'error', message: `Transfer failed: ${err.message}` })
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
    appActions.addToast({ id: Date.now(), type: 'success', message: `Deleted ${leadName || 'lead'}` })
  }

  // Phone action handlers
  const { makeCall: phoneContextMakeCall } = usePhone()
  const handlePhoneCall = useCallback(async (lead, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (!lead.phone) return
    markSeen(lead.id)
    appActions.addToast({ id: Date.now(), type: 'info', message: `📞 Calling ${lead.name}...` })
    try {
      const result = await phoneContextMakeCall(lead)
      if (result?.method === 'iphone') {
        appActions.addToast({ id: Date.now(), type: 'success', message: `📱 Calling via iPhone` })
      } else if (result?.method === 'twilio') {
        appActions.addToast({ id: Date.now(), type: 'success', message: `📞 Connected via Twilio` })
      }
    } catch (err) {
      appActions.addToast({ id: Date.now(), type: 'error', message: `Call failed: ${err.message}` })
    }
  }, [appActions, phoneContextMakeCall])

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
    actions.setView('messages')
    appActions.addToast({ id: Date.now(), type: 'info', message: `💬 Opening messages for ${lead.name}...` })
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

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId)

  // Keyboard shortcuts
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onSwitchPipeline: (idx) => { if (pipelines[idx]) selectPipeline(pipelines[idx].id) },
    onNewLead: () => setShowNewLead(true),
    onCloseModal: () => {
      if (selectedLead) setSelectedLead(null)
      else if (showNewLead) setShowNewLead(false)
      else if (showUpload) setShowUpload(false)
      else if (showTransferModal) setShowTransferModal(null)
      else if (stageTransition) setStageTransition(null)
    },
    onFocusSearch: () => {
      const el = document.querySelector('[data-search-input]')
      if (el) el.focus()
    },
  })

  // Batch operations
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set())
  const toggleLeadSelection = useCallback((leadId, e) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    setSelectedLeadIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }, [])
  const selectAllLeads = useCallback(() => {
    setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)))
  }, [filteredLeads])
  const deselectAllLeads = useCallback(() => setSelectedLeadIds(new Set()), [])

  const handleBatchMoveStage = useCallback(async (targetStageId) => {
    const ids = [...selectedLeadIds]
    ids.forEach(id => actions.updateLead({ id, stage_id: targetStageId, stageId: targetStageId }))
    for (const id of ids) {
      const lead = state.leads.find(l => l.id === id)
      if (lead) {
        try { await crmClient.moveLead(id, currentPipelineId, targetStageId, lead.pipeline_id || lead.pipelineId, lead.stage_id || lead.stageId) } catch {}
      }
    }
    setSelectedLeadIds(new Set())
    appActions.addToast({ id: Date.now(), type: 'success', message: `Moved ${ids.length} leads` })
  }, [selectedLeadIds, state.leads, currentPipelineId, actions, appActions])

  const handleBatchDelete = useCallback(async () => {
    const ids = [...selectedLeadIds]
    if (!confirm(`Delete ${ids.length} leads?`)) return
    actions.removeLeads ? actions.removeLeads(ids) : ids.forEach(id => actions.removeLead(id))
    for (const id of ids) { crmClient.deleteLead(id).catch(() => {}) }
    setSelectedLeadIds(new Set())
    appActions.addToast({ id: Date.now(), type: 'success', message: `Deleted ${ids.length} leads` })
  }, [selectedLeadIds, actions, appActions])

  const handleBatchExport = useCallback(() => {
    const ids = [...selectedLeadIds]
    const leads = state.leads.filter(l => ids.includes(l.id))
    const headers = ['Name', 'Phone', 'Email', 'State', 'Stage', 'Lead Type', 'Created']
    const rows = leads.map(l => [l.name, l.phone, l.email, l.state, l.stage_id || l.stageId, l.leadType || l.lead_type, l.createdAt].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'leads-export.csv'; a.click()
    URL.revokeObjectURL(url)
    appActions.addToast({ id: Date.now(), type: 'success', message: `Exported ${ids.length} leads` })
  }, [selectedLeadIds, state.leads, appActions])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1,2,3].map(i => <div key={i} style={{ width: '100px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'cc7-shimmer 1.5s ease-in-out infinite' }} />)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto' }}>
          <SkeletonColumn /><SkeletonColumn /><SkeletonColumn /><SkeletonColumn />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Pipeline Switcher */}
      <div style={{ marginBottom: '12px' }}>
        <PipelineSwitcher
          pipelines={pipelines}
          currentPipelineId={currentPipelineId}
          onSelect={selectPipeline}
          leadCounts={leadCounts}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
            {currentPipeline?.name || 'Pipeline'}
          </h2>
          <button
            onClick={() => setShowCardSettings(true)}
            title="Customize card fields"
            style={{
              background: 'var(--theme-bg)', border: '1px solid var(--theme-border)',
              borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
              fontSize: '14px', color: 'var(--theme-text-secondary)', transition: 'all 0.15s',
            }}
          >⚙️</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <PipelineModeToggle />
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
          }}>📤 Upload</button>
          <button onClick={() => setShowNewLead(true)} style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)',
            color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>+ New Lead</button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedLeadIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
          background: 'var(--theme-accent-muted)', border: '1px solid var(--theme-accent)',
          borderRadius: '10px', marginBottom: '12px', animation: 'cc7-slideDown 0.15s ease-out',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-accent)' }}>
            {selectedLeadIds.size} selected
          </span>
          <button onClick={selectAllLeads} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Select All</button>
          <button onClick={deselectAllLeads} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Deselect All</button>
          <div style={{ width: '1px', height: '20px', background: 'var(--theme-border)' }} />
          <select onChange={e => { if (e.target.value) handleBatchMoveStage(e.target.value); e.target.value = '' }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>
            <option value="">Move Stage…</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={handleBatchExport} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>📥 Export CSV</button>
          <button onClick={handleBatchDelete} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>🗑️ Delete</button>
          <style>{`@keyframes cc7-slideDown { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
        </div>
      )}

      {/* Kanban */}
      {columns.length === 0 ? (
        <EmptyState icon="🔀" title="No Stages" message="This pipeline has no stages configured." />
      ) : (
        <div style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto', paddingBottom: '12px', animation: 'cc7-fadeIn 0.2s ease-out' }}>
          <style>{`@keyframes cc7-fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }`}</style>
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
                {col.leads.length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}>📭</div>
                    <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', opacity: 0.6 }}>No leads in this stage yet</div>
                  </div>
                )}
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
                    onTransfer={(lead) => setShowTransferModal(lead)}
                    isNew={!seenLeads.has(lead.id)}
                    onMarkSeen={markSeen}
                    isSelected={selectedLeadIds.has(lead.id)}
                    onToggleSelect={toggleLeadSelection}
                    stages={stages}
                    currentPipelineId={currentPipelineId}
                    actions={actions}
                    appActions={appActions}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadLeadsModal onClose={() => setShowUpload(false)} actions={actions} pipelines={pipelines} stages={stages} currentPipelineId={currentPipelineId} />}
      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} actions={actions} pipelines={pipelines} stages={stages} currentPipelineId={currentPipelineId} />}
      {showCardSettings && <CardFieldSettings
        fields={cardFields}
        allFields={allCardFieldOptions}
        onSave={(f) => { setCardFields(f); saveCardFields(f); setShowCardSettings(false) }}
        onClose={() => setShowCardSettings(false)}
      />}
      {showTransferModal && (
        <TransferModal
          lead={showTransferModal}
          pipelines={pipelines}
          currentPipelineId={currentPipelineId}
          onTransfer={handleTransfer}
          onClose={() => setShowTransferModal(null)}
        />
      )}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          pipeline={currentPipeline}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleModalUpdate}
          onDelete={handleModalDelete}
        />
      )}
      {showHelp && <KeyboardShortcutOverlay onClose={() => setShowHelp(false)} />}
      {stageTransition && (
        <StageTransitionModal
          lead={stageTransition.lead}
          fromStage={stageTransition.fromStage}
          toStage={stageTransition.toStage}
          pipeline={currentPipeline}
          onConfirm={handleTransitionConfirm}
          onCancel={() => setStageTransition(null)}
        />
      )}
    </div>
  )
}

// ========================================
// Transfer Modal — Cross-Pipeline
// ========================================
function TransferModal({ lead, pipelines, currentPipelineId, onTransfer, onClose }) {
  const [targetPipelineId, setTargetPipelineId] = useState('')
  const [targetStageId, setTargetStageId] = useState('')
  const [targetStages, setTargetStages] = useState([])
  const [loadingStages, setLoadingStages] = useState(false)

  const otherPipelines = pipelines.filter(p => p.id !== currentPipelineId)

  useEffect(() => {
    if (!targetPipelineId) { setTargetStages([]); setTargetStageId(''); return }
    let cancelled = false
    setLoadingStages(true)
    crmClient.getStages(targetPipelineId).then(res => {
      if (cancelled) return
      const list = res.stages || res.data || []
      setTargetStages(list)
      if (list.length > 0) setTargetStageId(list[0].id)
      setLoadingStages(false)
    }).catch(() => { if (!cancelled) setLoadingStages(false) })
    return () => { cancelled = true }
  }, [targetPipelineId])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '420px', background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '24px',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
          🔄 Transfer Lead
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', marginBottom: '16px' }}>
          Move <strong style={{ color: 'var(--theme-text-primary)' }}>{lead.name}</strong> to another pipeline
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Pipeline</label>
          <select
            value={targetPipelineId}
            onChange={e => setTargetPipelineId(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
            }}
          >
            <option value="">— Select Pipeline —</option>
            {otherPipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {targetPipelineId && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Stage</label>
            {loadingStages ? (
              <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Loading stages...</div>
            ) : (
              <select
                value={targetStageId}
                onChange={e => setTargetStageId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
                  color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
                }}
              >
                {targetStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border)',
            background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={() => onTransfer(lead, targetPipelineId, targetStageId)}
            disabled={!targetPipelineId || !targetStageId}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid var(--theme-accent)',
              background: targetPipelineId && targetStageId ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
              color: targetPipelineId && targetStageId ? 'var(--theme-accent)' : '#52525b',
              fontSize: '12px', fontWeight: 600, cursor: targetPipelineId && targetStageId ? 'pointer' : 'default',
            }}
          >Transfer</button>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Field renderer for dynamic card fields
// ========================================
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
      if (!lead.createdAt && !lead.created_at) return null
      return <div key={key} style={{ fontSize: '10px', color: 'var(--theme-phone)', marginBottom: '2px', fontWeight: 500 }}>🕐 {formatLeadDate(lead.createdAt || lead.created_at)}</div>
    default:
      // Handle custom fields (cf_*)
      if (key.startsWith('cf_')) {
        const cf = lead.customFields || lead.custom_fields
        if (!cf) return null
        try {
          const parsed = typeof cf === 'string' ? JSON.parse(cf) : cf
          // Find the matching custom key
          const customKey = Object.keys(parsed).find(k => `cf_${k.replace(/\s+/g, '_').toLowerCase()}` === key)
          if (!customKey || !parsed[customKey]) return null
          return <div key={key} style={fieldStyle}>📋 <span style={{ color: 'var(--theme-phone)', fontWeight: 500 }}>{customKey}:</span> {parsed[customKey]}</div>
        } catch { return null }
      }
      return null
  }
}

function LeadCard({ lead, color, cardFields, onDragStart, onClick, onDelete, onPhoneCall, onVideoCall, onMessage, onTransfer, isNew, onMarkSeen, isSelected, onToggleSelect, stages, currentPipelineId, actions, appActions }) {
  const hoverTimer = useRef(null)
  const [showNew, setShowNew] = useState(isNew)
  const [quickNote, setQuickNote] = useState('')
  const [showQuickNote, setShowQuickNote] = useState(false)
  const [showDisposition, setShowDisposition] = useState(false)

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

  const handleQuickDisposition = async (e, stageId) => {
    e.stopPropagation()
    const fromStageId = lead.stage_id || lead.stageId
    if (stageId === fromStageId) return
    actions?.updateLead({ id: lead.id, stage_id: stageId, stageId: stageId })
    try {
      await crmClient.moveLead(lead.id, currentPipelineId, stageId, lead.pipeline_id || lead.pipelineId, fromStageId)
      appActions?.addToast({ id: Date.now(), type: 'success', message: `${lead.name} moved` })
    } catch { actions?.updateLead({ id: lead.id, stage_id: fromStageId, stageId: fromStageId }) }
    setShowDisposition(false)
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

      {/* Dynamic fields */}
      {cardFields.map(key => renderCardField(key, lead))}

      {/* Time ago */}
      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
        {lead.createdAt ? timeAgo(lead.createdAt) : ''}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px', borderTop: '1px solid var(--theme-border-subtle)', paddingTop: '8px', flexWrap: 'wrap' }}>
        {lead.phone && <>
          <button onClick={(e) => onPhoneCall(lead, e)} title="Phone call" style={{ ...actionBtnStyle, color: 'var(--theme-success)' }}>📞</button>
          <button onClick={(e) => onVideoCall(lead, e)} title="Video call" style={{ ...actionBtnStyle, color: 'var(--theme-accent)' }}>📹</button>
          <button onClick={(e) => onMessage(lead, e)} title="Send message" style={{ ...actionBtnStyle, color: '#a855f7' }}>💬</button>
        </>}
        <button onClick={(e) => { e.stopPropagation(); setShowQuickNote(v => !v); setShowDisposition(false) }} title="Quick note" style={{ ...actionBtnStyle, color: '#f59e0b' }}>✏️</button>
        <button onClick={(e) => { e.stopPropagation(); setShowDisposition(v => !v); setShowQuickNote(false) }} title="Quick disposition" style={{ ...actionBtnStyle, color: '#3b82f6' }}>🔄</button>
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

      {/* Quick Disposition Inline */}
      {showDisposition && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: '6px' }}>
          <select
            onChange={(e) => handleQuickDisposition(e, e.target.value)}
            defaultValue=""
            autoFocus
            style={{
              width: '100%', padding: '4px 8px', fontSize: '11px', borderRadius: '4px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="" disabled>Move to stage…</option>
            {(stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ========================================
// Card Field Settings Modal
// ========================================
function CardFieldSettings({ fields, allFields, onSave, onClose }) {
  const ALL_FIELDS = allFields || ALL_CARD_FIELDS
  const [selected, setSelected] = useState([...fields])
  const isSelected = (key) => selected.includes(key)
  const toggle = (key) => {
    if (isSelected(key)) setSelected(selected.filter(k => k !== key))
    else if (selected.length < MAX_CUSTOM_FIELDS) setSelected([...selected, key])
  }
  const moveUp = (idx) => { if (idx <= 0) return; const next = [...selected]; [next[idx-1], next[idx]] = [next[idx], next[idx-1]]; setSelected(next) }
  const moveDown = (idx) => { if (idx >= selected.length - 1) return; const next = [...selected]; [next[idx], next[idx+1]] = [next[idx+1], next[idx]]; setSelected(next) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '440px', maxHeight: '80vh', overflow: 'auto', background: 'var(--theme-surface)', borderRadius: '16px', border: '1px solid var(--theme-border)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>⚙️ Card Fields</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '12px' }}>
          Select up to {MAX_CUSTOM_FIELDS} fields. Name is always shown.
        </div>
        {selected.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active ({selected.length}/{MAX_CUSTOM_FIELDS})</div>
            {selected.map((key, idx) => {
              const field = ALL_FIELDS.find(f => f.key === key)
              if (!field) return null
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--theme-accent-muted)', border: '1px solid var(--theme-accent)', borderRadius: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px' }}>{field.icon}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>{field.label}</span>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#71717a', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '2px 4px' }}>▲</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === selected.length - 1} style={{ background: 'none', border: 'none', color: idx === selected.length - 1 ? '#333' : '#71717a', cursor: idx === selected.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '2px 4px' }}>▼</button>
                  <button onClick={() => toggle(key)} style={{ background: 'none', border: 'none', color: 'var(--theme-error)', cursor: 'pointer', fontSize: '12px', padding: '2px 4px' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</div>
        {ALL_FIELDS.filter(f => !isSelected(f.key)).map(field => (
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
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { onSave(selected.length > 0 ? selected : DEFAULT_CARD_FIELDS) }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Upload Leads Modal (updated for dynamic pipelines)
// ========================================
// CRM fields available for mapping
const CRM_FIELDS = [
  { key: '', label: '— Skip —' },
  { key: 'name', label: 'Full Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'state', label: 'State' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'face_amount', label: 'Face Amount' },
  { key: 'premium', label: 'Premium' },
  { key: 'beneficiary', label: 'Beneficiary' },
  { key: 'beneficiary_relation', label: 'Beneficiary Relation' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'ad_source', label: 'Ad Source' },
  { key: 'platform', label: 'Platform' },
  { key: 'notes', label: 'Notes' },
  { key: 'health_history', label: 'Health History' },
  { key: 'has_life_insurance', label: 'Has Life Insurance' },
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'payment_method', label: 'Payment Method' },
]

// Persistent custom fields — saved across uploads
const CUSTOM_FIELDS_STORAGE_KEY = 'cc7-custom-crm-fields'
function loadSavedCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY) || '[]') } catch { return [] }
}
function saveCustomField(name) {
  const existing = loadSavedCustomFields()
  const key = `custom_${name.toLowerCase().replace(/\s+/g, '_')}`
  if (!existing.find(f => f.key === key)) {
    existing.push({ key, label: name })
    localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(existing))
  }
  return key
}

// Auto-guess mapping from CSV header to CRM field
function guessMapping(header) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  const map = {
    name: 'name', fullname: 'name', full_name: 'name', clientname: 'name', leadname: 'name',
    firstname: 'first_name', first: 'first_name', fname: 'first_name',
    lastname: 'last_name', last: 'last_name', lname: 'last_name',
    phone: 'phone', phonenumber: 'phone', cell: 'phone', mobile: 'phone', telephone: 'phone', ph: 'phone',
    email: 'email', emailaddress: 'email', mail: 'email',
    state: 'state', st: 'state', province: 'state',
    dob: 'dob', dateofbirth: 'dob', birthday: 'dob', birthdate: 'dob', birth: 'dob',
    age: 'age',
    gender: 'gender', sex: 'gender',
    faceamount: 'face_amount', face: 'face_amount', coverage: 'face_amount', coverageamount: 'face_amount', amountrequested: 'face_amount', amount: 'face_amount', amtrequested: 'face_amount',
    premium: 'premium', monthlypremium: 'premium', price: 'premium',
    beneficiary: 'beneficiary', bene: 'beneficiary',
    beneficiaryrelation: 'beneficiary_relation', benerelation: 'beneficiary_relation',
    carrier: 'carrier', company: 'carrier', insurancecompany: 'carrier',
    adsource: 'ad_source', source: 'ad_source', leadsource: 'ad_source', vendor: 'ad_source',
    platform: 'platform',
    notes: 'notes', note: 'notes', comments: 'notes', comment: 'notes',
    healthhistory: 'health_history', health: 'health_history', medicalhistory: 'health_history', medications: 'health_history',
    haslifeinsurance: 'has_life_insurance', currentcoverage: 'has_life_insurance',
    bankname: 'bank_name', bank: 'bank_name',
    paymentmethod: 'payment_method', payment: 'payment_method',
  }
  return map[h] || ''
}

function UploadLeadsModal({ onClose, actions, pipelines, stages, currentPipelineId }) {
  const fileRef = useRef(null)
  const [pipelineId, setPipelineId] = useState(currentPipelineId || '')
  const [stageId, setStageId] = useState(stages?.[0]?.id || '')
  const [leadType, setLeadType] = useState('')
  const [leadAge, setLeadAge] = useState('new_lead')
  const [preview, setPreview] = useState(null)
  const [columnMap, setColumnMap] = useState({})
  const [customFieldNames, setCustomFieldNames] = useState({}) // csvCol → custom field name
  const [savedCustomFields, setSavedCustomFields] = useState(loadSavedCustomFields)
  const [step, setStep] = useState(1) // 1=config, 2=mapping, 3=done
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [uploadStages, setUploadStages] = useState(stages || [])

  // Fetch stages when pipeline changes
  useEffect(() => {
    if (!pipelineId) return
    if (pipelineId === currentPipelineId) {
      setUploadStages(stages || [])
      if (stages?.[0]) setStageId(stages[0].id)
      return
    }
    crmClient.getStages(pipelineId).then(res => {
      const list = res.stages || []
      setUploadStages(list)
      if (list[0]) setStageId(list[0].id)
    }).catch(() => {})
  }, [pipelineId])

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

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const lines = text.trim().split('\n')
        const rawHeaders = parseCSVLine(lines[0]).map(h => h.replace(/['"]/g, '').trim())
        const normalizedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, '_'))
        const rows = lines.slice(1).map(line => {
          const vals = parseCSVLine(line)
          const obj = {}
          normalizedHeaders.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '') })
          return obj
        }).filter(r => Object.values(r).some(v => v.trim()))
        // Auto-guess column mappings
        const autoMap = {}
        normalizedHeaders.forEach(h => { autoMap[h] = guessMapping(h) })
        setColumnMap(autoMap)
        setPreview({ headers: normalizedHeaders, rawHeaders, rows, fileName: file.name })
        setStep(2)
      } catch { setPreview(null) }
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!preview?.rows?.length) return
    setUploading(true)
    try {
      const leads = preview.rows.map(r => {
        const mapped = {}
        const customFields = {}
        Object.entries(columnMap).forEach(([csvCol, crmField]) => {
          if (!r[csvCol]?.trim()) return
          if (crmField === '__custom__') {
            // Custom field — use the user-provided name
            const fieldName = customFieldNames[csvCol] || preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
            customFields[fieldName] = r[csvCol]
          } else if (crmField?.startsWith('custom_')) {
            // Previously saved custom field
            const saved = savedCustomFields.find(f => f.key === crmField)
            const fieldName = saved?.label || crmField
            customFields[fieldName] = r[csvCol]
          } else if (crmField) {
            if (mapped[crmField]) mapped[crmField] += ' ' + r[csvCol]
            else mapped[crmField] = r[csvCol]
          } else {
            // Skipped — store as custom field with original header name
            const label = preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
            customFields[label] = r[csvCol]
          }
        })
        // Also include CSV columns that aren't in columnMap at all
        Object.keys(r).forEach(csvCol => {
          if (!(csvCol in columnMap) && r[csvCol]?.trim()) {
            const label = preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
            customFields[label] = r[csvCol]
          }
        })
        // Build name from first+last if no full name
        const name = mapped.name || `${mapped.first_name || ''} ${mapped.last_name || ''}`.trim()
        if (!name) return null
        return {
          name,
          phone: mapped.phone || '',
          email: mapped.email || '',
          state: mapped.state || '',
          dob: mapped.dob || '',
          age: mapped.age || '',
          gender: mapped.gender || '',
          face_amount: mapped.face_amount || '',
          premium: mapped.premium || '',
          beneficiary: mapped.beneficiary || '',
          beneficiary_relation: mapped.beneficiary_relation || '',
          carrier: mapped.carrier || '',
          ad_source: mapped.ad_source || '',
          platform: mapped.platform || '',
          notes: mapped.notes || '',
          health_history: mapped.health_history || '',
          has_life_insurance: mapped.has_life_insurance || '',
          bank_name: mapped.bank_name || '',
          payment_method: mapped.payment_method || '',
          custom_fields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : '',
          pipeline_id: pipelineId,
          stage_id: stageId,
          lead_type: leadType,
          lead_age: leadAge,
          createdAt: new Date().toISOString(),
        }
      }).filter(Boolean)
      try {
        const data = await crmClient.importLeads({ leads })
        setResult({ success: true, count: data.imported || leads.length })
      } catch {
        setResult({ success: true, count: leads.length, local: true })
      }
      // Persist any new custom field names for future uploads
      Object.entries(columnMap).forEach(([csvCol, crmField]) => {
        if (crmField === '__custom__') {
          const fieldName = customFieldNames[csvCol] || preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
          saveCustomField(fieldName)
        }
      })
      setSavedCustomFields(loadSavedCustomFields())
      setStep(3)
    } finally { setUploading(false) }
  }

  const mappedCount = Object.values(columnMap).filter(v => v).length
  const hasName = Object.values(columnMap).includes('name') || (Object.values(columnMap).includes('first_name') && Object.values(columnMap).includes('last_name'))

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: step === 2 ? '700px' : '560px', maxHeight: '85vh', overflow: 'auto', background: 'var(--theme-surface)', borderRadius: '16px', border: '1px solid var(--theme-border)', padding: '32px', transition: 'width 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
            {step === 1 ? 'Upload Leads' : step === 2 ? 'Map Columns' : 'Upload Complete'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Step {step}/3</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* STEP 1: Config + File Select */}
        {step === 1 && (<>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Pipeline</label>
            <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} style={inputStyle}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Starting Stage</label>
            <select value={stageId} onChange={e => setStageId(e.target.value)} style={inputStyle}>
              {uploadStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lead Type</label>
            <select value={leadType} onChange={e => setLeadType(e.target.value)} style={inputStyle}>
              <option value="">— Select —</option>
              {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lead Age</label>
            <select value={leadAge} onChange={e => setLeadAge(e.target.value)} style={inputStyle}>
              <option value="new_lead">🆕 New</option>
              <option value="aged">📜 Aged</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>CSV File</label>
            <div onClick={() => fileRef.current?.click()} style={{ padding: '32px', borderRadius: '10px', border: '2px dashed var(--theme-border)', background: 'var(--theme-bg)', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Click to select CSV file</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </>)}

        {/* STEP 2: Column Mapping */}
        {step === 2 && preview && (<>
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', background: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '4px' }}>📄 {preview.fileName} — <strong>{preview.rows.length} leads</strong></div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>{mappedCount} of {preview.headers.length} columns mapped {hasName ? '✅' : '⚠️ Map a Name field to continue'}</div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>CSV Column</div>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>→</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>CRM Field</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Preview</div>
            </div>
            {preview.headers.map((h, i) => (
              <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)', fontFamily: 'monospace' }}>{preview.rawHeaders[i]}</div>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>→</div>
                  <select
                    value={columnMap[h] || ''}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '__custom__') {
                        setColumnMap(prev => ({ ...prev, [h]: '__custom__' }))
                        setCustomFieldNames(prev => ({ ...prev, [h]: preview.rawHeaders[i] }))
                      } else {
                        setColumnMap(prev => ({ ...prev, [h]: val }))
                        setCustomFieldNames(prev => { const n = { ...prev }; delete n[h]; return n })
                      }
                    }}
                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', background: columnMap[h] ? 'var(--theme-accent-muted)' : 'var(--theme-bg)', borderColor: columnMap[h] ? 'var(--theme-accent)' : 'var(--theme-border)' }}
                  >
                    {CRM_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    {savedCustomFields.length > 0 && <option disabled>── Custom Fields ──</option>}
                    {savedCustomFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    <option value="__custom__">+ New Custom Text Field</option>
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preview.rows[0]?.[h] || '—'}
                  </div>
                </div>
                {columnMap[h] === '__custom__' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <div />
                    <div />
                    <input
                      type="text"
                      placeholder="Custom field name..."
                      value={customFieldNames[h] || ''}
                      onChange={e => setCustomFieldNames(prev => ({ ...prev, [h]: e.target.value }))}
                      style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', borderColor: 'var(--theme-phone)', background: 'rgba(245,158,11,0.08)' }}
                      autoFocus
                    />
                    <div />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setStep(1); setPreview(null); setColumnMap({}) }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Back</button>
            <button onClick={handleUpload} disabled={!hasName || uploading} style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
              background: hasName ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
              color: hasName ? 'var(--theme-accent)' : '#52525b', fontSize: '13px', fontWeight: 600,
              cursor: hasName ? 'pointer' : 'default', opacity: uploading ? 0.6 : 1,
            }}>{uploading ? 'Uploading...' : `Upload ${preview.rows.length} Leads`}</button>
          </div>
        </>)}

        {/* STEP 3: Done */}
        {step === 3 && result && (<>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)', marginBottom: '8px' }}>{result.count} Leads Uploaded</div>
            <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>They're now in your pipeline ready to work</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
              background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Done</button>
          </div>
        </>)}
      </div>
    </div>
  )
}

// ========================================
// New Lead Modal (updated for dynamic pipelines)
// ========================================
function NewLeadModal({ onClose, actions, pipelines, stages, currentPipelineId }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', state: '', dob: '', age: '',
    leadType: 'FEX',
    pipelineId: currentPipelineId || '',
    stageId: stages?.[0]?.id || '',
    faceAmount: '', beneficiary: '', beneficiaryRelation: '',
    gender: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [modalStages, setModalStages] = useState(stages || [])

  useEffect(() => {
    if (!form.pipelineId || form.pipelineId === currentPipelineId) {
      setModalStages(stages || [])
      return
    }
    crmClient.getStages(form.pipelineId).then(res => {
      const list = res.stages || []
      setModalStages(list)
      if (list[0]) setForm(prev => ({ ...prev, stageId: list[0].id }))
    }).catch(() => {})
  }, [form.pipelineId])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.name && !form.phone) return
    setSaving(true)
    try {
      const lead = {
        name: form.name, phone: form.phone, email: form.email, state: form.state,
        dob: form.dob, age: form.age, lead_type: form.leadType,
        pipeline_id: form.pipelineId, stage_id: form.stageId,
        face_amount: form.faceAmount, beneficiary: form.beneficiary,
        beneficiary_relation: form.beneficiaryRelation, gender: form.gender,
        notes: form.notes, priority: 'medium', tags: ['Lead', 'Manual'],
      }
      const res = await crmClient.createLead(lead)
      if (res && (res.id || res.lead)) {
        const newLead = res.lead || res
        actions.addLead({
          ...newLead,
          leadType: form.leadType,
          faceAmount: form.faceAmount,
          pipeline_id: form.pipelineId, pipelineId: form.pipelineId,
          stage_id: form.stageId, stageId: form.stageId,
          createdAt: new Date().toISOString(),
        })
      }
      onClose()
    } catch (err) {
      console.error('Failed to create lead:', err)
    } finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '520px', maxHeight: '85vh', overflow: 'auto', background: 'var(--theme-surface)', borderRadius: '16px', border: '1px solid var(--theme-border)', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>+ New Lead</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} placeholder="First Last" value={form.name} onChange={e => handleChange('name', e.target.value)} /></div>
          <div><label style={labelStyle}>Phone *</label><input style={inputStyle} placeholder="Phone number" value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></div>
          <div><label style={labelStyle}>Email</label><input style={inputStyle} placeholder="Email" value={form.email} onChange={e => handleChange('email', e.target.value)} /></div>
          <div><label style={labelStyle}>State</label><input style={inputStyle} placeholder="State" value={form.state} onChange={e => handleChange('state', e.target.value)} /></div>
          <div><label style={labelStyle}>DOB</label><input style={inputStyle} placeholder="MM/DD/YYYY" value={form.dob} onChange={e => handleChange('dob', e.target.value)} /></div>
          <div><label style={labelStyle}>Lead Type</label>
            <select style={inputStyle} value={form.leadType} onChange={e => handleChange('leadType', e.target.value)}>
              {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Pipeline</label>
            <select style={inputStyle} value={form.pipelineId} onChange={e => handleChange('pipelineId', e.target.value)}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Stage</label>
            <select style={inputStyle} value={form.stageId} onChange={e => handleChange('stageId', e.target.value)}>
              {modalStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Coverage</label><input style={inputStyle} placeholder="$10,000" value={form.faceAmount} onChange={e => handleChange('faceAmount', e.target.value)} /></div>
          <div><label style={labelStyle}>Gender</label>
            <select style={inputStyle} value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
              <option value="">—</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Notes..." value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || (!form.name && !form.phone)} style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
            background: (form.name || form.phone) ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
            color: (form.name || form.phone) ? 'var(--theme-accent)' : '#52525b',
            fontSize: '13px', fontWeight: 600, cursor: (form.name || form.phone) ? 'pointer' : 'default',
          }}>{saving ? 'Saving...' : 'Create Lead'}</button>
        </div>
      </div>
    </div>
  )
}

// ========================================
// Utility functions
// ========================================
function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

function formatLeadDate(dateStr) {
  if (!dateStr) return ''
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
