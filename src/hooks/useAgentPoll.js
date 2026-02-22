import { useRef, useState, useCallback } from 'react'
import { useInterval } from './useInterval'
import { useApp } from '../context/AppContext'
import { TABS } from '../config/constants'
import syncClient from '../api/syncClient'

const BASE_INTERVAL = 15000
const MAX_INTERVAL = 300000
const IDLE_THRESHOLD = 5

export function useAgentPoll() {
  const { state, actions } = useApp()
  const updateAgents = actions.updateAgents
  const isOrgChartActive = state.activeTab === TABS.ORG_CHART
  const failureCount = useRef(0)
  const [backoffInterval, setBackoffInterval] = useState(BASE_INTERVAL)
  const stopped = useRef(false)

  const pollAgents = useCallback(async () => {
    if (stopped.current) return

    try {
      const data = await syncClient.getAgentStatus()
      if (data?.agents) {
        updateAgents(data.agents)
      }
      // Success — reset
      failureCount.current = 0
      setBackoffInterval(BASE_INTERVAL)
    } catch (err) {
      failureCount.current++

      // 404 = endpoint doesn't exist — stop polling entirely
      if (err?.status === 404) {
        stopped.current = true
        setBackoffInterval(null)
        return
      }

      // Backoff
      if (failureCount.current >= IDLE_THRESHOLD) {
        setBackoffInterval(MAX_INTERVAL)
      } else {
        setBackoffInterval(
          Math.min(BASE_INTERVAL * Math.pow(2, failureCount.current), MAX_INTERVAL)
        )
      }
    }
  }, [updateAgents])

  // Only poll when org chart is active and not stopped
  const effectiveInterval = isOrgChartActive && !stopped.current ? backoffInterval : null
  useInterval(pollAgents, effectiveInterval)
}

export default useAgentPoll
