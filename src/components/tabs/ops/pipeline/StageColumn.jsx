import TaskCard from './TaskCard'

export default function StageColumn({ config, tasks, onSelectTask }) {
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
    <>
      <style>{`
        .ops-stage-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.15) transparent;
        }
        .ops-stage-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .ops-stage-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.04);
          border-radius: 999px;
        }
        .ops-stage-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--theme-accent, #8b5cf6), rgba(139,92,246,0.65));
          border-radius: 999px;
        }
      `}</style>
      <div style={{
        height: 'calc(100vh - 200px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: isDone ? 'rgba(255,255,255,0.01)' : 'var(--theme-surface, rgba(255,255,255,0.02))',
        borderRadius: '10px',
        padding: '12px',
        border: `1px solid ${isDone ? 'rgba(255,255,255,0.04)' : 'var(--theme-border, rgba(255,255,255,0.06))'}`,
        minWidth: '180px',
        opacity: isDone ? 0.75 : 1,
      }}>
        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          backgroundColor: isDone ? 'rgba(10,10,15,0.95)' : 'var(--theme-surface, rgba(10,10,15,0.95))',
          paddingBottom: '8px', borderBottom: `2px solid ${config.color}`,
          marginBottom: '4px',
          flexShrink: 0,
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
        <div className="ops-stage-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onSelectTask(task)}
            />
          ))}
          {filteredTasks.length === 0 && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
              {isDone ? 'Completed tasks land here' : 'No tasks'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
