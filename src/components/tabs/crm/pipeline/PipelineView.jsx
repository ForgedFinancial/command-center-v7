import { useMemo } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { CRM_STAGES } from '../../../../config/crm'
import EmptyState from '../../../shared/EmptyState'

const STAGE_ORDER = ['new_lead', 'contact', 'engaged', 'qualified', 'application', 'sold']

const STAGE_LABELS = {
  new_lead: 'New Leads',
  contact: 'Contacted',
  engaged: 'Qualified',
  qualified: 'Proposal',
  application: 'Negotiation',
  sold: 'Won',
}

const STAGE_COLORS = {
  new_lead: '#3b82f6',
  contact: '#a855f7',
  engaged: '#00d4ff',
  qualified: '#f59e0b',
  application: '#f97316',
  sold: '#4ade80',
}

export default function PipelineView() {
  const { state, actions } = useCRM()

  const columns = useMemo(() => {
    return STAGE_ORDER.map(stage => {
      const leads = state.leads.filter(l => l.stage === stage)
      const totalValue = leads.reduce((s, l) => s + (l.value || l.premium || 0), 0)
      return { stage, label: STAGE_LABELS[stage], color: STAGE_COLORS[stage], leads, totalValue }
    })
  }, [state.leads])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Pipeline</h2>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(0,212,255,0.3)',
            background: 'rgba(0,212,255,0.1)',
            color: '#00d4ff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New Lead
        </button>
      </div>

      {/* Kanban */}
      {state.leads.length === 0 ? (
        <EmptyState icon="🔀" title="No Leads Yet" message="Add leads to see your pipeline." />
      ) : (
        <div style={{
          display: 'flex',
          gap: '12px',
          flex: 1,
          overflowX: 'auto',
          paddingBottom: '12px',
        }}>
          {columns.map(col => (
            <div key={col.stage} style={{
              minWidth: '240px',
              maxWidth: '240px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Column header */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px 10px 0 0',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: `2px solid ${col.color}30`,
                marginBottom: '0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>{col.label}</span>
                  {col.leads.length > 0 && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: `${col.color}20`,
                      color: col.color,
                      fontWeight: 600,
                    }}>
                      {col.leads.length}
                    </span>
                  )}
                </div>
                {col.totalValue > 0 && (
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>
                    ${col.totalValue.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Cards */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                background: 'rgba(255,255,255,0.015)',
                borderRadius: '0 0 10px 10px',
              }}>
                {col.leads.map(lead => (
                  <div
                    key={lead.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = `${col.color}40` }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '4px' }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>
                      {lead.leadType || lead.carrier || ''}
                      {(lead.value || lead.premium) ? ` • $${(lead.value || lead.premium).toLocaleString()}` : ''}
                    </div>
                    {lead.lastContact && (
                      <div style={{ fontSize: '10px', color: '#52525b', marginTop: '4px' }}>
                        {timeAgo(lead.lastContact)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}
