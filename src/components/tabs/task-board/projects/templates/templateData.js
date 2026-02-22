import { LifeInsuranceCase } from './LifeInsuranceCase'
import { AgentOnboarding } from './AgentOnboarding'
import { PolicyReviewMeeting } from './PolicyReviewMeeting'
import { LeadCampaign } from './LeadCampaign'

export const TEMPLATE_DATA = [
  LifeInsuranceCase,
  { ...LeadCampaign, name: 'Policy Tracker' },
  AgentOnboarding,
  PolicyReviewMeeting,
]
