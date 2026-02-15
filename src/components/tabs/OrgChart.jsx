// ========================================
// OrgChart — Radial Org Chart Tab (Complete Rewrite)
// Thin wrapper: RadialCanvas + DetailPanel + SummaryOverlay
// ========================================

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { useAgentPoll } from '../../hooks/useAgentPoll'
import RadialCanvas from './org-chart/RadialCanvas'
import DetailPanel from './org-chart/DetailPanel'
import SummaryOverlay from './org-chart/SummaryOverlay'
import { DETAIL_PANEL } from './org-chart/radialConstants'
import './OrgChart.css'

export default function OrgChart() {
  const { state, actions } = useApp()

  // Activate agent polling
  useAgentPoll()

  const agentData = state.agents || {}
  const centeredAgent = state.centeredAgent || 'ceo'
  const selectedAgent = state.selectedAgent

  // Responsive breakpoint
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isSidePanel = windowWidth >= 1200
  const isModal = windowWidth >= 768 && windowWidth < 1200
  const isMobile = windowWidth < 768

  const handleSelectAgent = useCallback((id) => {
    actions.setSelectedAgent(id)
  }, [actions])

  const handleCenterAgent = useCallback((id) => {
    actions.setCenteredAgent(id)
  }, [actions])

  const handleNavigate = useCallback((id) => {
    actions.setCenteredAgent(id)
    actions.setSelectedAgent(id)
  }, [actions])

  const handleCloseDetail = useCallback(() => {
    actions.setSelectedAgent(null)
  }, [actions])

  const showDetailPanel = selectedAgent != null

  return (
    <div style={{
      position: 'relative',
      height: 'calc(100vh - 140px)',
      width: '100%',
      overflow: 'hidden',
      display: 'flex',
    }}>
      {/* Canvas area */}
      <div style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        transition: 'margin-right 300ms ease',
        marginRight: showDetailPanel && isSidePanel ? `${DETAIL_PANEL.width}px` : 0,
      }}>
        <RadialCanvas
          centeredAgent={centeredAgent}
          agentData={agentData}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          onCenterAgent={handleCenterAgent}
          theme={state.theme}
          reducedMotion={reducedMotion}
        />

        {/* Summary overlay */}
        <SummaryOverlay
          agentData={agentData}
          systemHealth={state.systemHealth}
          isLight={(state.theme === 'offwhite' || state.theme === 'white')}
        />
      </div>

      {/* Detail Panel */}
      {showDetailPanel && (
        <>
          {/* Modal/mobile overlay backdrop */}
          {!isSidePanel && (
            <div
              onClick={handleCloseDetail}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 15,
              }}
            />
          )}
          <div style={{
            position: isSidePanel ? 'relative' : 'absolute',
            top: isMobile ? 0 : (isModal ? '10%' : 0),
            right: 0,
            bottom: isMobile ? 0 : (isModal ? '10%' : 0),
            width: isMobile ? '100%' : `${DETAIL_PANEL.width}px`,
            zIndex: 20,
          }}>
            <DetailPanel
              agentId={selectedAgent}
              agentData={agentData}
              onClose={handleCloseDetail}
              onNavigate={handleNavigate}
              isLight={(state.theme === 'offwhite' || state.theme === 'white')}
              theme={state.theme}
            />
          </div>
        </>
      )}
    </div>
  )
}
