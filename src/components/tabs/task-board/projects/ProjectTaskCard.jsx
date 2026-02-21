import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PRIORITY_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'

export default function ProjectTaskCard({ task, isDragOverlay = false }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, disabled: isDragOverlay })

  const priorityConf = PRIORITY_CONFIG[task.priority] || {}

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '10px 12px',
    borderRadius: '8px',
    background: isDragging ? 'rgba(255,255,255,0.08)' : 'var(--theme-bg)',
    border: `1px solid ${isDragging ? 'var(--theme-accent)' : 'rgba(255,255,255,0.04)'}`,
    cursor: 'grab',
    opacity: isDragging && !isDragOverlay ? 0.4 : 1,
    fontSize: '12px',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '10px' }}>
        {task.priority && task.priority !== 'medium' && (
          <span style={{
            padding: '1px 6px', borderRadius: '3px', fontWeight: 600, textTransform: 'uppercase',
            color: priorityConf.color || '#71717a', background: priorityConf.bg || 'rgba(113,113,122,0.15)',
          }}>{task.priority}</span>
        )}
        {task.assignedAgent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: AGENT_COLORS?.[task.assignedAgent] || '#71717a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '7px', fontWeight: 700, color: '#fff',
            }}>{task.assignedAgent[0].toUpperCase()}</div>
          </div>
        )}
        {task.dueDate && (
          <span style={{ color: 'var(--theme-text-secondary)', marginLeft: 'auto' }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}
