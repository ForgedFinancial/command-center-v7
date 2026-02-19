import { useEffect } from 'react'
import { useCRM } from '../../../context/CRMContext'
import { useApp } from '../../../context/AppContext'
import { CRM_VIEWS } from '../../../config/crm'
import { TABS } from '../../../config/constants'
import crmClient from '../../../api/crmClient'
import DashboardView from './dashboard/DashboardView'
// Legacy: import CRMDashboard from './dashboard/CRMDashboard'
import PipelineView from './pipeline/PipelineView'
import ContactsView from './contacts/ContactsView'
import CRMSettings from './settings/CRMSettings'
import FollowUpQueue from './contacts/FollowUpQueue'
import PhoneView from '../task-board/phone/PhoneView'
import MessagesView from '../task-board/messages/MessagesView'
import CalendarView from '../task-board/calendar/CalendarView'
import AutomationView from './automation/AutomationView'
import EmptyState from '../../shared/EmptyState'

// Normalize snake_case API fields to camelCase for UI components
function normalizeLead(lead) {
  return {
    ...lead,
    leadType: lead.lead_type || lead.leadType || '',
    customFields: lead.custom_fields || lead.customFields || {},
    lastContact: lead.last_contact || lead.lastContact || null,
    nextFollowup: lead.next_followup || lead.nextFollowup || null,
    createdAt: lead.created_at || lead.createdAt || '',
    updatedAt: lead.updated_at || lead.updatedAt || '',
    faceAmount: lead.face_amount || lead.faceAmount || '',
    policyNumber: lead.policy_number || lead.policyNumber || '',
    draftDate: lead.draft_date || lead.draftDate || '',
    paymentMethod: lead.payment_method || lead.paymentMethod || '',
    beneficiaryRelation: lead.beneficiary_relation || lead.beneficiaryRelation || '',
    beneficiary2: lead.beneficiary2 || '',
    beneficiary2Relation: lead.beneficiary2_relation || lead.beneficiary2Relation || '',
    bankName: lead.bank_name || lead.bankName || '',
    healthHistory: lead.health_history || lead.healthHistory || '',
    hasLifeInsurance: lead.has_life_insurance || lead.hasLifeInsurance || '',
    favoriteHobby: lead.favorite_hobby || lead.favoriteHobby || '',
    adSource: lead.ad_source || lead.adSource || '',
    agentId: lead.agent_id || lead.agentId || '',
    // Pipeline fields
    pipeline_id: lead.pipeline_id || lead.pipelineId || null,
    pipelineId: lead.pipeline_id || lead.pipelineId || null,
    stage_id: lead.stage_id || lead.stageId || null,
    stageId: lead.stage_id || lead.stageId || null,
  }
}

export default function CRMTab() {
  const { state, actions } = useCRM()
  const { state: appState } = useApp()

  // Fetch CRM data via same-origin proxy (no login needed — proxy handles auth)
  useEffect(() => {
    if (appState.activeTab !== TABS.CRM) return
    let cancelled = false
    const init = async () => {
      try {
        const leadsRes = await crmClient.getLeads({ limit: 1000 })
        if (cancelled) return

        let rawLeads = []
        if (Array.isArray(leadsRes)) {
          rawLeads = leadsRes
        } else if (leadsRes.leads) {
          rawLeads = leadsRes.leads
        } else if (leadsRes.data) {
          rawLeads = leadsRes.data
        }

        actions.setLeads(rawLeads.map(normalizeLead))
        actions.setToken('proxy-authenticated')
      } catch (err) {
        console.error('CRM data fetch failed:', err)
      } finally {
        if (!cancelled) actions.setAuthLoading(false)
      }
    }
    init()

    // Smart polling: 15s on Pipeline view, 60s elsewhere (saves Cloudflare Worker requests)
    const getInterval = () => {
      const v = state.activeView
      return (v === 'pipeline' || v === CRM_VIEWS.PIPELINE) ? 15000 : 60000
    }
    let pollTimer = null
    const pollLeads = async () => {
      if (cancelled) return
      try {
        const leadsRes = await crmClient.getLeads({ limit: 1000 })
        if (cancelled) return
        let rawLeads = []
        if (Array.isArray(leadsRes)) rawLeads = leadsRes
        else if (leadsRes.leads) rawLeads = leadsRes.leads
        else if (leadsRes.data) rawLeads = leadsRes.data
        actions.setLeads(rawLeads.map(normalizeLead))
      } catch { /* silent refresh failure */ }
      if (!cancelled) pollTimer = setTimeout(pollLeads, getInterval())
    }
    pollTimer = setTimeout(pollLeads, getInterval())

    return () => { cancelled = true; clearTimeout(pollTimer) }
  }, [appState.activeTab])

  switch (state.activeView) {
    case CRM_VIEWS.DASHBOARD:
    case 'dashboard':
      return <DashboardView />
    case CRM_VIEWS.PIPELINE:
    case 'pipeline':
      return <PipelineView />
    case CRM_VIEWS.CONTACTS:
    case 'contacts':
      return <ContactsView />
    case CRM_VIEWS.FOLLOW_UP:
    case 'follow-up':
      return <FollowUpQueue />
    case CRM_VIEWS.AUTOMATIONS:
    case 'automations':
      return <AutomationView />
    case CRM_VIEWS.SETTINGS:
    case 'settings':
      return <CRMSettings />
    case 'phone':
      return <PhoneView />
    case 'messages':
      return <MessagesView />
    case CRM_VIEWS.CALENDAR:
    case 'calendar':
      return <CalendarView />
    default:
      return <DashboardView />
  }
}
