export const AgentOnboarding = {
  id: 'agent-onboarding',
  name: 'Agent Onboarding',
  industry: 'life-insurance',
  description: 'Contracting to first issued policy journey.',
  objects: [
    { type: 'checklist', x: 140, y: 180, data: { title: 'Contracting Started', checklist: ['Required docs', 'Owner role', 'SLA hours', 'completion criteria'] } },
    { type: 'checklist', x: 430, y: 180, data: { title: 'Product Training' } },
    { type: 'checklist', x: 720, y: 180, data: { title: 'Compliance + Licensing' } },
    { type: 'checklist', x: 1010, y: 180, data: { title: 'First Application' } },
    { type: 'checklist', x: 1300, y: 180, data: { title: 'First Issued Policy' } },
    { type: 'checklist', x: 1590, y: 180, data: { title: 'Promoted to Active' } },
  ],
}
