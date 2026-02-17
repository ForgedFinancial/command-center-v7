import { useState } from 'react'
import Modal from '../../../shared/Modal'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import { STAGE_CONFIG, PRIORITY_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'
import taskboardClient from '../../../../api/taskboardClient'

export default function TaskDetailModal() {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const task = state.selectedTask
  const [notes, setNotes] = useState(task?.notes || '')

  if (!task) return null

  const stageConfig = STAGE_CONFIG[task.stage]
  const priorityConfig = PRIORITY_CONFIG[task.priority]

  const handleClose = () => actions.setSelectedTask(null)

  const handleApprove = async () => {
    try {
      const res = await taskboardClient.approveTask(task.id)
      if (res.ok) {
        actions.updateTask(res.data)
        actions.setSelectedTask(null)
        appActions.addToast({ type: 'success', message: `Approved: ${task.title}` })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message })
    }
  }

  const handleDecline = async () => {
    try {
      const res = await taskboardClient.declineTask(task.id, notes)
      if (res.ok) {
        actions.updateTask(res.data)
        actions.setSelectedTask(null)
        appActions.addToast({ type: 'info', message: `Declined: ${task.title}` })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message })
    }
  }

  const handleSaveNotes = async () => {
    try {
      const res = await taskboardClient.updateTask(task.id, { notes })
      if (res.ok) actions.updateTask(res.data)
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message })
    }
  }

  const project = task.projectId ? state.projects.find(p => p.id === task.projectId) : null

  const footer = (
    <>
      <button
        onClick={handleClose}
        style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#a1a1aa', cursor: 'pointer' }}
      >
        Close
      </button>
      {task.stage === 'review' && (
        <>
          <button
            onClick={handleDecline}
            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 500 }}
          >
            Decline
          </button>
          <button
            onClick={handleApprove}
            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.1)', color: '#00d4ff', cursor: 'pointer', fontWeight: 500 }}
          >
            Approve
          </button>
        </>
      )}
    </>
  )

  return (
    <Modal isOpen={true} onClose={handleClose} title={task.title} width={640} footer={footer}>
      {/* Meta fields row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Stage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Stage</span>
          <span style={{ fontSize: '12px', color: stageConfig?.color, fontWeight: 500 }}>{stageConfig?.label}</span>
        </div>
        {/* Priority */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Priority</span>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
            background: priorityConfig?.bg, color: priorityConfig?.color,
            fontWeight: 600, textTransform: 'uppercase', alignSelf: 'flex-start',
          }}>
            {priorityConfig?.label}
          </span>
        </div>
        {/* Agent */}
        {task.assignedAgent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Agent</span>
            <span style={{ fontSize: '12px', color: AGENT_COLORS[task.assignedAgent], fontWeight: 500, textTransform: 'capitalize' }}>
              {task.assignedAgent}
            </span>
          </div>
        )}
        {/* Project */}
        {project && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Project</span>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{project.name}</span>
          </div>
        )}
        {/* Due Date */}
        {task.dueDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Due</span>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Description</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6 }}>{task.description}</p>
        </div>
      )}

      {/* Notes (editable) */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Notes to Clawd</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Add instructions for Clawd..."
          style={{
            width: '100%', minHeight: '80px', padding: '10px 12px', fontSize: '13px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', color: '#e4e4e7', resize: 'vertical', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Agent Output */}
      {task.agentOutput && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Agent Output</h4>
          <div style={{
            padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: '#a1a1aa',
            lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {task.agentOutput}
          </div>
        </div>
      )}

      {/* Completion Report */}
      {task.completionReport && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Completion Report</h4>
          <div style={{
            padding: '12px', borderRadius: '8px', background: 'rgba(74,222,128,0.04)',
            border: '1px solid rgba(74,222,128,0.15)', fontSize: '12px', color: '#a1a1aa', lineHeight: 1.6,
          }}>
            {Object.entries(task.completionReport).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '6px' }}>
                <span style={{ color: '#4ade80', fontWeight: 500, textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>{' '}
                {value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage History */}
      {task.stageHistory && task.stageHistory.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>History</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {task.stageHistory.map((entry, i) => (
              <div key={i} style={{ fontSize: '11px', color: '#71717a' }}>
                <span style={{ color: STAGE_CONFIG[entry.stage]?.color || '#a1a1aa' }}>
                  {STAGE_CONFIG[entry.stage]?.label || entry.stage}
                </span>
                {' — '}
                <span>{entry.by}</span>
                {' · '}
                <span>{new Date(entry.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
