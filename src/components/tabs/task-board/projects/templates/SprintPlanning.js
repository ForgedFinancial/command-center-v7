export const SprintPlanning = {
  id: 'sprint-planning',
  name: 'Sprint Planning',
  industry: 'general',
  description: 'Scope sprint goals and backlog commitments.',
  objects: [
    { type: 'task', x: 120, y: 180, data: { name: 'Backlog Grooming', status: 'todo' } },
    { type: 'task', x: 420, y: 180, data: { name: 'Estimation', status: 'todo' } },
    { type: 'task', x: 720, y: 180, data: { name: 'Commit Sprint', status: 'todo' } },
    { type: 'task', x: 1020, y: 180, data: { name: 'Kickoff', status: 'todo' } },
  ],
}
