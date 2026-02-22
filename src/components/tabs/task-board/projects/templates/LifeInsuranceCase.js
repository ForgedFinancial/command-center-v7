export const LifeInsuranceCase = {
  id: 'life-insurance-case',
  name: 'Agent Pipeline Board',
  industry: 'life-insurance',
  description: 'Lead to issued policy pipeline with owner + SLA checklists.',
  objects: [
    { type: 'note', x: 120, y: 120, data: { title: 'Lead Received', checklist: ['Required docs: Basic contact profile', 'Owner role: Agent', 'SLA hours: 4', 'Completion criteria: Contact made + discovery booked'] } },
    { type: 'note', x: 390, y: 120, data: { title: 'Application Submitted', checklist: ['Required docs: Application packet', 'Owner role: Case Manager', 'SLA hours: 24', 'Completion criteria: Carrier confirms receipt'] } },
    { type: 'note', x: 660, y: 120, data: { title: 'Underwriting', checklist: ['Required docs: APS/labs if needed', 'Owner role: Underwriting liaison', 'SLA hours: 72', 'Completion criteria: Decision returned'] } },
    { type: 'note', x: 930, y: 120, data: { title: 'Approved / Declined', checklist: ['Required docs: Carrier decision', 'Owner role: Agent', 'SLA hours: 12', 'Completion criteria: Client notified'] } },
    { type: 'note', x: 1200, y: 120, data: { title: 'Policy Issued', checklist: ['Required docs: Policy packet', 'Owner role: Case Manager', 'SLA hours: 24', 'Completion criteria: Policy in force'] } },
    { type: 'note', x: 1470, y: 120, data: { title: 'Delivery + Premium Collection', checklist: ['Required docs: Delivery receipt', 'Owner role: Agent', 'SLA hours: 24', 'Completion criteria: Premium drafted'] } },
  ],
}
