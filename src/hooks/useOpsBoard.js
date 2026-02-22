import { useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useOpsBoard } from '../context/OpsBoardContext'
import { TABS } from '../config/constants'
import { isValidStageTransition } from '../config/opsBoard'
import opsBoardClient from '../api/opsBoardClient'

export function useOpsBoardData() {
  const { state: appState, actions: appActions } = useApp()
  const { state, dispatch } = useOpsBoard()

  const fetchTasks = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const response = await opsBoardClient.getTasks(state.filters)
      dispatch({ type: 'FETCH_TASKS_SUCCESS', payload: response.tasks || [] })
    } catch (err) {
      dispatch({ type: 'FETCH_TASKS_ERROR', payload: err.message })
      appActions.addToast({ type: 'error', message: `Ops Board: ${err.message}` })
    }
  }, [state.filters, dispatch, appActions])

  const createTask = useCallback(async (payload) => {
    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      const response = await opsBoardClient.createTask(payload)
      dispatch({ type: 'UPSERT_TASK', payload: response.task })
      dispatch({ type: 'CLOSE_CREATE_MODAL' })
      appActions.addToast({ type: 'success', message: `Created ${response.task.id}` })
      return response.task
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Create failed: ${err.message}` })
      throw err
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [dispatch, appActions])

  const updateTask = useCallback(async (taskId, patch) => {
    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      const response = await opsBoardClient.updateTask(taskId, patch)
      dispatch({ type: 'UPSERT_TASK', payload: response.task })
      return response.task
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Update failed: ${err.message}` })
      throw err
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [dispatch, appActions])

  const archiveTask = useCallback(async (taskId) => {
    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      await opsBoardClient.archiveTask(taskId)
      dispatch({ type: 'REMOVE_TASK', payload: taskId })
      appActions.addToast({ type: 'success', message: `Archived ${taskId}` })
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Archive failed: ${err.message}` })
      throw err
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [dispatch, appActions])

  const moveTaskStage = useCallback(async (taskId, targetStage) => {
    const task = state.tasks.find(entry => entry.id === taskId)
    if (!task) return null

    if (!isValidStageTransition(task.stage, targetStage)) {
      appActions.addToast({ type: 'error', message: `Invalid transition: ${task.stage} -> ${targetStage}` })
      return null
    }

    const previous = task
    dispatch({
      type: 'UPSERT_TASK',
      payload: {
        ...task,
        stage: targetStage,
        updatedAt: new Date().toISOString(),
      },
    })

    try {
      const response = await opsBoardClient.moveTaskStage(taskId, targetStage)
      dispatch({ type: 'UPSERT_TASK', payload: response.task })
      return response.task
    } catch (err) {
      dispatch({ type: 'UPSERT_TASK', payload: previous })
      appActions.addToast({ type: 'error', message: `Stage move failed: ${err.message}` })
      throw err
    }
  }, [state.tasks, dispatch, appActions])

  const loadManifest = useCallback(async (taskId) => {
    try {
      const response = await opsBoardClient.getManifest(taskId)
      dispatch({
        type: 'SET_MANIFEST_CONTENT',
        payload: { taskId, content: response.content || '' },
      })
      return response.content || ''
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Manifest load failed: ${err.message}` })
      throw err
    }
  }, [dispatch, appActions])

  const saveManifestSection = useCallback(async (taskId, section, content) => {
    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      const response = await opsBoardClient.updateManifestSection(taskId, section, content)
      dispatch({ type: 'UPSERT_TASK', payload: response.task })
      const refreshed = await opsBoardClient.getManifest(taskId)
      dispatch({
        type: 'SET_MANIFEST_CONTENT',
        payload: { taskId, content: refreshed.content || '' },
      })
      appActions.addToast({ type: 'success', message: `Saved ${section.toUpperCase()}` })
      return response.task
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Manifest save failed: ${err.message}` })
      throw err
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [dispatch, appActions])

  const validateTaskGates = useCallback(async (taskId) => {
    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      const response = await opsBoardClient.validateGates(taskId)
      if (response.task) dispatch({ type: 'UPSERT_TASK', payload: response.task })
      if (!response.allPassed) {
        appActions.addToast({ type: 'warning', message: `Gate validation failed for ${taskId}` })
      } else {
        appActions.addToast({ type: 'success', message: `All gates passed for ${taskId}` })
      }
      return response
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Gate validation failed: ${err.message}` })
      throw err
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [dispatch, appActions])

  const getGateStatus = useCallback(async (taskId) => {
    try {
      return await opsBoardClient.getGateStatus(taskId)
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Gate status failed: ${err.message}` })
      throw err
    }
  }, [appActions])

  const setTaskGate = useCallback(async (taskId, gateName, passed, reason = '') => {
    dispatch({ type: 'SET_SYNCING', payload: true })
    try {
      const response = await opsBoardClient.setGate(taskId, gateName, passed, reason)
      if (response.task) dispatch({ type: 'UPSERT_TASK', payload: response.task })
      appActions.addToast({ type: passed ? 'success' : 'warning', message: `${gateName}: ${passed ? 'passed' : 'failed'}` })
      return response
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Gate update failed: ${err.message}` })
      throw err
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false })
    }
  }, [dispatch, appActions])

  const createTaskCheckpoint = useCallback(async (taskId, messageCount = 0) => {
    try {
      const response = await opsBoardClient.createCheckpoint(taskId, messageCount)
      appActions.addToast({ type: 'success', message: `Checkpoint created for ${taskId}` })
      return response
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Checkpoint failed: ${err.message}` })
      throw err
    }
  }, [appActions])

  useEffect(() => {
    if (appState.activeTab !== TABS.OPS) return
    if (!state.initialized) {
      fetchTasks()
    }
  }, [appState.activeTab, state.initialized, fetchTasks])

  useEffect(() => {
    if (appState.activeTab !== TABS.OPS) return
    if (!state.initialized) return
    fetchTasks()
  }, [appState.activeTab, state.initialized, state.filters, fetchTasks])

  return {
    state,
    dispatch,
    actions: {
      fetchTasks,
      createTask,
      updateTask,
      archiveTask,
      moveTaskStage,
      loadManifest,
      saveManifestSection,
      validateTaskGates,
      getGateStatus,
      setTaskGate,
      createTaskCheckpoint,
    },
  }
}
