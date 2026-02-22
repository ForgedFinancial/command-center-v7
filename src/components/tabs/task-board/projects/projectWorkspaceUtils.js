export function getChildProjectIds(projectId, projects) {
  const ids = []
  const stack = [projectId]
  while (stack.length) {
    const current = stack.pop()
    projects.forEach((project) => {
      if (project.parentProjectId === current) {
        ids.push(project.id)
        stack.push(project.id)
      }
    })
  }
  return ids
}

export function getProjectFamilyIds(projectId, projects) {
  return [projectId, ...getChildProjectIds(projectId, projects)]
}

export function getProjectProgress(projectId, projects, tasks) {
  const familyIds = new Set(getProjectFamilyIds(projectId, projects))
  const familyTasks = tasks.filter(task => task.projectId && familyIds.has(task.projectId))
  if (!familyTasks.length) return 0
  const completed = familyTasks.filter(task => task.stage === 'completed').length
  return Math.round((completed / familyTasks.length) * 100)
}

export function getProjectProgressSummary(projectId, projects, tasks) {
  const familyIds = new Set(getProjectFamilyIds(projectId, projects))
  const familyTasks = tasks.filter(task => task.projectId && familyIds.has(task.projectId))
  const completed = familyTasks.filter(task => task.stage === 'completed').length
  return {
    total: familyTasks.length,
    completed,
    percent: familyTasks.length ? Math.round((completed / familyTasks.length) * 100) : 0,
  }
}

