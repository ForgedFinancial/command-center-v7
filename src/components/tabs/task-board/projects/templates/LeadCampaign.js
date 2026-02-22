export const LeadCampaign = {
  id: 'lead-campaign',
  name: 'Lead Campaign',
  industry: 'life-insurance',
  description: 'Audience-to-report lifecycle with measurable checkpoints.',
  objects: [
    { type: 'shape', x: 120, y: 460, data: { title: 'Target Audience Defined', label: 'Target Audience Defined' } },
    { type: 'task', x: 390, y: 460, data: { name: 'Creatives Built', assignee: 'Unassigned', status: 'todo' } },
    { type: 'task', x: 660, y: 460, data: { name: 'Launch', assignee: 'Unassigned', status: 'todo' } },
    { type: 'checklist', x: 930, y: 460, data: { title: 'Monitor', items: [{ text: 'Track CPL', checked: false }, { text: 'Track CTR', checked: false }] } },
    { type: 'task', x: 1200, y: 460, data: { name: 'Optimize', assignee: 'Unassigned', status: 'todo' } },
    { type: 'checklist', x: 1470, y: 460, data: { title: 'Close Out + Report', items: [{ text: 'Export report', checked: false }] } },
  ],
}
