import { useEffect, useRef, useState, useCallback } from 'react'
import { useInterval } from './useInterval'
import { useApp } from '../context/AppContext'
import { syncClient } from '../api/syncClient'

const BASE_INTERVAL = 60000      // 60s (was 15s — reduced to save Cloudflare requests)
const MAX_INTERVAL = 300000      // 5 min
const IDLE_INTERVAL = 300000     // 5 min
const IDLE_THRESHOLD = 5         // consecutive failures before idle

/**
 * Hook that polls the server for state and health updates
 * Exponential backoff on failure, idle mode after repeated failures
 */
export function useSyncServer() {
  const { state, actions } = useApp()
  const wasDisconnected = useRef(false)
  const failureCount = useRef(0)
  const initialLoadDone = useRef(false)
  const [interval, setInterval_] = useState(BASE_INTERVAL)

  const sync = useCallback(async () => {
    try {
      const [stateData, healthData] = await Promise.all([
        syncClient.getState(),
        syncClient.health(),
      ])

      // Success — reset backoff
      failureCount.current = 0
      setInterval_(BASE_INTERVAL)

      actions.syncState({
        sessions: stateData?.sessions || state.sessions,
        tokens: stateData?.tokens || state.tokens,
        costs: stateData?.costs || state.costs,
        cronJobs: stateData?.cronJobs || state.cronJobs,
        activityLog: stateData?.activityLog || state.activityLog,
        overnightLog: stateData?.overnightLog || state.overnightLog,
        agents: stateData?.agents || state.agents,
        systemHealth: {
          status: healthData?.status || 'unknown',
          uptime: healthData?.uptime || 0,
          lastHealthCheck: new Date().toISOString(),
          checks: healthData?.checks || {},
        },
      })

      if (healthData?.buildHash || healthData?.version) {
        actions.setBuildInfo({
          hash: healthData?.buildHash || healthData?.hash,
          version: healthData?.version,
        })
      }

      if (!initialLoadDone.current) {
        initialLoadDone.current = true
        actions.setInitialLoad(false)
      }

      if (wasDisconnected.current) {
        wasDisconnected.current = false
        actions.addToast({
          type: 'success',
          message: 'Connection restored',
        })
      }
    } catch (error) {
      failureCount.current++

      // Exponential backoff: double each failure, cap at MAX
      if (failureCount.current >= IDLE_THRESHOLD) {
        setInterval_(IDLE_INTERVAL)
      } else {
        const nextInterval = Math.min(
          BASE_INTERVAL * Math.pow(2, failureCount.current),
          MAX_INTERVAL
        )
        setInterval_(nextInterval)
      }

      // Determine error message based on type
      const is404 = error?.status === 404
      actions.setConnected(false)
      actions.setSyncError(is404 ? 'API Not Connected' : error?.message)

      if (!initialLoadDone.current) {
        initialLoadDone.current = true
        actions.setInitialLoad(false)
      }

      if (!wasDisconnected.current) {
        wasDisconnected.current = true
        actions.addToast({
          type: 'error',
          message: is404
            ? 'API Not Connected — endpoints not deployed'
            : error?.isNetwork || error?.isTimeout
              ? 'Connection lost. Retrying...'
              : `Sync error: ${error?.message || 'Unknown'}`,
        })
      }
    }
  }, [actions, state.sessions, state.tokens, state.costs, state.cronJobs, state.activityLog, state.overnightLog, state.agents])

  // Initial sync on mount
  useEffect(() => {
    sync()
  }, [])

  // Poll with dynamic interval
  useInterval(sync, interval)
}

export default useSyncServer
