import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { STAGE_CONFIG, AGENT_COLORS } from '../../../../config/taskboard'
import EmptyState from '../../../shared/EmptyState'

export default function ProjectOverview({ project }) {
  const { state, actions } = useTaskBoard()
  const projectTasks = state.tasks.filter(t => t.projectId === project.id)
  const completed = projectTasks.filter(t => t.stage === 'completed')
  const inProgress = projectTasks.filter(t => t.stage === 'in_progress')
  const agents = [...new Set(projectTasks.map(t => t.assignedAgent).filter(Boolean))]
  const progress = projectTasks.length > 0
    ? Math.round((completed.length / projectTasks.length) * 100)
    : 0

  const cardStyle = {
    padding: '20px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  }

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {/* Left: Stats + Recent Tasks */}
      <div style={{ flex: 1 }}>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#00d4ff' }}>{projectTasks.length}</div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>Total Tasks</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{inProgress.length}</div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>In Progress</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80' }}>{completed.length}</div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>Completed</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>{progress}%</div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>Progress</div>
          </div>
        </div>

        {/* Recent tasks */}
        <div>
          <h4 style={{
            margin: '0 0 12px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#71717a',
            fontWeight: 600,
          }}>
            Recent Tasks
          </h4>
          {projectTasks.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#52525b' }}>No tasks in this project yet.</p>
          ) : (
            projectTasks.slice(0, 5).map(task => {
              const stageConf = STAGE_CONFIG[task.stage] || {}
              return (
                <div
                  key={task.id}
                  onClick={() => actions.setSelectedTask(task)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: '6px',
                    cursor: 'pointer',
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
                    marginRight: '10px',
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontSize: '12px', color: task.stage === 'completed' ? '#71717a' : '#e4e4e7' }}>
                    {task.title}
                  </span>
                  {task.priority && task.priority !== 'low' && (
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: task.priority === 'high' ? '#ef4444' : '#f59e0b',
                      background: task.priority === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      marginRight: '8px',
                    }}>
                      {task.priority}
                    </span>
                  )}
                  {task.dueDate && (
                    <span style={{ fontSize: '11px', color: '#52525b' }}>
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Team + Timeline */}
      <div style={{ width: '280px', flexShrink: 0 }}>
        {/* Team */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            margin: '0 0 12px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#71717a',
            fontWeight: 600,
          }}>
            Team
          </h4>
          {agents.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#52525b' }}>No agents assigned yet.</p>
          ) : (
            agents.map(agent => (
              <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: AGENT_COLORS[agent] || '#71717a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {agent[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#e4e4e7', textTransform: 'capitalize' }}>{agent}</div>
                  <div style={{ fontSize: '10px', color: '#52525b' }}>
                    {agent === 'architect' ? 'Planner' : agent === 'mason' ? 'Builder' : agent === 'sentinel' ? 'Inspector' : 'Agent'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Timeline */}
        <div>
          <h4 style={{
            margin: '0 0 12px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#71717a',
            fontWeight: 600,
          }}>
            Timeline
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#71717a' }}>Started</span>
              <span style={{ color: '#e4e4e7' }}>
                {project.createdAt
                  ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#71717a' }}>Updated</span>
              <span style={{ color: '#e4e4e7' }}>
                {project.updatedAt
                  ? new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
