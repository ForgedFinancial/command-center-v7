import { useCRM } from '../../../context/CRMContext'
import { CRM_VIEWS } from '../../../config/crm'
import EmptyState from '../../shared/EmptyState'

export default function CRMTab() {
  const { state } = useCRM()

  switch (state.activeView) {
    case CRM_VIEWS.DASHBOARD:
      return <EmptyState icon="📊" title="CRM Dashboard" message="Dashboard coming in Phase 5" />
    case CRM_VIEWS.PIPELINE:
      return <EmptyState icon="🔀" title="Pipeline" message="Pipeline coming in Phase 4" />
    case CRM_VIEWS.CONTACTS:
      return <EmptyState icon="👥" title="Contacts" message="Contacts coming in Phase 4" />
    case CRM_VIEWS.CALENDAR:
      return <EmptyState icon="📅" title="Calendar" message="Calendar coming in Phase 5" />
    case CRM_VIEWS.SETTINGS:
      return <EmptyState icon="⚙️" title="Settings" message="Settings coming in Phase 5" />
    default:
      return null
  }
}
