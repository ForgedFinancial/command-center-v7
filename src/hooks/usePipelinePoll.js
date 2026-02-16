import { useRef, useState, useCallback } from 'react'
import { useInterval } from './useInterval'
import { useApp } from '../context/AppContext'
import { TABS } from '../config/constants'
import syncClient from '../api/syncClient'

const BASE_INTERVAL = 15000
const MAX_INTERVAL = 300000

export function usePipelinePoll() {
  const { state, actions } = useApp()
  const isOrgChartActive = state.activeTab === TABS.ORG_CHART
  const failureCount = useRef(0)
  const [backoffInterval, setBackoffInterval] = useState(BASE_INTERVAL)
  const stopped = useRef(false)

  const poll = useCallback(async () => {
    if (stopped.current) return
    try {
      const data = await syncClient.getPipelineState()
      if (data) {
        actions.updatePipelineState(data)
      }
      failureCount.current = 0
      setBackoffInterval(BASE_INTERVAL)
    } catch (err) {
      failureCount.current++
      if (err?.status === 404) {
        stopped.current = true
        setBackoffInterval(null)
        return
      }
      setBackoffInterval(
        Math.min(BASE_INTERVAL * Math.pow(2, failureCount.current), MAX_INTERVAL)
      )
    }
  }, [actions])

  const effectiveInterval = isOrgChartActive && !stopped.current ? backoffInterval : null
  useInterval(poll, effectiveInterval)
}

export default usePipelinePoll
