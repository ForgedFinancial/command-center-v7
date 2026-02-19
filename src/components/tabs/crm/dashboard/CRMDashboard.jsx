import { useState, useMemo, useEffect } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { CRM_VIEWS } from '../../../../config/crm'
import crmClient from '../../../../api/crmClient'
import EmptyState from '../../../shared/EmptyState'

const PIPELINE_COLORS = [
  '#3b82f6', '#a855f7', '#00d4ff', '#f59e0b', '#f97316', '#4ade80', '#ec4899',
]

const PIPELINE_ICONS = {
  'Lead Management': '🎯',
  'Approval Process': '📋',
  'Policy Lifecycle': '📄',
  'Retention Exceptions': '⚠️',
  'Rewrite | Rejected': '🔄',
  'Active | Inforce': '✅',
  'Nurture | Long Term': '🌱',
}

export default function CRMDashboard() {
  const { state, actions } = useCRM()
  const [timeRange, setTimeRange] = useState('all')
  const [pipelines, setPipelines] = useState([])

  // Fetch pipelines for dashboard
  useEffect(() => {
    crmClient.getPipelines().then(res => {
      setPipelines(res.pipelines || res.data || [])
    }).catch(() => {})
  }, [])

  const leads = state.leads

  const stats = useMemo(() => {
    const total = leads.length
    const totalValue = leads.reduce((sum, l) => sum + (Number(l.value) || Number(l.premium) || 0), 0)
    const soldLeads = leads.filter(l => l.stage === 'sold')
    const closeRate = total > 0 ? Math.round((soldLeads.length / total) * 100) : 0
    const avgDeal = soldLeads.length > 0
      ? Math.round(soldLeads.reduce((s, l) => s + (Number(l.value) || Number(l.premium) || 0), 0) / soldLeads.length)
      : 0
    return { total, totalValue, closeRate, avgDeal }
  }, [leads])

  // Pipeline counts from actual leads
  const pipelineCounts = useMemo(() => {
    const counts = {}
    leads.forEach(l => {
      const pid = l.pipeline_id || l.pipelineId
      if (pid) counts[pid] = (counts[pid] || 0) + 1
    })
    return counts
  }, [leads])

  if (leads.length === 0 && pipelines.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>CRM Dashboard</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Overview of your sales pipeline and key metrics</p>
          </div>
        </div>
        <EmptyState icon="📊" title="No Data Yet" message="Add leads to see your dashboard metrics." />
      </div>
    )
  }

  const kpis = [
    { label: 'TOTAL LEADS', value: stats.total.toString(), icon: '👥', color: 'var(--theme-accent)' },
    { label: 'PIPELINE VALUE', value: formatCurrency(stats.totalValue), icon: '💰', color: 'var(--theme-phone)' },
    { label: 'CLOSE RATE', value: `${stats.closeRate}%`, icon: '🎯', color: 'var(--theme-success)' },
    { label: 'AVG DEAL SIZE', value: formatCurrency(stats.avgDeal), icon: '📊', color: '#a855f7' },
  ]

  const handlePipelineClick = (pipelineId) => {
    localStorage.setItem('cc7-current-pipeline', pipelineId)
    actions.setView(CRM_VIEWS.PIPELINE)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>CRM Dashboard</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Overview of your sales pipeline and key metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[['7d', '7 Days'], ['30d', '30 Days'], ['90d', '90 Days'], ['all', 'All Time']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              style={{
                padding: '6px 12px', fontSize: '11px', fontWeight: timeRange === key ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid ' + (timeRange === key ? 'var(--theme-accent)' : 'rgba(255,255,255,0.08)'),
                background: timeRange === key ? 'var(--theme-accent-muted)' : 'transparent',
                color: timeRange === key ? 'var(--theme-accent)' : '#71717a',
                cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{
            padding: '20px', borderRadius: '12px',
            background: 'var(--theme-surface)', border: '1px solid var(--theme-border-subtle)',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '20px', opacity: 0.6 }}>{kpi.icon}</div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--theme-text-secondary)', fontWeight: 600, marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Follow-Up Queue */}
      <div
        onClick={() => actions.setView(CRM_VIEWS.FOLLOW_UP)}
        style={{
          padding: '16px 20px', borderRadius: '12px',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          marginBottom: '24px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>Follow-Up Queue</div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>View contacts needing follow-up</div>
          </div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--theme-phone)', fontWeight: 500 }}>View →</span>
      </div>

      {/* Pipelines Overview */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--theme-text-secondary)', fontWeight: 600 }}>
            Pipelines
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {pipelines.map((p, idx) => {
              const count = pipelineCounts[p.id] || p.lead_count || 0
              const color = p.color || PIPELINE_COLORS[idx % PIPELINE_COLORS.length]
              const icon = p.icon || PIPELINE_ICONS[p.name] || '📁'
              return (
                <div
                  key={p.id}
                  onClick={() => handlePipelineClick(p.id)}
                  style={{
                    padding: '16px', borderRadius: '12px',
                    background: 'var(--theme-surface)', border: '1px solid var(--theme-border-subtle)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = `${color}60` }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--theme-border-subtle)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>{p.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color }}>{count}</span>
                    <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>leads</span>
                  </div>
                  <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', marginTop: '10px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: color, width: `${Math.min(100, (count / Math.max(stats.total, 1)) * 100)}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ width: '300px', flexShrink: 0 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--theme-text-secondary)', fontWeight: 600 }}>
            Recent Activity
          </h3>
          {state.activity.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>No recent activity.</p>
          ) : (
            state.activity.slice(0, 5).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--theme-accent)', marginTop: '5px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)' }}>{item.message}</div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>{item.time}</div>
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
