import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OPS_AGENT_CONFIG, OPS_PRIORITIES } from '../../../../config/opsBoard'
import ClassificationBadge from '../shared/ClassificationBadge'
import ProgressBar from '../shared/ProgressBar'

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  const agent = OPS_AGENT_CONFIG[task.assignedAgent] || { label: task.assignedAgent || 'Unassigned', color: '#71717a' }
  const priority = OPS_PRIORITIES.find(item => item.id === task.priority) || OPS_PRIORITIES[1]

  return (
    <article
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: 'pointer',
      }}
      onClick={() => onOpen?.(task.id)}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, color: 'var(--theme-text-primary)' }}>{task.title}</h4>
        <ClassificationBadge classification={task.classification} />
      </div>

      <p style={{ margin: 0, fontSize: '11px', color: 'var(--theme-text-secondary)', lineHeight: 1.5 }}>
        {task.description ? `${task.description.slice(0, 120)}${task.description.length > 120 ? '…' : ''}` : 'No description'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <ProgressBar percentage={task.progress?.percentage || 0} color={priority.color} />
        <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>
          {task.progress?.currentStep || 'Pending'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: agent.color, fontWeight: 600 }}>{agent.label}</span>
        <span style={{ fontSize: '10px', color: priority.color, fontWeight: 700, textTransform: 'uppercase' }}>
          {priority.label}
        </span>
      </div>
    </article>
  )
}

