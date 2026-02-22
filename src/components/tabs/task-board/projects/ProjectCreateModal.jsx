import { useState } from 'react'
import Modal from '../../../shared/Modal'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'
import { PROJECT_TEMPLATES, TEMPLATE_LIST, PROJECT_ICONS, PROJECT_COLORS } from '../../../../config/projectTemplates'

export default function ProjectCreateModal({ existingProjects = [], onClose, parentProjectId = null }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [step, setStep] = useState('template') // template | details
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', status: 'active',
    color: '#71717a', icon: '📁',
  })
  const [saving, setSaving] = useState(false)

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl)
    setForm(f => ({ ...f, color: tpl.color, icon: tpl.icon }))
    setStep('details')
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      // Calculate canvas position — place to the right of the last card
      const positions = existingProjects.map(p => p.canvasPosition || { x: 0, y: 0 })
      const maxX = positions.length > 0 ? Math.max(...positions.map(p => p.x)) : -280
      const canvasPosition = { x: maxX + 280, y: 40 }

      const payload = {
        name: form.name,
        description: form.description,
        status: form.status,
        template: selectedTemplate?.id || 'custom',
        color: form.color,
        icon: form.icon,
        columns: (selectedTemplate || PROJECT_TEMPLATES.custom).columns,
        canvasPosition,
        parentProjectId,
      }

      const res = await taskboardClient.createProject(payload)
      if (res.ok) {
        actions.addProject(res.data)
        appActions.addToast({ type: 'success', message: 'Project created' })
        onClose()
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 600,
    color: 'var(--theme-text-secondary)', textTransform: 'uppercase',
    letterSpacing: '1px', marginBottom: '6px',
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={step === 'template' ? 'Choose a Template' : 'New Project'}
      width={step === 'template' ? 600 : 480}
      footer={step === 'details' ? (
        <>
          <button onClick={() => setStep('template')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
            ← Back
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.3)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '12px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: (!form.name.trim() || saving) ? 0.5 : 1 }}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </>
      ) : null}
    >
      {step === 'template' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {TEMPLATE_LIST.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              style={{
                padding: '16px', borderRadius: '10px', cursor: 'pointer',
                background: 'var(--theme-bg)', border: `1px solid rgba(255,255,255,0.06)`,
                transition: 'all 0.15s', textAlign: 'center',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = tpl.color; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{tpl.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>{tpl.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', lineHeight: 1.3 }}>{tpl.description}</div>
              <div style={{ fontSize: '9px', color: tpl.color, marginTop: '6px', fontWeight: 500 }}>
                {tpl.columns.length} columns
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Template badge */}
          {selectedTemplate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '16px' }}>{selectedTemplate.icon}</span>
              <span style={{ fontSize: '12px', color: selectedTemplate.color, fontWeight: 600 }}>{selectedTemplate.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>• {selectedTemplate.columns.length} columns</span>
            </div>
          )}

          <div>
            <label style={labelStyle}>Project Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Enter project name..." style={inputStyle} autoFocus />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Icon selector */}
          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PROJECT_ICONS.map(ic => (
                <div key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: form.icon === ic ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
                    border: form.icon === ic ? '1px solid var(--theme-accent)' : '1px solid transparent',
                  }}>{ic}</div>
              ))}
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: '24px', height: '24px', borderRadius: '6px', background: c,
                    cursor: 'pointer', border: form.color === c ? '2px solid #fff' : '2px solid transparent',
                    transition: 'border 0.15s',
                  }} />
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
            </select>
          </div>
        </div>
      )}
    </Modal>
  )
}
