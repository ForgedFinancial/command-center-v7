import { useState, useEffect, useCallback, useRef } from 'react'
import crmClient from '../../../../api/crmClient'

const COLOR_OPTIONS = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#06b6d4','#ef4444','#6366f1','#14b8a6','#a855f7','#f43f5e']
const LEAD_FIELDS = ['first_name','last_name','email','phone','address','city','state','zip','dob','lead_type','source','policy_type','premium','notes']

const card = { padding: '24px', borderRadius: '12px', background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', marginBottom: '16px' }
const btnPrimary = { padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-accent)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
const btnDanger = { padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--theme-error)', background: 'transparent', color: 'var(--theme-error)', fontSize: '11px', cursor: 'pointer' }
const inputStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text-primary)', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }

export default function StageManager({ pipelines }) {
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#3b82f6', timer_hours: '', required_fields: [] })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [migrateTo, setMigrateTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  useEffect(() => {
    if (pipelines?.length && !selectedPipeline) setSelectedPipeline(pipelines[0].id)
  }, [pipelines, selectedPipeline])

  const fetchStages = useCallback(async () => {
    if (!selectedPipeline) return
    setLoading(true); setError(null)
    try {
      const res = await crmClient.getStages(selectedPipeline)
      setStages(res.stages || res.data || res || [])
    } catch { setError('Failed to load stages') }
    finally { setLoading(false) }
  }, [selectedPipeline])

  useEffect(() => { fetchStages() }, [fetchStages])

  const startEdit = (s) => {
    setEditing(s.id)
    setForm({
      name: s.name, color: s.color || '#3b82f6',
      timer_hours: s.timer_hours || '',
      required_fields: s.required_fields || [],
    })
  }

  const startNew = () => {
    setEditing('new')
    setForm({ name: '', color: '#3b82f6', timer_hours: '', required_fields: [] })
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true); setError(null)
    const data = { ...form, timer_hours: form.timer_hours ? Number(form.timer_hours) : null }
    try {
      if (editing === 'new') {
        await crmClient.createStage(selectedPipeline, data)
      } else {
        await crmClient.updateStage(editing, data)
      }
      setEditing(null)
      await fetchStages()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true); setError(null)
    try {
      if ((deleteTarget.lead_count || 0) > 0 && migrateTo) {
        const leads = await crmClient.getLeads({ stage_id: deleteTarget.id })
        const leadList = leads.leads || leads.data || []
        for (const lead of leadList) {
          await crmClient.updateLead(lead.id, { stage_id: migrateTo })
        }
      }
      await crmClient.deleteStage(deleteTarget.id)
      setDeleteTarget(null); setMigrateTo('')
      await fetchStages()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return
    const items = [...stages]
    const [dragged] = items.splice(dragItem.current, 1)
    items.splice(dragOver.current, 0, dragged)
    setStages(items)
    dragItem.current = null; dragOver.current = null
    try { await crmClient.reorderStages(selectedPipeline, items.map(s => s.id)) } catch {}
  }

  const toggleField = (field) => {
    setForm(f => ({
      ...f,
      required_fields: f.required_fields.includes(field)
        ? f.required_fields.filter(x => x !== field)
        : [...f.required_fields, field],
    }))
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>📊 Stages</h3>

      {/* Pipeline selector */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>Select Pipeline</div>
        <select
          value={selectedPipeline}
          onChange={e => setSelectedPipeline(e.target.value)}
          style={{ ...inputStyle, maxWidth: '300px' }}
        >
          {(pipelines || []).map(p => (
            <option key={p.id} value={p.id}>{p.icon || '📁'} {p.name}</option>
          ))}
        </select>
      </div>

      {error && <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--theme-error)', fontSize: '11px', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Loading stages...</div>
      ) : (
        <>
          {stages.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => { dragItem.current = i }}
              onDragEnter={() => { dragOver.current = i }}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '8px', background: 'var(--theme-bg)',
                marginBottom: '6px', cursor: 'grab', borderLeft: `3px solid ${s.color || '#3b82f6'}`,
              }}
            >
              <span style={{ cursor: 'grab', opacity: 0.4 }}>⠿</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color || '#3b82f6', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>{s.name}</span>
              {s.timer_hours && <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>⏱ {s.timer_hours}h</span>}
              <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>{s.lead_count || 0} leads</span>
              <button onClick={() => startEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
              <button onClick={() => { setDeleteTarget(s); setMigrateTo('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
            </div>
          ))}

          <button onClick={startNew} style={{ ...btnPrimary, marginTop: '8px' }}>+ Add Stage</button>
        </>
      )}

      {/* Edit / New form */}
      {editing && (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--theme-bg)', border: '1px solid var(--theme-accent)', marginTop: '12px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--theme-text-primary)' }}>
            {editing === 'new' ? 'New Stage' : 'Edit Stage'}
          </h4>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Stage name" style={{ ...inputStyle, marginBottom: '8px' }} />
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>Color</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid var(--theme-text-primary)' : '2px solid transparent',
                  }} />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>Timer (hours)</div>
              <input
                type="number" min="0" max="8760"
                value={form.timer_hours}
                onChange={e => setForm(f => ({ ...f, timer_hours: e.target.value }))}
                placeholder="e.g. 72"
                style={{ ...inputStyle, width: '100px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '6px' }}>Required Fields</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {LEAD_FIELDS.map(f => (
                <button
                  key={f}
                  onClick={() => toggleField(f)}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                    border: '1px solid var(--theme-border)',
                    background: form.required_fields.includes(f) ? 'var(--theme-accent-muted)' : 'transparent',
                    color: form.required_fields.includes(f) ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
                    fontWeight: form.required_fields.includes(f) ? 600 : 400,
                  }}
                >{f}</button>
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
              Delete stage "{deleteTarget.name}"?
            </h3>
            {(deleteTarget.lead_count || 0) > 0 ? (
              <>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
                  This stage has <strong style={{ color: 'var(--theme-error)' }}>{deleteTarget.lead_count} leads</strong>.
                  Choose a stage to migrate them to:
                </p>
                <select
                  value={migrateTo}
                  onChange={e => setMigrateTo(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '16px' }}
                >
                  <option value="">— Select destination stage —</option>
                  {stages.filter(s => s.id !== deleteTarget.id).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
                  This stage has no leads. It will be permanently deleted.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDeleteTarget(null)} style={{ ...btnPrimary, background: 'transparent', color: 'var(--theme-text-secondary)', borderColor: 'var(--theme-border)' }}>Cancel</button>
                  <button onClick={confirmDelete} disabled={saving} style={btnDanger}>
                    {saving ? 'Deleting...' : 'Delete Stage'}
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
