import { useState, useMemo } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { CRM_STAGE_ORDER, CRM_STAGE_CONFIG } from '../../../../config/crm'

export default function FunnelDropOff() {
  const { state } = useCRM()
  const [drillStage, setDrillStage] = useState(null)

  const { stages, worstIdx, hasData } = useMemo(() => {
    const counts = {}
    CRM_STAGE_ORDER.forEach(s => { counts[s] = 0 })

    state.leads?.forEach(lead => {
      const stage = lead.stage || lead.stageId || lead.stage_id || 'new_lead'
      const key = CRM_STAGE_ORDER.includes(stage) ? stage : 'new_lead'
      counts[key]++
    })

    const total = state.leads?.length || 0
    const stageData = CRM_STAGE_ORDER.map((s, i) => {
      const count = counts[s]
      const prev = i === 0 ? total : counts[CRM_STAGE_ORDER[i - 1]]
      const dropOff = prev > 0 ? Math.round(((prev - count) / prev) * 100) : 0
      return { id: s, ...CRM_STAGE_CONFIG[s], count, dropOff }
    })

    let worst = -1, worstDrop = -1
    stageData.forEach((s, i) => {
      if (i > 0 && s.dropOff > worstDrop) { worstDrop = s.dropOff; worst = i }
    })

    return { stages: stageData, worstIdx: worst, hasData: total > 0 }
  }, [state.leads])

  const maxCount = Math.max(...stages.map(s => s.count), 1)

  // Drill-down: show leads in selected stage
  const drillLeads = useMemo(() => {
    if (!drillStage) return []
    return (state.leads || []).filter(l => {
      const s = l.stage || l.stageId || l.stage_id || 'new_lead'
      return s === drillStage
    }).slice(0, 20)
  }, [drillStage, state.leads])

  return (
    <div style={{
      background: 'var(--theme-surface)',
      borderRadius: '12px',
      border: '1px solid var(--theme-border)',
      padding: '20px',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--theme-text-primary)' }}>
        🔻 Funnel Drop-Off
      </h3>

      {!hasData ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--theme-text-secondary)',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔻</div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>Collecting data...</div>
          <div style={{ fontSize: '12px' }}>Funnel visualization will appear once pipeline has leads.</div>
        </div>
      ) : (
        <>
          {stages.map((s, i) => {
            const widthPct = Math.max((s.count / maxCount) * 100, 8)
            const isWorst = i === worstIdx
            const isSelected = drillStage === s.id
            return (
              <div key={s.id} style={{ marginBottom: '4px' }}>
                {/* Drop-off indicator between stages */}
                {i > 0 && (
                  <div style={{
                    fontSize: '10px',
                    color: isWorst ? '#ef4444' : 'var(--theme-text-secondary)',
                    fontWeight: isWorst ? 600 : 400,
                    textAlign: 'center',
                    padding: '2px 0',
                  }}>
                    ↓ {s.dropOff}% drop-off {isWorst && '⚠️ Bottleneck'}
                  </div>
                )}
                <div
                  onClick={() => setDrillStage(drillStage === s.id ? null : s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: isSelected ? `1px solid ${s.color}` : '1px solid transparent',
                    background: isSelected ? s.bg : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: '90px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: s.color,
                    flexShrink: 0,
                  }}>
                    {s.label}
                  </div>
                  <div style={{ flex: 1, height: '24px', background: 'var(--theme-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: s.color,
                      borderRadius: '4px',
                      opacity: 0.7,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    width: '40px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--theme-text-primary)',
                    textAlign: 'right',
                  }}>
                    {s.count}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Drill-down panel */}
          {drillStage && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--theme-bg)',
              borderRadius: '8px',
              border: '1px solid var(--theme-border)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '8px' }}>
                {CRM_STAGE_CONFIG[drillStage]?.label} — {drillLeads.length} leads
              </div>
              {drillLeads.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>No leads in this stage.</div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {drillLeads.map((lead, i) => (
                    <div key={lead.id || i} style={{
                      padding: '6px 0',
                      borderBottom: i < drillLeads.length - 1 ? '1px solid var(--theme-border)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: 'var(--theme-text-primary)' }}>
                        {lead.name || lead.firstName || 'Unknown'} {lead.lastName || ''}
                      </span>
                      <span style={{ color: 'var(--theme-text-secondary)' }}>
                        {lead.leadType || lead.lead_type || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
