// ========================================
// HOOK: useAgentStatus
// Added: 2026-02-18 by Mason (FF-BLD-001)
// Polls /api/agents/status every 30s for real online/offline
// ========================================

import { useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { syncClient } from '../api/syncClient'

const POLL_INTERVAL = 30000 // 30s real-time status

export function useAgentStatus() {
  const { actions } = useApp()
  const updateAgents = actions.updateAgents
  const intervalRef = useRef(null)

  const fetch_ = useCallback(async () => {
    try {
      const data = await syncClient.getAgentStatus()
      if (data?.agents) {
        updateAgents(data.agents)
      }
    } catch {
      // fail silently — don't break the app
    }
  }, [updateAgents])

  useEffect(() => {
    fetch_()
    intervalRef.current = setInterval(fetch_, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetch_])
}
