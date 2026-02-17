import { useEffect } from 'react'
import { useCRM } from '../../../context/CRMContext'
import { useApp } from '../../../context/AppContext'
import { CRM_VIEWS } from '../../../config/crm'
import { TABS } from '../../../config/constants'
import crmClient from '../../../api/crmClient'
import CRMLoginForm from './CRMLoginForm'
import CRMDashboard from './dashboard/CRMDashboard'
import PipelineView from './pipeline/PipelineView'
import ContactsView from './contacts/ContactsView'
import CRMSettings from './settings/CRMSettings'
import FollowUpQueue from './contacts/FollowUpQueue'
import PhoneView from '../task-board/phone/PhoneView'
import MessagesView from '../task-board/messages/MessagesView'
import EmptyState from '../../shared/EmptyState'
import LoadingSpinner from '../../shared/LoadingSpinner'

export default function CRMTab() {
  const { state, actions } = useCRM()
  const { state: appState } = useApp()

  // Fetch CRM data on mount (no separate login — user already authenticated via CC v7)
  useEffect(() => {
    if (appState.activeTab !== TABS.CRM) return
    const init = async () => {
      try {
        const leadsRes = await crmClient.getLeads()
        if (Array.isArray(leadsRes)) {
          actions.setLeads(leadsRes)
        } else if (leadsRes.data) {
          actions.setLeads(leadsRes.data)
        }
      } catch (err) {
        console.warn('CRM data fetch failed:', err.message)
      } finally {
        actions.setAuthLoading(false)
      }
    }
    init()
  }, [appState.activeTab])

  if (state.authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <LoadingSpinner />
      </div>
    )
  }

  switch (state.activeView) {
    case CRM_VIEWS.DASHBOARD:
    case 'dashboard':
      return <CRMDashboard />
    case CRM_VIEWS.PIPELINE:
    case 'pipeline':
      return <PipelineView />
    case CRM_VIEWS.CONTACTS:
    case 'contacts':
      return <ContactsView />
    case CRM_VIEWS.FOLLOW_UP:
    case 'follow-up':
      return <FollowUpQueue />
    case CRM_VIEWS.SETTINGS:
    case 'settings':
      return <CRMSettings />
    case 'phone':
      return <PhoneView />
    case 'messages':
      return <MessagesView />
    case CRM_VIEWS.CALENDAR:
    case 'calendar':
      return <EmptyState icon="📅" title="Calendar" message="Calendar view coming in Phase 5" />
    default:
      return <CRMDashboard />
  }
}
