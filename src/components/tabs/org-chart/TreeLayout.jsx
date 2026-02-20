import { useEffect } from 'react'
import AgentCard from './AgentCard'
import ConnectorLine from './ConnectorLine'
import DeptColumn from './DeptColumn'
import { TIER_COLORS, DEPT_HEADS, SPECIALIST_MAP, CLAWD_DIRECTS, KEYFRAMES } from './treeConstants'

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

      {/* Branch line — spans dept heads + direct reports */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '1200px' }}>
        <div style={{ flex: 1, height: '2px', background: 'rgba(168,85,247,0.25)' }} />
      </div>

      {/* Tier 3: Department Heads + Specialists | Kyle (Direct to Clawd) */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: 0, alignItems: 'flex-start' }}>
        {/* Department Heads with their specialists */}
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

        {/* Vertical separator */}
        <div style={{
          width: '1px',
          alignSelf: 'stretch',
          background: 'rgba(249,115,22,0.2)',
          margin: '0 8px',
        }} />

        {/* Clawd Direct Reports (Kyle etc.) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          {/* Section label */}
          <div style={{
            fontSize: '9px',
            color: 'rgba(249,115,22,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '4px',
            fontWeight: 600,
          }}>
            Direct Reports
          </div>
          {CLAWD_DIRECTS.map((agentId) => (
            <div key={agentId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Stub down from branch */}
              <div style={{ width: '2px', height: '2px', background: 'rgba(249,115,22,0.3)' }} />
              <AgentCard
                agentId={agentId}
                agentData={agents?.[agentId]}
                onSelect={onSelectAgent}
                onRecentOutput={onRecentOutput}
                onViewWorkspace={onViewWorkspace}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
