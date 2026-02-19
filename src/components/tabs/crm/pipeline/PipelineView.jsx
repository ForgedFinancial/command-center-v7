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

import { ALL_CARD_FIELDS, STAGE_COLOR_PALETTE, loadCardFields, saveCardFields, discoverCustomCardFields } from './pipelineHelpers'
import LeadCard from './LeadCard'
import StageColumn from './StageColumn'
import CardFieldSettings from './CardFieldSettings'
import TransferModal from './TransferModal'
import BatchActions from './BatchActions'
import UploadLeadsModal from './UploadLeadsModal'

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

export default function PipelineView() {
  const { state, actions } = useCRM()
  const { actions: appActions } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [leadTypeFilter, setLeadTypeFilter] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [showNewLead, setShowNewLead] = useState(false)
  const [showCardSettings, setShowCardSettings] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(null)
  const [stageTransition, setStageTransition] = useState(null)
  const [cardFields, setCardFields] = useState(() => loadCardFields(state.pipelineMode))
  const customCardFields = useMemo(() => discoverCustomCardFields(state.leads), [state.leads])
  const allCardFieldOptions = useMemo(() => [...ALL_CARD_FIELDS, ...customCardFields], [customCardFields])

  useEffect(() => {
    setCardFields(loadCardFields(state.pipelineMode))
  }, [state.pipelineMode])

  const dragLeadId = useRef(null)

  const {
    pipelines, stages, currentPipelineId, loading,
    leadCounts, selectPipeline, fetchPipelines, setLeadCounts,
  } = usePipelines()

  const pipelineLeads = useMemo(() => {
    if (!currentPipelineId) return []
    return state.leads.filter(l => l.pipeline_id === currentPipelineId || l.pipelineId === currentPipelineId)
  }, [state.leads, currentPipelineId])

  const filteredLeads = useMemo(() => {
    let leads = pipelineLeads
    if (leadTypeFilter) leads = leads.filter(l => (l.leadType || l.lead_type) === leadTypeFilter)
    if (state.pipelineMode === 'new') leads = leads.filter(l => (l.lead_age || l.leadAge || 'new_lead') !== 'aged')
    if (state.pipelineMode === 'aged') leads = leads.filter(l => (l.lead_age || l.leadAge) === 'aged')
    return leads
  }, [pipelineLeads, leadTypeFilter, state.pipelineMode])

  const columns = useMemo(() => {
    if (!stages || stages.length === 0) return []
    return stages.map((stage, idx) => {
      const stageLeads = filteredLeads.filter(l => l.stage_id === stage.id || l.stageId === stage.id)
        .sort((a, b) => {
          if (stage.name === 'New Lead' || idx === 0) {
            const aTime = new Date(a.createdAt || a.created_at || 0).getTime()
            const bTime = new Date(b.createdAt || b.created_at || 0).getTime()
            return aTime - bTime
          } else {
            const aTime = new Date(a.updatedAt || a.updated_at || 0).getTime()
            const bTime = new Date(b.updatedAt || b.updated_at || 0).getTime()
            return bTime - aTime
          }
        })
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
    const validation = validateTransition(lead, toStage)
    if (!validation.valid) {
      setStageTransition({ lead, fromStage, toStage })
      return
    }
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
      await crmClient.moveLead(leadId, currentPipelineId, toStageId, lead.pipeline_id || lead.pipelineId, fromStageId)
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

  const handleTransfer = async (lead, toPipelineId, toStageId) => {
    const fromPipelineId = lead.pipeline_id || lead.pipelineId
    const fromStageId = lead.stage_id || lead.stageId
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

  // Seen leads tracking
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

  const handleModalUpdate = (updatedLead, closeModal = false) => {
    actions.updateLead(updatedLead)
    if (closeModal) setSelectedLead(null)
  }
  const handleModalDelete = (id) => {
    actions.removeLead(id)
    setSelectedLead(null)
  }

  const currentPipeline = pipelines.find(p => p.id === currentPipelineId)

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
      <BatchActions
        selectedCount={selectedLeadIds.size}
        stages={stages}
        onSelectAll={selectAllLeads}
        onDeselectAll={deselectAllLeads}
        onBatchMoveStage={handleBatchMoveStage}
        onBatchExport={handleBatchExport}
        onBatchDelete={handleBatchDelete}
      />

      {/* Kanban */}
      {columns.length === 0 ? (
        <EmptyState icon="🔀" title="No Stages" message="This pipeline has no stages configured." />
      ) : (
        <div style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto', paddingBottom: '12px', animation: 'cc7-fadeIn 0.2s ease-out' }}>
          <style>{`@keyframes cc7-fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }`}</style>
          {columns.map(col => (
            <StageColumn
              key={col.stage}
              col={col}
              dragOverStage={dragOverStage}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              cardFields={cardFields}
              onDragStart={onDragStart}
              onLeadClick={(lead) => { setSelectedLead(lead); markSeen(lead.id) }}
              onDeleteLead={handleDeleteLead}
              onPhoneCall={handlePhoneCall}
              onVideoCall={handleVideoCall}
              onMessage={handleMessage}
              onTransfer={(lead) => setShowTransferModal(lead)}
              seenLeads={seenLeads}
              onMarkSeen={markSeen}
              selectedLeadIds={selectedLeadIds}
              onToggleSelect={toggleLeadSelection}
              stages={stages}
              currentPipelineId={currentPipelineId}
              actions={actions}
              appActions={appActions}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadLeadsModal onClose={() => setShowUpload(false)} actions={actions} pipelines={pipelines} stages={stages} currentPipelineId={currentPipelineId} />}
      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} actions={actions} pipelines={pipelines} stages={stages} currentPipelineId={currentPipelineId} />}
      {showCardSettings && <CardFieldSettings
        fields={cardFields}
        allFields={allCardFieldOptions}
        onSave={(f) => { setCardFields(f); saveCardFields(f, state.pipelineMode); setShowCardSettings(false) }}
        currentMode={state.pipelineMode}
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
// New Lead Modal (kept in PipelineView as it's tightly coupled)
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
