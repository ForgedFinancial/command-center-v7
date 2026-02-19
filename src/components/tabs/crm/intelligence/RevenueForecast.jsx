import { useMemo } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { CRM_STAGE_ORDER, CRM_STAGE_CONFIG } from '../../../../config/crm'

// Rough conversion rates by stage (industry defaults)
const STAGE_CONVERSION = {
  new_lead: 0.15,
  contact: 0.25,
  engaged: 0.35,
  qualified: 0.55,
  proposal: 0.75,
  sold: 1.0,
}

const AVG_AP = 850 // Average annual premium per policy

export default function RevenueForecast() {
  const { state } = useCRM()

  const forecast = useMemo(() => {
    const stageCounts = {}
    CRM_STAGE_ORDER.forEach(s => { stageCounts[s] = 0 })

    state.leads?.forEach(lead => {
      const stage = lead.stage || lead.stageId || lead.stage_id || 'new_lead'
      const key = CRM_STAGE_ORDER.includes(stage) ? stage : 'new_lead'
      stageCounts[key]++
    })

    let projectedPolicies = 0
    CRM_STAGE_ORDER.forEach(s => {
      projectedPolicies += stageCounts[s] * (STAGE_CONVERSION[s] || 0)
    })

    const projectedAP = projectedPolicies * AVG_AP
    const confidenceLow = projectedAP * 0.7
    const confidenceHigh = projectedAP * 1.3
    const totalLeads = state.leads?.length || 0

    return { stageCounts, projectedPolicies: Math.round(projectedPolicies), projectedAP, confidenceLow, confidenceHigh, totalLeads }
  }, [state.leads])

  const hasData = forecast.totalLeads > 0
  const months = [
    { label: 'This Month', multiplier: 0.35 },
    { label: 'Next Month', multiplier: 0.35 },
    { label: 'Month 3', multiplier: 0.30 },
  ]
  const maxBar = forecast.projectedAP * 0.4

  return (
    <div style={{
      background: 'var(--theme-surface)',
      borderRadius: '12px',
      border: '1px solid var(--theme-border)',
      padding: '20px',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--theme-text-primary)' }}>
        💰 Revenue Forecast
      </h3>

      {!hasData ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--theme-text-secondary)',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>Collecting data...</div>
          <div style={{ fontSize: '12px' }}>Revenue projections will appear once pipeline has leads.</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Projected AP', value: `$${Math.round(forecast.projectedAP).toLocaleString()}`, sub: `$${Math.round(forecast.confidenceLow).toLocaleString()} – $${Math.round(forecast.confidenceHigh).toLocaleString()}` },
              { label: 'Projected Policies', value: forecast.projectedPolicies, sub: `from ${forecast.totalLeads} leads` },
              { label: 'Avg Premium', value: `$${AVG_AP}`, sub: 'per policy' },
            ].map(c => (
              <div key={c.label} style={{
                background: 'var(--theme-bg)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>{c.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Monthly projection bars */}
          <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
            Quarterly Projection
          </div>
          {months.map(m => {
            const val = forecast.projectedAP * m.multiplier
            const pct = maxBar > 0 ? Math.min((val / maxBar) * 100, 100) : 0
            return (
              <div key={m.label} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--theme-text-secondary)' }}>{m.label}</span>
                  <span style={{ color: 'var(--theme-text-primary)', fontWeight: 500 }}>${Math.round(val).toLocaleString()}</span>
                </div>
                <div style={{ height: '20px', background: 'var(--theme-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #4ade80, #3b82f6)',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
