import { useState, useEffect, useCallback, useRef } from 'react'
import crmClient from '../../../../api/crmClient'
import { PIPELINE_ICONS } from '../../../../config/pipelineConfig'

const DEFAULT_PIPELINES = [
  'Lead Management', 'Approval Process', 'Policy Lifecycle',
  'Retention Exceptions', 'Rewrite | Rejected', 'Active | Inforce', 'Nurture | Long Term',
]

const EMOJI_OPTIONS = ['🎯','📋','📄','⚠️','🔄','✅','🌱','💰','📞','🏠','🚗','❤️','⭐','🔥','💎','📊','🎪','🛡️','📌','🏆']
const COLOR_OPTIONS = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#06b6d4','#ef4444','#6366f1','#14b8a6']

const card = { padding: '24px', borderRadius: '12px', background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', marginBottom: '16px' }
const btnPrimary = { padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
const btnDanger = { padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--theme-error)', background: 'transparent', color: 'var(--theme-error)', fontSize: '11px', cursor: 'pointer' }
const inputStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text-primary)', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }

export default function PipelineManager({ onPipelinesChanged }) {
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // pipeline id or 'new'
  const [form, setForm] = useState({ name: '', description: '', icon: '📁', color: '#3b82f6' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [migrateTo, setMigrateTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  const fetch_ = useCallback(async () => {
    try {
      const res = await crmClient.getPipelines()
      setPipelines(res.pipelines || res.data || res || [])
    } catch { setError('Failed to load pipelines') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const startEdit = (p) => {
    setEditing(p.id)
    setForm({ name: p.name, description: p.description || '', icon: p.icon || PIPELINE_ICONS[p.name] || '📁', color: p.color || '#3b82f6' })
  }

  const startNew = () => {
    if (pipelines.length >= 15) { setError('Soft limit: 15 pipelines reached. Consider consolidating.'); return }
    setEditing('new')
    setForm({ name: '', description: '', icon: '📁', color: '#3b82f6' })
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true); setError(null)
    try {
      if (editing === 'new') {
        await crmClient.createPipeline(form)
      } else {
        await crmClient.updatePipeline(editing, form)
      }
      setEditing(null)
      await fetch_()
      onPipelinesChanged?.()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true); setError(null)
    try {
      // If leads exist, migrate them first
      if (deleteTarget.lead_count > 0 && migrateTo) {
        const leads = await crmClient.getLeads({ pipeline_id: deleteTarget.id })
        const leadList = leads.leads || leads.data || []
        for (const lead of leadList) {
          await crmClient.updateLead(lead.id, { pipeline_id: migrateTo })
        }
      }
      await crmClient.deletePipeline(deleteTarget.id)
      setDeleteTarget(null); setMigrateTo('')
      await fetch_()
      onPipelinesChanged?.()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const restoreDefaults = async () => {
    setSaving(true); setError(null)
    try {
      const existing = pipelines.map(p => p.name)
      for (const name of DEFAULT_PIPELINES) {
        if (!existing.includes(name)) {
          await crmClient.createPipeline({ name, icon: PIPELINE_ICONS[name] || '📁', color: '#3b82f6' })
        }
      }
      await fetch_()
      onPipelinesChanged?.()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return
    const items = [...pipelines]
    const [dragged] = items.splice(dragItem.current, 1)
    items.splice(dragOver.current, 0, dragged)
    setPipelines(items)
    dragItem.current = null; dragOver.current = null
    try { await crmClient.reorderPipelines(items.map(p => p.id)) } catch {}
  }

  if (loading) return <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', padding: '16px' }}>Loading pipelines...</div>

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>🔧 Pipelines</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={restoreDefaults} style={{ ...btnPrimary, background: 'transparent', color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-border)' }} disabled={saving}>
            Restore Defaults
          </button>
          <button onClick={startNew} style={btnPrimary} disabled={saving}>+ New Pipeline</button>
        </div>
      </div>

      {pipelines.length >= 15 && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '11px', marginBottom: '12px' }}>
          ⚠️ You have {pipelines.length} pipelines. Consider consolidating for better performance.
        </div>
      )}

      {error && <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--theme-error)', fontSize: '11px', marginBottom: '12px' }}>{error}</div>}

      {/* Pipeline list */}
      {pipelines.map((p, i) => (
        <div
          key={p.id}
          draggable
          onDragStart={() => { dragItem.current = i }}
          onDragEnter={() => { dragOver.current = i }}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', borderRadius: '8px', background: 'var(--theme-bg)',
            marginBottom: '6px', cursor: 'grab', borderLeft: `3px solid ${p.color || '#3b82f6'}`,
          }}
        >
          <span style={{ cursor: 'grab', opacity: 0.4 }}>⠿</span>
          <span style={{ fontSize: '16px' }}>{p.icon || PIPELINE_ICONS[p.name] || '📁'}</span>
          <span style={{ flex: 1, fontSize: '13px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>{p.lead_count || 0} leads</span>
          <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
          <button onClick={() => { setDeleteTarget(p); setMigrateTo('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
        </div>
      ))}

      {/* Edit / New form */}
      {editing && (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--theme-bg)', border: '1px solid var(--theme-accent)', marginTop: '12px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--theme-text-primary)' }}>
            {editing === 'new' ? 'New Pipeline' : 'Edit Pipeline'}
          </h4>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Pipeline name" style={{ ...inputStyle, marginBottom: '8px' }} />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" style={{ ...inputStyle, marginBottom: '12px' }} />
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>Icon</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, icon: e }))} style={{
                  width: '32px', height: '32px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer',
                  border: form.icon === e ? '2px solid var(--theme-accent)' : '1px solid var(--theme-border)',
                  background: form.icon === e ? 'var(--theme-accent-muted)' : 'transparent',
                }}>{e}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>Color</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer',
                  border: form.color === c ? '3px solid var(--theme-text-primary)' : '2px solid transparent',
                }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(null)} style={{ ...btnPrimary, background: 'transparent', color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-border)' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}

      {/* Delete migration dialog */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            padding: '24px', borderRadius: '12px', background: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)', maxWidth: '400px', width: '90%',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--theme-text-primary)' }}>
              Delete "{deleteTarget.name}"?
            </h3>
            {(deleteTarget.lead_count || 0) > 0 ? (
              <>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                  This pipeline has <strong style={{ color: 'var(--theme-error)' }}>{deleteTarget.lead_count} leads</strong>.
                  Choose a pipeline to migrate them to:
                </p>
                <select
                  value={migrateTo}
                  onChange={e => setMigrateTo(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '16px' }}
                >
                  <option value="">— Select destination —</option>
                  {pipelines.filter(p => p.id !== deleteTarget.id).map(p => (
                    <option key={p.id} value={p.id}>{p.icon || '📁'} {p.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDeleteTarget(null)} style={{ ...btnPrimary, background: 'transparent', color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-border)' }}>Cancel</button>
                  <button onClick={confirmDelete} disabled={!migrateTo || saving} style={{ ...btnDanger, opacity: !migrateTo ? 0.4 : 1 }}>
                    {saving ? 'Migrating...' : 'Migrate & Delete'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                  This pipeline has no leads. It will be permanently deleted.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDeleteTarget(null)} style={{ ...btnPrimary, background: 'transparent', color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-border)' }}>Cancel</button>
                  <button onClick={confirmDelete} disabled={saving} style={btnDanger}>
                    {saving ? 'Deleting...' : 'Delete Pipeline'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
