import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import ColumnHeader from './ColumnHeader'
import TaskCard from './TaskCard'
import SuggestionCard from './SuggestionCard'

export default function KanbanColumn({ stage, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: '260px',
        maxWidth: '260px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <ColumnHeader stage={stage} count={tasks.length} />
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px',
        borderRadius: '8px',
        background: isOver ? 'rgba(0,212,255,0.03)' : 'transparent',
        transition: 'background 0.15s',
      }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) =>
            stage === 'suggestions'
              ? <SuggestionCard key={task.id} task={task} />
              : <TaskCard key={task.id} task={task} />
          )}
        </SortableContext>
      </div>
    </div>
  )
}
