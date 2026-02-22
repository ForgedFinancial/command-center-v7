import { useMemo, useState } from 'react'
import Modal from '../../../../shared/Modal'
import { useTaskBoard } from '../../../../../context/TaskBoardContext'
import { useApp } from '../../../../../context/AppContext'
import taskboardClient from '../../../../../api/taskboardClient'
import { TEMPLATE_DATA } from '../templates/templateData'

const PINNED_TEMPLATE_ORDER = [
  'Agent Pipeline Board',
  'Policy Tracker',
  'Case Management',
  'Team Sprint Board',
]

const LI_RECOMMENDED = new Set(['Agent Pipeline Board', 'Policy Tracker', 'Case Management', 'Team Sprint Board'])

function toTemplateCard(template, index) {
  const fallback = [
    'Agent Pipeline Board',
    'Policy Tracker',
    'Case Management',
    'Team Sprint Board',
  ][index] || template.name

  let normalizedName = template.name
  if (template.name === 'Lead Campaign') normalizedName = 'Policy Tracker'
  if (template.name === 'Agent Onboarding') normalizedName = 'Case Management'
  if (template.name === 'Policy Review Meeting') normalizedName = 'Team Sprint Board'

  return {
    id: template.id,
    name: normalizedName || fallback,
    description: template.description || 'Start from a curated canvas layout.',
    objects: template.objects || [],
  }
}

export default function NewProjectModal({ open, onClose, existingProjects = [], parentProjectId = null }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    emoji: '📁',
    status: 'active',
    description: '',
    templateId: null,
  })

  const templates = useMemo(() => {
    const cards = TEMPLATE_DATA.map(toTemplateCard)
    const pinned = []
    const rest = []

    cards.forEach((card) => {
      if (PINNED_TEMPLATE_ORDER.includes(card.name)) pinned.push(card)
      else rest.push(card)
    })

    pinned.sort((a, b) => PINNED_TEMPLATE_ORDER.indexOf(a.name) - PINNED_TEMPLATE_ORDER.indexOf(b.name))
    return [...pinned, ...rest]
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Project name is required.')
      return
    }
    if (name.length > 120) {
      setError('Project name must be 120 characters or fewer.')
      return
    }
    if (form.description.length > 1000) {
      setError('Description must be 1000 characters or fewer.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name,
      emoji: form.emoji || '📁',
      icon: form.emoji || '📁',
      status: form.status,
      description: form.description.trim(),
      templateId: form.templateId,
    }

    try {
      const res = form.templateId
        ? await taskboardClient.createProjectFromTemplate(payload)
        : await taskboardClient.createProject({
          ...payload,
          template: 'custom',
          color: '#00D4FF',
          columns: [],
          canvasPosition: {
            x: (existingProjects.length * 38) % 720 + 80,
            y: Math.floor(existingProjects.length / 6) * 36 + 80,
          },
          parentProjectId,
          workspacePosition: parentProjectId ? { x: 80, y: 80 } : null,
        })

      if (!res?.ok) throw new Error(res?.error || 'Create failed')

      const created = { ...res.data, icon: res.data.icon || payload.emoji, __spawnAt: Date.now() }
      actions.addProject(created)
      appActions.addToast({ type: 'success', message: 'Project created' })
      onClose()
      setForm({ name: '', emoji: '📁', status: 'active', description: '', templateId: null })
    } catch (err) {
      setError(err.message || 'Failed to create project')
      appActions.addToast({ type: 'error', message: err.message || 'Failed to create project' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="New Project"
      width={980}
      footer={(
        <>
          <button type="button" onClick={onClose} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(154,167,188,0.22)', background: 'transparent', color: '#9AA7BC', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" form="new-project-form" disabled={saving} style={{ height: 40, minWidth: 148, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(0,212,255,0.4)', background: 'rgba(0,212,255,0.16)', color: '#00D4FF', fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </>
      )}
    >
      <form id="new-project-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: '#9AA7BC', fontSize: 11, fontWeight: 600 }}>Project Name</span>
          <input
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            style={{ height: 40, borderRadius: 10, border: '1px solid rgba(154,167,188,0.24)', background: 'rgba(12,16,24,0.72)', color: '#E6EDF7', padding: '0 12px' }}
          />
        </label>

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '110px 1fr' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#9AA7BC', fontSize: 11, fontWeight: 600 }}>Icon</span>
            <input
              value={form.emoji}
              onChange={(e) => setForm((prev) => ({ ...prev, emoji: e.target.value.slice(0, 2) }))}
              style={{ height: 40, borderRadius: 10, border: '1px solid rgba(154,167,188,0.24)', background: 'rgba(12,16,24,0.72)', color: '#E6EDF7', padding: '0 10px', fontSize: 20 }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#9AA7BC', fontSize: 11, fontWeight: 600 }}>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              style={{ height: 40, borderRadius: 10, border: '1px solid rgba(154,167,188,0.24)', background: 'rgba(12,16,24,0.72)', color: '#E6EDF7', padding: '0 12px' }}
            >
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="on_hold">On Hold</option>
            </select>
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: '#9AA7BC', fontSize: 11, fontWeight: 600 }}>Description (optional)</span>
          <textarea
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            style={{ borderRadius: 10, border: '1px solid rgba(154,167,188,0.24)', background: 'rgba(12,16,24,0.72)', color: '#E6EDF7', padding: '10px 12px', resize: 'vertical' }}
          />
        </label>

        <section className="template-starter-section" style={{ borderRadius: 12, border: '1px solid rgba(154,167,188,0.22)', background: 'rgba(12,16,24,0.52)', padding: 12 }}>
          <h4 style={{ margin: '0 0 10px', color: '#E6EDF7', fontSize: 13 }}>Start from Template</h4>
          <div className="template-card-grid" style={{ display: 'grid', gap: 10 }}>
            {templates.map((template) => {
              const selected = form.templateId === template.id
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, templateId: template.id }))}
                  style={{ textAlign: 'left', borderRadius: 10, border: selected ? '1px solid rgba(0,212,255,0.56)' : '1px solid rgba(154,167,188,0.22)', background: selected ? 'rgba(0,212,255,0.10)' : 'rgba(7,9,15,0.65)', color: '#E6EDF7', padding: 10, cursor: 'pointer' }}
                >
                  <div style={{ aspectRatio: '16 / 9', borderRadius: 8, border: '1px solid rgba(154,167,188,0.22)', background: 'linear-gradient(120deg, rgba(0,212,255,0.16), rgba(12,16,24,0.4))', marginBottom: 8 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 12, flex: 1 }}>{template.name}</strong>
                    {LI_RECOMMENDED.has(template.name) && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, color: '#D4A574', border: '1px solid rgba(212,165,116,0.42)', background: 'rgba(212,165,116,0.14)' }}>Recommended</span>}
                  </div>
                  <div style={{ marginTop: 4, color: '#9AA7BC', fontSize: 11 }}>{template.description}</div>
                  <div style={{ marginTop: 5, color: '#66758C', fontSize: 10 }}>{template.objects.length} objects</div>
                </button>
              )
            })}
          </div>
          <button type="button" onClick={() => setForm((prev) => ({ ...prev, templateId: null }))} style={{ marginTop: 10, height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(154,167,188,0.28)', background: 'transparent', color: '#9AA7BC', cursor: 'pointer' }}>
            Empty Canvas
          </button>
        </section>

        {error && <p style={{ margin: 0, color: '#fca5a5', fontSize: 12 }}>{error}</p>}
      </form>
    </Modal>
  )
}
