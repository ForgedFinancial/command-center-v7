import { useTaskBoard } from '../../../../context/TaskBoardContext'
import taskboardClient from '../../../../api/taskboardClient'
import { useApp } from '../../../../context/AppContext'

export default function SuggestionCard({ task }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()

  const handleApprove = async (e) => {
    e.stopPropagation()
    try {
      const res = await taskboardClient.approveSuggestion(task.id)
      if (res.ok) {
        actions.updateTask(res.data)
        appActions.addToast({ type: 'success', message: `Approved: ${task.name || task.title}` })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message })
    }
  }

  const handleDismiss = async (e) => {
    e.stopPropagation()
    try {
      await taskboardClient.dismissSuggestion(task.id)
      actions.removeTask(task.id)
      appActions.addToast({ type: 'info', message: `Dismissed: ${task.name || task.title}` })
    } catch (err) {
      appActions.addToast({ type: 'error', message: err.message })
    }
  }

  return (
    <div
      onClick={() => actions.setSelectedTask(task)}
      style={{
        padding: '14px 16px',
        borderRadius: '10px',
        background: 'rgba(139,92,246,0.04)',
        border: '1px solid rgba(139,92,246,0.15)',
        marginBottom: '6px',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#c4b5fd', marginBottom: '6px', lineHeight: 1.4 }}>
        {task.name || task.title}
      </div>
      {task.suggestReason && (
        <div style={{ fontSize: '10px', color: '#a78bfa', marginBottom: '10px', lineHeight: 1.4 }}>
          {task.suggestReason}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={handleApprove}
          style={{
            flex: 1, padding: '5px', fontSize: '10px', borderRadius: '6px',
            border: '1px solid var(--theme-success)', background: 'var(--theme-accent-muted)',
            color: 'var(--theme-success)', cursor: 'pointer', fontWeight: 500,
          }}
        >
          ✓ Approve
        </button>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1, padding: '5px', fontSize: '10px', borderRadius: '6px',
            border: '1px solid var(--theme-border)', background: 'var(--theme-surface)',
            color: 'var(--theme-text-secondary)', cursor: 'pointer', fontWeight: 500,
          }}
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  )
}
