import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

export default function PipelineColumn({ stage, config, tasks = [], onOpenTask }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })

  return (
    <section
      ref={setNodeRef}
      style={{
        minWidth: '250px',
        width: '250px',
        borderRadius: '12px',
        border: `1px solid ${isOver ? config.color : 'rgba(255,255,255,0.08)'}`,
        backgroundColor: 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 240px)',
      }}
    >
      <header
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <strong style={{ color: config.color, fontSize: '12px', letterSpacing: '0.04em' }}>{config.label}</strong>
          <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>{config.description}</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>{tasks.length}</span>
      </header>

      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
          {tasks.length === 0 && (
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', padding: '12px 8px' }}>
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
