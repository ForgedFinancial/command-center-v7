import { useMemo } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import EmptyState from '../../../shared/EmptyState'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProjectActivity({ project }) {
  const { state } = useTaskBoard()

  const events = useMemo(() => {
    const items = []

    // Project creation
    if (project.createdAt) {
      items.push({ type: 'project', icon: '🏗️', text: 'Project created', date: project.createdAt })
    }

    // Task stage changes
    const projectTasks = state.tasks.filter(t => t.projectId === project.id)
    for (const task of projectTasks) {
      if (task.stageHistory && task.stageHistory.length > 0) {
        for (const entry of task.stageHistory) {
          items.push({
            type: 'task',
            icon: entry.stage === 'completed' ? '✅' : '📋',
            text: `"${task.title}" moved to ${entry.stage.replace(/_/g, ' ')}`,
            date: entry.at,
            by: entry.by,
          })
        }
      } else if (task.createdAt) {
        items.push({ type: 'task', icon: '📋', text: `Task "${task.title}" created`, date: task.createdAt })
      }
    }

    // Document additions
    const projectDocs = state.documents.filter(d => d.projectId === project.id)
    for (const doc of projectDocs) {
      items.push({
        type: 'document',
        icon: '📎',
        text: `File "${doc.filename || doc.name || 'Untitled'}" added`,
        date: doc.uploadedAt || doc.createdAt,
        by: doc.uploadedBy,
      })
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    return items
  }, [project, state.tasks, state.documents])

  if (events.length === 0) {
    return <EmptyState icon="📜" title="No Activity" message="Activity will appear here as you work on this project." />
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      {events.map((event, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '4px', position: 'relative' }}>
          {/* Timeline line */}
          {i < events.length - 1 && (
            <div style={{
              position: 'absolute', left: '13px', top: '28px', bottom: '-4px',
              width: '1px', background: 'rgba(255,255,255,0.08)',
            }} />
          )}

          {/* Dot */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', flexShrink: 0, zIndex: 1,
          }}>{event.icon}</div>

          {/* Content */}
          <div style={{ flex: 1, paddingBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)', lineHeight: 1.5 }}>
              {event.text}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
              {timeAgo(event.date)}
              {event.by && ` • by ${event.by}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
