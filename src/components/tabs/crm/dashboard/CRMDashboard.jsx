import { useState, useMemo } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { CRM_STAGES, CRM_VIEWS } from '../../../../config/crm'
import EmptyState from '../../../shared/EmptyState'

const STAGE_COLORS = {
  new_lead: '#3b82f6',
  contact: '#a855f7',
  engaged: '#00d4ff',
  qualified: '#f59e0b',
  application: '#f97316',
  sold: '#4ade80',
}

const STAGE_LABELS = {
  new_lead: 'New Leads',
  contact: 'Contacted',
  engaged: 'Qualified',
  qualified: 'Proposal Sent',
  application: 'Negotiation',
  sold: 'Won',
}

export default function CRMDashboard() {
  const { state } = useCRM()
  const [timeRange, setTimeRange] = useState('all')
  const leads = state.leads

  const stats = useMemo(() => {
    const total = leads.length
    const totalValue = leads.reduce((sum, l) => sum + (l.value || l.premium || 0), 0)
    const soldLeads = leads.filter(l => l.stage === 'sold')
    const closeRate = total > 0 ? Math.round((soldLeads.length / total) * 100) : 0
    const avgDeal = soldLeads.length > 0
      ? Math.round(soldLeads.reduce((s, l) => s + (l.value || l.premium || 0), 0) / soldLeads.length)
      : 0

    const byStage = {}
    Object.keys(CRM_STAGES).forEach(key => {
      const stage = CRM_STAGES[key]
      byStage[stage] = leads.filter(l => l.stage === stage).length
    })

    return { total, totalValue, closeRate, avgDeal, byStage }
  }, [leads])

  const maxStageCount = Math.max(...Object.values(stats.byStage), 1)

  if (leads.length === 0) {
    return (
      <div>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>CRM Dashboard</h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#71717a' }}>Overview of your sales pipeline and key metrics</p>
        <EmptyState icon="📊" title="No Data Yet" message="Add leads to see your dashboard metrics." />
      </div>
    )
  }

  const kpis = [
    { label: 'TOTAL LEADS', value: stats.total.toString(), icon: '👥', trend: null, color: '#00d4ff' },
    { label: 'PIPELINE VALUE', value: formatCurrency(stats.totalValue), icon: '💰', trend: null, color: '#f59e0b' },
    { label: 'CLOSE RATE', value: `${stats.closeRate}%`, icon: '🎯', trend: null, color: '#4ade80' },
    { label: 'AVG DEAL SIZE', value: formatCurrency(stats.avgDeal), icon: '📊', trend: null, color: '#a855f7' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>CRM Dashboard</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>Overview of your sales pipeline and key metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[['7d', '7 Days'], ['30d', '30 Days'], ['90d', '90 Days'], ['all', 'All Time']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              style={{
                padding: '6px 12px', fontSize: '11px', fontWeight: timeRange === key ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid ' + (timeRange === key ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'),
                background: timeRange === key ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: timeRange === key ? '#00d4ff' : '#71717a',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '16px', right: '16px',
              fontSize: '20px', opacity: 0.6,
            }}>
              {kpi.icon}
            </div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#71717a', fontWeight: 600, marginBottom: '8px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#e4e4e7' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Follow-Up Queue Card */}
      <div
        onClick={() => actions.setView(CRM_VIEWS.FOLLOW_UP)}
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
          marginBottom: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>Follow-Up Queue</div>
            <div style={{ fontSize: '11px', color: '#71717a' }}>View contacts needing follow-up, sorted by priority</div>
          </div>
        </div>
        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>View →</span>
      </div>

      {/* Pipeline by Stage + Activity */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Stage chart */}
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#71717a',
            fontWeight: 600,
          }}>
            Pipeline by Stage
          </h3>
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {Object.entries(STAGE_LABELS).map(([stage, label]) => {
              const count = stats.byStage[stage] || 0
              const pct = (count / maxStageCount) * 100
              const color = STAGE_COLORS[stage] || '#71717a'
              return (
                <div key={stage} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{label}</span>
                    <span style={{ fontSize: '13px', color: '#71717a' }}>{count}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: '3px',
                      background: color,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#71717a',
            fontWeight: 600,
          }}>
            Recent Activity
          </h3>
          {state.activity.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#52525b' }}>No recent activity.</p>
          ) : (
            state.activity.slice(0, 5).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#00d4ff', marginTop: '5px', flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: '12px', color: '#e4e4e7' }}>{item.message}</div>
                  <div style={{ fontSize: '11px', color: '#52525b' }}>{item.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function formatCurrency(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}
