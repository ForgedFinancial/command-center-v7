import AgentCard from './AgentCard'
import ConnectorLine from './ConnectorLine'
import { TIER_COLORS } from './treeConstants'

export default function DeptColumn({ headId, specialistIds, agents, activeConnections, onSelect, onRecentOutput, onViewWorkspace }) {
  const connectionKey = `${headId}-specialists`
  const isActive = activeConnections?.includes(connectionKey)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Tiny stub from branch line */}
      <div style={{ width: '2px', height: '2px', background: 'rgba(168,85,247,0.25)' }} />
      <AgentCard
        agentId={headId}
        agentData={agents?.[headId]}
        onSelect={onSelect}
        onRecentOutput={onRecentOutput}
        onViewWorkspace={onViewWorkspace}
      />
      <ConnectorLine
        fromColor={TIER_COLORS.department}
        toColor={TIER_COLORS.specialist}
        isActive={isActive}
        height={24}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {specialistIds?.map((id) => (
          <AgentCard
            key={id}
            agentId={id}
            agentData={agents?.[id]}
            onSelect={onSelect}
            onRecentOutput={onRecentOutput}
            onViewWorkspace={onViewWorkspace}
          />
        ))}
      </div>
    </div>
  )
}
