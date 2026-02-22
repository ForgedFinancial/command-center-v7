import { useState } from 'react'
import Modal from '../../../shared/Modal'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'

export default function TaskCreateModal() {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    projectId: '', assignedAgent: '', dueDate: '', startTime: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  if (!state.createModalOpen) return null

  const handleClose = () => actions.setCreateModalOpen(false)

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      appActions.addToast({ type: 'error', message: 'Title is required' })
      return
    }
    setSaving(true)
    try {
      const res = await taskboardClient.createTask({
        ...form,
        projectId: form.projectId || null,
        assignedAgent: form.assignedAgent || null,
        dueDate: form.dueDate || null,
        startTime: form.startTime || null,
      })
      if (res.ok) {
        actions.addTask(res.data)
        actions.setCreateModalOpen(false)
        appActions.addToast({ type: 'success', message: `Created: ${form.title}` })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', color: '#e4e4e7', outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle = { display: 'block', fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }

  const footer = (
    <>
      <button onClick={handleClose} style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#a1a1aa', cursor: 'pointer' }}>
        Cancel
      </button>
      <button onClick={handleSubmit} disabled={saving} style={{
        padding: '8px 16px', fontSize: '12px', borderRadius: '8px', border: 'none',
        background: 'var(--theme-accent)', color: '#0f0f1a', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Creating...' : 'Create Task'}
      </button>
    </>
  )

  return (
    <Modal isOpen={true} onClose={handleClose} title="New Task" width={540} footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title..." autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the task..." />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Assign Agent</label>
            <select style={inputStyle} value={form.assignedAgent} onChange={(e) => setForm({ ...form, assignedAgent: e.target.value })}>
              <option value="">Unassigned</option>
              <option value="mason">Mason</option>
              <option value="sentinel">Sentinel</option>
              <option value="soren">Architect</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Project</label>
            <select style={inputStyle} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">No Project</option>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Due Date</label>
            <input style={inputStyle} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Start Time</label>
          <input
            style={inputStyle}
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
          <span style={{ fontSize: '10px', color: '#52525b', marginTop: '4px', display: 'block' }}>
            Leave empty for immediate. Future times show a clock icon on the card.
          </span>
        </div>
        <div>
          <label style={labelStyle}>Notes to Clawd</label>
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Instructions for Clawd..." />
        </div>
      </div>
    </Modal>
  )
}
