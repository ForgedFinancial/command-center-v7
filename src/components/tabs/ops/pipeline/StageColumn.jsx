import TaskCard from './TaskCard'
import { STAGES } from './pipelineConstants'

export default function StageColumn({ stage, config, tasks, onSelectTask, onMoveTask }) {
  const stageIdx = STAGES.indexOf(stage)
  const isDone = config.muted

  // DONE column: only show tasks from last 7 days
  const filteredTasks = isDone
    ? tasks.filter(t => {
        const ts = t.completedAt || t.stageEnteredAt
        if (!ts) return true
        return Date.now() - new Date(ts).getTime() < 7 * 24 * 60 * 60 * 1000
      })
    : tasks

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      backgroundColor: isDone ? 'rgba(255,255,255,0.01)' : 'var(--theme-surface, rgba(255,255,255,0.02))',
      borderRadius: '10px', padding: '12px',
      border: `1px solid ${isDone ? 'rgba(255,255,255,0.04)' : 'var(--theme-border, rgba(255,255,255,0.06))'}`,
      minHeight: '200px', minWidth: '180px',
      opacity: isDone ? 0.75 : 1,
    }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: isDone ? 'rgba(10,10,15,0.95)' : 'var(--theme-surface, rgba(10,10,15,0.95))',
        paddingBottom: '8px', borderBottom: `2px solid ${config.color}`,
        marginBottom: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>{config.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: isDone ? 'var(--theme-text-secondary)' : 'var(--theme-text-primary)' }}>
              {config.label}
            </span>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: config.color,
            backgroundColor: config.color + '20', padding: '2px 8px',
            borderRadius: '999px', minWidth: '20px', textAlign: 'center',
          }}>
            {filteredTasks.length}
          </span>
        </div>
        {config.desc && (
          <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '4px', opacity: 0.7 }}>
            {config.desc}
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'auto' }}>
        {filteredTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            stageIdx={stageIdx}
            onClick={() => onSelectTask(task)}
            onMoveTask={onMoveTask}
          />
        ))}
        {filteredTasks.length === 0 && (
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
            {isDone ? 'Completed tasks land here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  )
}
