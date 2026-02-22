export const LifeInsuranceCase = {
  id: 'product-launch',
  name: 'Product Launch',
  industry: 'general',
  description: 'Generic launch planning flow from goals to retrospective.',
  objects: [
    { type: 'note', x: 120, y: 120, data: { name: 'Goals', checklist: ['Define objective', 'Set audience', 'Set success metric'] } },
    { type: 'task', x: 390, y: 120, data: { name: 'Prepare Assets', assignee: 'Unassigned', status: 'todo' } },
    { type: 'task', x: 660, y: 120, data: { name: 'Launch', assignee: 'Unassigned', status: 'todo' } },
    { type: 'checklist', x: 930, y: 120, data: { name: 'Measure', items: [{ text: 'Collect feedback', checked: false }, { text: 'Track KPI', checked: false }] } },
    { type: 'task', x: 1200, y: 120, data: { name: 'Iterate', assignee: 'Unassigned', status: 'todo' } },
  ],
}
