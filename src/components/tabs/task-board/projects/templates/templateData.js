import { LifeInsuranceCase } from './LifeInsuranceCase'
import { LeadCampaign } from './LeadCampaign'

const ContentCalendar = {
  id: 'content-calendar',
  name: 'Content Calendar',
  industry: 'general',
  description: 'Organize content pipeline from ideas to publishing.',
  objects: [
    { type: 'task', x: 140, y: 140, data: { name: 'Ideas', status: 'todo' } },
    { type: 'task', x: 400, y: 140, data: { name: 'Draft', status: 'todo' } },
    { type: 'task', x: 660, y: 140, data: { name: 'Review', status: 'todo' } },
    { type: 'task', x: 920, y: 140, data: { name: 'Publish', status: 'todo' } },
  ],
}

const Brainstorm = {
  id: 'brainstorm',
  name: 'Brainstorm',
  industry: 'general',
  description: 'Open-format board for collecting and clustering ideas.',
  objects: [
    { type: 'note', x: 140, y: 340, data: { name: 'Idea 1', text: 'Capture an idea' } },
    { type: 'note', x: 360, y: 320, data: { name: 'Idea 2', text: 'Capture an idea' } },
    { type: 'note', x: 580, y: 360, data: { name: 'Idea 3', text: 'Capture an idea' } },
  ],
}

export const TEMPLATE_DATA = [
  LifeInsuranceCase,
  LeadCampaign,
  ContentCalendar,
  Brainstorm,
]
