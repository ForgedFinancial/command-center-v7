// ========================================
// OrgChart — Top-Down Tree Layout (Redesign)
// Replaces radial layout with hierarchical tree
// Added: 2026-02-16 by Mason (FF-BLD-001)
// ========================================

import { useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { useAgentPoll } from '../../hooks/useAgentPoll'
import { usePipelinePoll } from '../../hooks/usePipelinePoll'
import { TABS } from '../../config/constants'
import { WORKSPACE_STRUCTURE } from '../../config/workspace'
import PipelineBanner from './org-chart/PipelineBanner'
import ColorLegend from './org-chart/ColorLegend'
import TreeLayout from './org-chart/TreeLayout'
import OutputPanel from './org-chart/OutputPanel'

export default function OrgChart() {
  const { state, actions } = useApp()

  useAgentPoll()
  usePipelinePoll()

  const agents = state.agents || {}
  const pipelineState = state.pipelineState || {}
  const selectedAgent = state.selectedAgent

  const handleSelect = useCallback((id) => {
    actions.setSelectedAgent(id)
  }, [actions])

  const handleClose = useCallback(() => {
    actions.setSelectedAgent(null)
  }, [actions])

  const handleRecentOutput = useCallback((id) => {
    actions.setSelectedAgent(id)
  }, [actions])

  const handleViewWorkspace = useCallback((id) => {
    const selected = WORKSPACE_STRUCTURE[id] ? id : 'clawd'
    actions.setWorkspaceAgent(selected)
    actions.setTab(TABS.WORKSPACES)
  }, [actions])

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <PipelineBanner pipelineState={pipelineState} />
      <ColorLegend />
      <TreeLayout
        agents={agents}
        activeConnections={pipelineState?.activeConnections || []}
        onSelectAgent={handleSelect}
        selectedAgent={selectedAgent}
        onRecentOutput={handleRecentOutput}
        onViewWorkspace={handleViewWorkspace}
      />
      {selectedAgent && (
        <OutputPanel
          agentId={selectedAgent}
          agentData={agents?.[selectedAgent]}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
