import { useEffect, useCallback } from 'react'
import { useTaskBoard } from '../context/TaskBoardContext'
import { useApp } from '../context/AppContext'
import { TABS } from '../config/constants'
import taskboardClient from '../api/taskboardClient'

export function useTaskBoardData() {
  const { state: appState, actions: appActions } = useApp()
  const { state, actions } = useTaskBoard()

  const fetchAll = useCallback(async () => {
    const validTabs = [TABS.TASK_BOARD, TABS.PROJECTS]
    if (!validTabs.includes(appState.activeTab)) return
    actions.setLoading(true)
    try {
      const [tasksRes, projectsRes, docsRes, canvasRes] = await Promise.all([
        taskboardClient.getTasks(),
        taskboardClient.getProjects(),
        taskboardClient.getDocuments(),
        taskboardClient.getCanvasObjects(),
      ])
      if (tasksRes.ok) actions.setTasks(tasksRes.data)
      if (projectsRes.ok) actions.setProjects(projectsRes.data)
      if (docsRes.ok) actions.setDocuments(docsRes.data)
      if (canvasRes.ok) actions.setCanvasObjects(canvasRes.data)
    } catch (err) {
      actions.setError(err.message)
      appActions.addToast({ type: 'error', message: `Task Board: ${err.message}` })
    } finally {
      actions.setLoading(false)
    }
  }, [appState.activeTab, actions, appActions])

  // Fetch on tab activation
  useEffect(() => {
    const validTabs = [TABS.TASK_BOARD, TABS.PROJECTS]
    if (validTabs.includes(appState.activeTab) && !state.lastFetch) {
      fetchAll()
    }
  }, [appState.activeTab, state.lastFetch, fetchAll])

  return { fetchAll }
}
