import { useState, useCallback } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'

export default function ProjectNotes({ project }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [notes, setNotes] = useState(project.notes || '')
  const [saving, setSaving] = useState(false)

  const handleBlur = useCallback(async () => {
    if (notes === (project.notes || '')) return
    setSaving(true)
    try {
      const res = await taskboardClient.updateProject(project.id, { notes })
      if (res.ok) {
        actions.updateProject({ id: project.id, notes })
        appActions.addToast({ type: 'success', message: 'Notes saved' })
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed to save notes: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }, [notes, project.id, project.notes, actions, appActions])

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#71717a',
          fontWeight: 600,
        }}>
          Project Notes
        </h4>
        {saving && <span style={{ fontSize: '11px', color: '#71717a' }}>Saving...</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes for this project..."
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: '#e4e4e7',
          fontSize: '13px',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(0,212,255,0.3)' }}
      />
    </div>
  )
}
