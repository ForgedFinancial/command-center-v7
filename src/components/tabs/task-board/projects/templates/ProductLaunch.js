export const ProductLaunch = {
  id: 'product-launch',
  name: 'Product Launch',
  industry: 'general',
  description: 'Plan launch milestones from research to release.',
  objects: [
    { type: 'task', x: 120, y: 180, data: { name: 'Research', status: 'todo' } },
    { type: 'task', x: 380, y: 180, data: { name: 'Build', status: 'todo' } },
    { type: 'task', x: 640, y: 180, data: { name: 'QA', status: 'todo' } },
    { type: 'task', x: 900, y: 180, data: { name: 'Launch', status: 'todo' } },
  ],
}
