import { useState } from 'react'
import Modal from '../../../shared/Modal'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'

export default function ProjectCreateModal() {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await taskboardClient.createProject(form)
      if (res.ok) {
        actions.addProject(res.data)
        actions.setCreateProjectModalOpen(false)
        setForm({ name: '', description: '', status: 'active' })
        appActions.addToast({ type: 'success', message: 'Project created' })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed to create project: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--theme-text-primary)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--theme-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '6px',
  }

  return (
    <Modal
      isOpen={state.createProjectModalOpen}
      onClose={() => actions.setCreateProjectModalOpen(false)}
      title="New Project"
      width={480}
      footer={
        <>
          <button
            onClick={() => actions.setCreateProjectModalOpen(false)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'var(--theme-text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: (!form.name.trim() || saving) ? 0.5 : 1,
            }}
          >
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Project Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Enter project name..."
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of the project..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
            style={inputStyle}
          >
            <option value="active">Active</option>
            <option value="planning">Planning</option>
          </select>
        </div>
      </div>
    </Modal>
  )
}
