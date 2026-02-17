import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PRIORITY_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'
import { useTaskBoard } from '../../../../context/TaskBoardContext'

export default function TaskCard({ task }) {
  const { actions } = useTaskBoard()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : task.stage === 'completed' ? 0.7 : 1,
    padding: '14px 16px',
    borderRadius: '10px',
    background: isDragging ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)',
    border: isDragging ? '1px solid rgba(0,212,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
    cursor: 'grab',
    marginBottom: '6px',
  }

  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const agentColor = task.assignedAgent ? AGENT_COLORS[task.assignedAgent] : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => actions.setSelectedTask(task)}
    >
      {/* Title */}
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#e4e4e7', marginBottom: '8px', lineHeight: 1.4 }}>
        {task.title}
      </div>

      {/* Priority + Agent row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {priorityConfig && (
          <span style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '4px',
            textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px',
            background: priorityConfig.bg, color: priorityConfig.color,
          }}>
            {priorityConfig.label}
          </span>
        )}
        {task.assignedAgent && (
          <span style={{
            fontSize: '9px', padding: '2px 8px', borderRadius: '4px',
            background: `${agentColor}18`, color: agentColor,
            fontWeight: 500, textTransform: 'capitalize',
          }}>
            {task.assignedAgent}
          </span>
        )}
      </div>

      {/* Due date */}
      {task.dueDate && (
        <div style={{ fontSize: '10px', color: '#71717a', marginTop: '8px' }}>
          Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  )
}
