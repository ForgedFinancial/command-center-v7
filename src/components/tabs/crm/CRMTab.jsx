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
import EmptyState from '../../shared/EmptyState'
import LoadingSpinner from '../../shared/LoadingSpinner'

export default function CRMTab() {
  const { state, actions } = useCRM()
  const { state: appState } = useApp()

  // Auth check on mount
  useEffect(() => {
    if (appState.activeTab !== TABS.CRM) return
    if (!state.token) {
      actions.setAuthLoading(false)
      return
    }
    // Verify token and fetch data
    const init = async () => {
      try {
        const user = await crmClient.getMe()
        actions.setUser(user)
        // Fetch leads
        const leadsRes = await crmClient.getLeads()
        if (Array.isArray(leadsRes)) {
          actions.setLeads(leadsRes)
        } else if (leadsRes.data) {
          actions.setLeads(leadsRes.data)
        }
      } catch (err) {
        // Token invalid
        actions.setToken(null)
      } finally {
        actions.setAuthLoading(false)
      }
    }
    init()
  }, [appState.activeTab, state.token])

  // Show login if no token
  if (!state.token && !state.authLoading) {
    return <CRMLoginForm />
  }

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
    case CRM_VIEWS.SETTINGS:
    case 'settings':
      return <CRMSettings />
    case CRM_VIEWS.CALENDAR:
    case 'calendar':
      return <EmptyState icon="📅" title="Calendar" message="Calendar view coming in Phase 5" />
    default:
      return <CRMDashboard />
  }
}
