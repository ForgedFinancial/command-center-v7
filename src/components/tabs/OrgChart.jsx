import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY, REGISTERED_AGENTS } from '../../config/constants'
import './OrgChart.css'

function getAgentStatus(agentId) {
  if (agentId === 'ceo') return 'online'
  if (REGISTERED_AGENTS.includes(agentId)) return 'online'
  return 'defined'
}

const DEPARTMENTS = [
  { key: 'build', name: 'Build Crew', accent: '#f59e0b', total: 10, online: 3, health: 92, activity: 'Architect planning overnight build' },
  { key: 'ops', name: 'Operations', accent: '#10b981', total: 5, online: 0, health: 78, activity: 'Atlas health check completed' },
  { key: 'leadership', name: 'Leadership', accent: '#3b82f6', total: 2, online: 2, health: 100, activity: 'Clawd delegated build plan' },
]

function StatusLegend() {
  const statuses = [
    { label: 'Online', cls: 'status-dot--online' },
    { label: 'Busy', cls: 'status-dot--busy' },
    { label: 'Offline', cls: 'status-dot--offline' },
    { label: 'Defined', cls: 'status-dot--defined' },
  ]
  return (
    <div className="org-legend">
      {statuses.map(s => (
        <div key={s.label} className="org-legend__item">
          <span className={`org-legend__dot ${s.cls}`} />
          {s.label}
        </div>
      ))}
    </div>
  )
}

function DepartmentHealthCards() {
  const scrollTo = (key) => {
    const el = document.querySelector(`[data-dept="${key}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  return (
    <div className="dept-health-row">
      {DEPARTMENTS.map(d => (
        <div
          key={d.key}
          className="glass-card dept-health-card"
          style={{ borderTop: `3px solid ${d.accent}` }}
          onClick={() => scrollTo(d.key)}
        >
          <div className="dept-health-card__header">
            <span className="dept-health-card__name">{d.name}</span>
            <span className="dept-health-card__count" style={{ color: d.accent }}>{d.online}/{d.total}</span>
          </div>
          <div className="dept-health-card__bar-bg">
            <div className="dept-health-card__bar-fill" style={{ width: `${d.health}%`, background: d.accent }} />
          </div>
          <div className="dept-health-card__activity">{d.activity}</div>
        </div>
      ))}
    </div>
  )
}

function NodeCard({ agent, size = 'normal' }) {
  const { actions } = useApp()
  const status = getAgentStatus(agent.id)
  const borderColor = agent.isHuman
    ? '#3b82f6'
    : ['architect', 'mason', 'sentinel'].includes(agent.id)
    ? '#f59e0b'
    : ['clawd', 'ceo'].includes(agent.id)
    ? '#3b82f6'
    : '#10b981'

  return (
    <div
      className={`glass-card org-node ${size === 'small' ? 'org-node--small' : ''}`}
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => actions.setSelectedAgent(agent.id)}
    >
      <div className="org-node__header">
        <span className={`org-node__dot status-dot--${status}`} />
        <span className="org-node__name">{agent.name}</span>
      </div>
      <div className="org-node__role" style={{ color: borderColor }}>{agent.role}</div>
      {agent.designation && <div className="org-node__meta">{agent.designation}</div>}
      {agent.model && <div className="org-node__model">{agent.model}</div>}
    </div>
  )
}

function SubAgentGroup({ parentId }) {
  const parent = AGENT_HIERARCHY[parentId]
  const children = Object.values(AGENT_HIERARCHY).filter(a => a.parent === parentId)
  if (!parent) return null

  return (
    <div className="org-branch">
      <NodeCard agent={parent} />
      {children.length > 0 && (
        <>
          <div className="org-connector-v" />
          <div className="org-children">
            {children.map(c => (
              <NodeCard key={c.id} agent={c} size="small" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrgChart() {
  const opsAgents = ['atlas', 'ads', 'vanguard', 'postwatch', 'curator']

  return (
    <div className="org-chart-scroll">
      <div className="org-chart">
        <StatusLegend />
        <DepartmentHealthCards />

        {/* Leadership */}
        <div className="org-level" data-dept="leadership">
          <NodeCard agent={AGENT_HIERARCHY.ceo} />
        </div>

        <div className="org-connector-v" />

        <div className="org-level">
          <NodeCard agent={AGENT_HIERARCHY.clawd} />
        </div>

        <div className="org-connector-v" />

        {/* Departments */}
        <div className="org-departments">
          {/* Build Crew */}
          <div className="glass-panel org-department" data-dept="build">
            <div className="org-department__label">Build Crew</div>
            <div className="org-department__content">
              <SubAgentGroup parentId="architect" />
              <SubAgentGroup parentId="mason" />
              <SubAgentGroup parentId="sentinel" />
            </div>
          </div>

          {/* Operations */}
          <div className="glass-panel org-department" data-dept="ops">
            <div className="org-department__label">Operations</div>
            <div className="org-department__content org-department__content--ops">
              {opsAgents.map(id => (
                <NodeCard key={id} agent={AGENT_HIERARCHY[id]} size="small" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
