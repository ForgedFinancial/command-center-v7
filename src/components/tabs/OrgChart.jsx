import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY } from '../../config/constants'
import './OrgChart.css'

function NodeCard({ agent, size = 'normal' }) {
  const { actions } = useApp()
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
        <span className="org-node__dot" />
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
        {/* CEO */}
        <div className="org-level">
          <NodeCard agent={AGENT_HIERARCHY.ceo} />
        </div>

        <div className="org-connector-v" />

        {/* COO */}
        <div className="org-level">
          <NodeCard agent={AGENT_HIERARCHY.clawd} />
        </div>

        <div className="org-connector-v" />

        {/* Departments */}
        <div className="org-departments">
          {/* Build Crew */}
          <div className="glass-panel org-department">
            <div className="org-department__label">Build Crew</div>
            <div className="org-department__content">
              <SubAgentGroup parentId="architect" />
              <SubAgentGroup parentId="mason" />
              <SubAgentGroup parentId="sentinel" />
            </div>
          </div>

          {/* Operations */}
          <div className="glass-panel org-department">
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
