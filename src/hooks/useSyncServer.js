import { useEffect, useRef } from 'react'
import { useInterval } from './useInterval'
import { useApp } from '../context/AppContext'
import { syncClient } from '../api/syncClient'
import { POLL_INTERVAL_MS } from '../config/api'

/**
 * Hook that polls the server for state and health updates
 * Dispatches to AppContext on success, shows errors on failure
 */
export function useSyncServer() {
  const { state, actions } = useApp()
  const wasDisconnected = useRef(false)

  // Fetch state and health
  const sync = async () => {
    try {
      // Fetch state and health in parallel
      const [stateData, healthData] = await Promise.all([
        syncClient.getState(),
        syncClient.health(),
      ])

      // Update state with synced data
      actions.syncState({
        sessions: stateData.sessions || state.sessions,
        tokens: stateData.tokens || state.tokens,
        costs: stateData.costs || state.costs,
        cronJobs: stateData.cronJobs || state.cronJobs,
        activityLog: stateData.activityLog || state.activityLog,
        overnightLog: stateData.overnightLog || state.overnightLog,
        agents: stateData.agents || state.agents,
      })

      // Update build info from health
      if (healthData.buildHash || healthData.version) {
        actions.setBuildInfo({
          hash: healthData.buildHash || healthData.hash,
          version: healthData.version,
        })
      }

      // If we were disconnected, show reconnection toast
      if (wasDisconnected.current) {
        wasDisconnected.current = false
        actions.addToast({
          type: 'success',
          message: 'Connection restored',
        })
      }
    } catch (error) {
      console.error('Sync failed:', error)

      // Mark as disconnected
      actions.setConnected(false)
      actions.setSyncError(error.message)

      // Only show toast on first disconnect
      if (!wasDisconnected.current) {
        wasDisconnected.current = true
        actions.addToast({
          type: 'error',
          message: 'Connection lost. Retrying...',
        })
      }
    }
  }

  // Initial sync on mount
  useEffect(() => {
    sync()
  }, [])

  // Poll every 60 seconds
  useInterval(sync, POLL_INTERVAL_MS)
}

export default useSyncServer
