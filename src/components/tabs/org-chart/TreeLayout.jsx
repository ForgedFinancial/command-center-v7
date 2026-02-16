import { useEffect } from 'react'
import AgentCard from './AgentCard'
import ConnectorLine from './ConnectorLine'
import DeptColumn from './DeptColumn'
import { TIER_COLORS, DEPT_HEADS, SPECIALIST_MAP, KEYFRAMES } from './treeConstants'

export default function TreeLayout({ agents, activeConnections, onSelectAgent, selectedAgent, onRecentOutput, onViewWorkspace }) {
  // Inject keyframes
  useEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-org-chart-keyframes', '')
    style.textContent = KEYFRAMES
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [])

  const isConnectionActive = (key) => activeConnections?.includes(key)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'visible' }}>
      {/* Tier 1: CEO */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <AgentCard
          agentId="ceo"
          agentData={agents?.ceo}
          onSelect={onSelectAgent}
          onRecentOutput={onRecentOutput}
          onViewWorkspace={onViewWorkspace}
        />
      </div>

      <ConnectorLine
        fromColor={TIER_COLORS.ceo}
        toColor={TIER_COLORS.coo}
        isActive={isConnectionActive('ceo-clawd')}
        height={32}
      />

      {/* Tier 2: COO */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <AgentCard
          agentId="clawd"
          agentData={agents?.clawd}
          onSelect={onSelectAgent}
          onRecentOutput={onRecentOutput}
          onViewWorkspace={onViewWorkspace}
        />
      </div>

      <ConnectorLine
        fromColor={TIER_COLORS.coo}
        toColor={TIER_COLORS.department}
        isActive={isConnectionActive('clawd-architect') || isConnectionActive('clawd-mason') || isConnectionActive('clawd-sentinel')}
        height={32}
      />

      {/* Branch line */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
        <div style={{ flex: 1, height: '2px', background: 'rgba(168,85,247,0.25)' }} />
      </div>

      {/* Tier 3: Department Heads + Specialists */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: 0 }}>
        {DEPT_HEADS.map((headId) => (
          <DeptColumn
            key={headId}
            headId={headId}
            specialistIds={SPECIALIST_MAP[headId]}
            agents={agents}
            activeConnections={activeConnections}
            onSelect={onSelectAgent}
            onRecentOutput={onRecentOutput}
            onViewWorkspace={onViewWorkspace}
          />
        ))}
      </div>
    </div>
  )
}
