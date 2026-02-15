import { useMemo } from 'react'
import { AGENT_HIERARCHY } from '../../config/constants'

const DEPT_HEADS = new Set(['architect', 'mason', 'sentinel'])
const OPS_AGENTS = new Set(['atlas', 'ads', 'vanguard', 'postwatch', 'curator'])

function buildTree(agents) {
  const children = {}
  Object.values(agents).forEach(a => {
    const p = a.parent || '__root__'
    ;(children[p] = children[p] || []).push(a)
  })
  return children
}

function NodeCard({ agent, onClick }) {
  const isDeptHead = DEPT_HEADS.has(agent.id)
  const isOps = OPS_AGENTS.has(agent.id)
  const isSubAgent = agent.parent && !['ceo', 'clawd'].includes(agent.id) && !isDeptHead && !isOps

  const borderColor = agent.isHuman ? '#3b82f6' : isDeptHead ? '#d4a017' : '#22c55e'
  const opacity = isOps || isSubAgent ? 0.75 : 1
  const scale = isOps || isSubAgent ? 0.9 : 1

  return (
    <div
      onClick={() => { console.log(agent.id); onClick?.(agent.id) }}
      style={{
        background: 'var(--bg-secondary)',
        border: `2px solid ${borderColor}`,
        borderRadius: '10px',
        padding: scale < 1 ? '8px 12px' : '12px 16px',
        minWidth: scale < 1 ? '140px' : '160px',
        maxWidth: '200px',
        cursor: 'pointer',
        opacity,
        transform: `scale(${scale})`,
        transition: 'all 0.2s',
        textAlign: 'center',
      }}
    >
      <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: scale < 1 ? '13px' : '15px' }}>
        {agent.name}
      </div>
      <div style={{ color: borderColor, fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
        {agent.role}
      </div>
      {agent.designation && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '4px', fontFamily: 'monospace' }}>
          {agent.designation}
        </div>
      )}
      {agent.model && (
        <div style={{ color: 'var(--text-tertiary, var(--text-secondary))', fontSize: '9px', marginTop: '2px', opacity: 0.7 }}>
          {agent.model}
        </div>
      )}
    </div>
  )
}

function TreeNode({ agentId, childrenMap, onClick }) {
  const agent = AGENT_HIERARCHY[agentId]
  if (!agent) return null
  const kids = childrenMap[agentId] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
      <NodeCard agent={agent} onClick={onClick} />
      {kids.length > 0 && (
        <>
          <div style={{ width: '2px', height: '20px', background: 'var(--text-secondary)', opacity: 0.3 }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {kids.map(k => (
              <TreeNode key={k.id} agentId={k.id} childrenMap={childrenMap} onClick={onClick} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrgChart() {
  const childrenMap = useMemo(() => buildTree(AGENT_HIERARCHY), [])

  const handleClick = (id) => {
    console.log('Agent clicked:', id)
  }

  return (
    <div style={{
      padding: '24px',
      overflowX: 'auto',
      overflowY: 'auto',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <TreeNode agentId="ceo" childrenMap={childrenMap} onClick={handleClick} />
    </div>
  )
}
