import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { STAGE_CONFIG, PRIORITY_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'
import EmptyState from '../../../shared/EmptyState'

export default function ProjectTaskList({ project }) {
  const { state, actions } = useTaskBoard()
  const projectTasks = state.tasks
    .filter(t => t.projectId === project.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (projectTasks.length === 0) {
    return <EmptyState icon="✅" title="No Tasks" message="No tasks are linked to this project yet." />
  }

  return (
    <div>
      {projectTasks.map(task => {
        const stageConf = STAGE_CONFIG[task.stage] || {}
        const priorityConf = PRIORITY_CONFIG[task.priority] || {}
        const isCompleted = task.stage === 'completed'

        return (
          <div
            key={task.id}
            onClick={() => actions.setSelectedTask(task)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--theme-bg)',
              border: '1px solid rgba(255,255,255,0.04)',
              marginBottom: '6px',
              cursor: 'pointer',
              opacity: isCompleted ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: stageConf.color || '#71717a',
              marginRight: '12px',
              flexShrink: 0,
            }} />
            <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
              {task.title}
            </span>
            <span style={{
              fontSize: '10px',
              color: stageConf.color || '#71717a',
              marginRight: '16px',
              minWidth: '70px',
            }}>
              {stageConf.label || task.stage}
            </span>
            {task.priority && (
              <span style={{
                fontSize: '9px',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: priorityConf.color || '#71717a',
                background: priorityConf.bg || 'rgba(113,113,122,0.15)',
                marginRight: '16px',
              }}>
                {task.priority}
              </span>
            )}
            {task.assignedAgent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '16px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: AGENT_COLORS[task.assignedAgent] || '#71717a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {task.assignedAgent[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', textTransform: 'capitalize' }}>
                  {task.assignedAgent}
                </span>
              </div>
            )}
            {task.dueDate && (
              <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
