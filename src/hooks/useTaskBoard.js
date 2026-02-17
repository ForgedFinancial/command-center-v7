import { useEffect, useCallback } from 'react'
import { useTaskBoard } from '../context/TaskBoardContext'
import { useApp } from '../context/AppContext'
import { TABS } from '../config/constants'
import taskboardClient from '../api/taskboardClient'

export function useTaskBoardData() {
  const { state: appState, actions: appActions } = useApp()
  const { state, actions } = useTaskBoard()

  const fetchAll = useCallback(async () => {
    if (appState.activeTab !== TABS.TASK_BOARD) return
    actions.setLoading(true)
    try {
      const [tasksRes, projectsRes, docsRes] = await Promise.all([
        taskboardClient.getTasks(),
        taskboardClient.getProjects(),
        taskboardClient.getDocuments(),
      ])
      if (tasksRes.ok) actions.setTasks(tasksRes.data)
      if (projectsRes.ok) actions.setProjects(projectsRes.data)
      if (docsRes.ok) actions.setDocuments(docsRes.data)
    } catch (err) {
      actions.setError(err.message)
      appActions.addToast({ type: 'error', message: `Task Board: ${err.message}` })
    } finally {
      actions.setLoading(false)
    }
  }, [appState.activeTab, actions, appActions])

  // Fetch on tab activation
  useEffect(() => {
    if (appState.activeTab === TABS.TASK_BOARD && !state.lastFetch) {
      fetchAll()
    }
  }, [appState.activeTab, state.lastFetch, fetchAll])

  return { fetchAll }
}
