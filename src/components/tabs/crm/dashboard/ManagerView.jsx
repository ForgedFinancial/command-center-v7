import { useState, useMemo } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { useApp } from '../../../../context/AppContext'
import { CRM_STAGE_ORDER, CRM_STAGE_CONFIG } from '../../../../config/crm'

const SORT_KEYS = ['name', 'totalLeads', 'sold', 'qualified', 'contacted', 'conversionRate']

export default function ManagerView() {
  const { state: appState } = useApp()
  const { state } = useCRM()
  const [sortKey, setSortKey] = useState('totalLeads')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)

  // Role gate
  const userRole = appState.userRole || appState.role || 'agent'
  const isManager = userRole === 'manager' || userRole === 'admin' || userRole === 'owner'

  const { agents, totals } = useMemo(() => {
    const agentMap = {}

    state.leads?.forEach(lead => {
      const agentId = lead.agentId || lead.agent_id || 'unassigned'
      const agentName = lead.agentName || lead.agent_name || agentId
      if (!agentMap[agentId]) {
        agentMap[agentId] = { id: agentId, name: agentName, totalLeads: 0, stageCounts: {} }
        CRM_STAGE_ORDER.forEach(s => { agentMap[agentId].stageCounts[s] = 0 })
      }
      agentMap[agentId].totalLeads++
      const stage = lead.stage || lead.stageId || lead.stage_id || 'new_lead'
      const key = CRM_STAGE_ORDER.includes(stage) ? stage : 'new_lead'
      agentMap[agentId].stageCounts[key]++
    })

    const list = Object.values(agentMap).map(a => ({
      ...a,
      sold: a.stageCounts.sold || 0,
      qualified: a.stageCounts.qualified || 0,
      contacted: a.stageCounts.contact || 0,
      conversionRate: a.totalLeads > 0 ? Math.round((a.stageCounts.sold / a.totalLeads) * 100) : 0,
    }))

    const tots = {
      totalLeads: list.reduce((s, a) => s + a.totalLeads, 0),
      sold: list.reduce((s, a) => s + a.sold, 0),
      qualified: list.reduce((s, a) => s + a.qualified, 0),
      contacted: list.reduce((s, a) => s + a.contacted, 0),
    }
    tots.conversionRate = tots.totalLeads > 0 ? Math.round((tots.sold / tots.totalLeads) * 100) : 0

    return { agents: list, totals: tots }
  }, [state.leads])

  // Sort
  const sorted = useMemo(() => {
    return [...agents].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })
  }, [agents, sortKey, sortAsc])

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  if (!isManager) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: 'var(--theme-text-secondary)',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '16px', fontWeight: 500 }}>Manager access required</div>
        <div style={{ fontSize: '13px', marginTop: '8px' }}>This view is only available to managers and admins.</div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--theme-text-primary)', margin: '0 0 20px' }}>
        👔 Manager View
      </h2>

      {/* Team aggregates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Leads', value: totals.totalLeads },
          { label: 'Contacted', value: totals.contacted },
          { label: 'Qualified', value: totals.qualified },
          { label: 'Sold', value: totals.sold, color: '#4ade80' },
          { label: 'Conversion', value: `${totals.conversionRate}%`, color: '#3b82f6' },
        ].map(c => (
          <div key={c.label} style={{
            background: 'var(--theme-surface)',
            borderRadius: '8px',
            border: '1px solid var(--theme-border)',
            padding: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '4px' }}>{c.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: c.color || 'var(--theme-text-primary)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Agent comparison table */}
      <div style={{
        background: 'var(--theme-surface)',
        borderRadius: '12px',
        border: '1px solid var(--theme-border)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border)' }}>
              {[
                { key: 'name', label: 'Agent' },
                { key: 'totalLeads', label: 'Leads' },
                { key: 'contacted', label: 'Contacted' },
                { key: 'qualified', label: 'Qualified' },
                { key: 'sold', label: 'Sold' },
                { key: 'conversionRate', label: 'Conv %' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '10px 12px',
                    textAlign: col.key === 'name' ? 'left' : 'right',
                    color: 'var(--theme-text-secondary)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(agent => (
              <tr
                key={agent.id}
                onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                style={{
                  borderBottom: '1px solid var(--theme-border)',
                  cursor: 'pointer',
                  background: selectedAgent === agent.id ? 'var(--theme-accent-muted)' : 'transparent',
                }}
              >
                <td style={{ padding: '10px 12px', color: 'var(--theme-text-primary)', fontWeight: 500 }}>{agent.name}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--theme-text-primary)' }}>{agent.totalLeads}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--theme-text-secondary)' }}>{agent.contacted}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b' }}>{agent.qualified}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4ade80' }}>{agent.sold}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 500 }}>{agent.conversionRate}%</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--theme-text-secondary)' }}>
                  No agent data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Agent drill-down */}
      {selectedAgent && (() => {
        const agent = agents.find(a => a.id === selectedAgent)
        if (!agent) return null
        return (
          <div style={{
            marginTop: '16px',
            background: 'var(--theme-surface)',
            borderRadius: '12px',
            border: '1px solid var(--theme-border)',
            padding: '16px',
          }}>
            <h4 style={{ margin: '0 0 12px', color: 'var(--theme-text-primary)', fontSize: '14px' }}>
              {agent.name} — Stage Breakdown
            </h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CRM_STAGE_ORDER.map(s => (
                <div key={s} style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: CRM_STAGE_CONFIG[s].bg,
                  color: CRM_STAGE_CONFIG[s].color,
                  fontSize: '12px',
                  fontWeight: 500,
                }}>
                  {CRM_STAGE_CONFIG[s].label}: {agent.stageCounts[s]}
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
