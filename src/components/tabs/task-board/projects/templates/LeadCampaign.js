export const LeadCampaign = {
  id: 'sprint-planning',
  name: 'Sprint Planning',
  industry: 'general',
  description: 'Plan, execute, and review sprint work with reusable structure.',
  objects: [
    { type: 'shape', x: 120, y: 460, data: { name: 'Sprint Goal', label: 'Sprint Goal' } },
    { type: 'task', x: 390, y: 460, data: { name: 'Backlog Grooming', assignee: 'Unassigned', status: 'todo' } },
    { type: 'task', x: 660, y: 460, data: { name: 'Sprint Kickoff', assignee: 'Unassigned', status: 'todo' } },
    { type: 'checklist', x: 930, y: 460, data: { name: 'Daily Standup', items: [{ text: 'Blockers reviewed', checked: false }, { text: 'Priorities set', checked: false }] } },
    { type: 'task', x: 1200, y: 460, data: { name: 'Review & Retro', assignee: 'Unassigned', status: 'todo' } },
  ],
}
