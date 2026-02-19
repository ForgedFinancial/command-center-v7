import { useState, useEffect, useCallback } from 'react'
import crmClient from '../../../../api/crmClient'

// Short labels for pipeline names
const PIPELINE_SHORT = {
  'Lead Management': 'LM',
  'Approval Process': 'AP',
  'Policy Lifecycle': 'PL',
  'Retention Exceptions': 'RE',
  'Rewrite | Rejected': 'RW',
  'Active | Inforce': 'Active',
  'Nurture | Long Term': 'Nurture',
}

function getShortName(name) {
  return PIPELINE_SHORT[name] || name
}

import { PIPELINE_ICONS } from '../../../../config/pipelineConfig'

export default function PipelineSwitcher({ pipelines, currentPipelineId, onSelect, leadCounts }) {
  if (!pipelines || pipelines.length === 0) return null

  const current = pipelines.find(p => p.id === currentPipelineId)
  const currentIcon = current?.icon || PIPELINE_ICONS[current?.name] || '📁'
  const currentCount = leadCounts?.[currentPipelineId] ?? current?.lead_count ?? 0

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={currentPipelineId || ''}
        onChange={e => onSelect(e.target.value)}
        style={{
          padding: '8px 32px 8px 12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          border: '1px solid var(--theme-accent)',
          background: 'var(--theme-accent-muted)',
          color: 'var(--theme-accent)',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {pipelines.map(p => {
          const icon = p.icon || PIPELINE_ICONS[p.name] || '📁'
          const count = leadCounts?.[p.id] ?? p.lead_count ?? 0
          return (
            <option key={p.id} value={p.id}>
              {icon} {p.name}{count > 0 ? ` (${count})` : ''}
            </option>
          )
        })}
      </select>
    </div>
  )
}

// Hook to manage pipeline data
export function usePipelines() {
  const [pipelines, setPipelines] = useState([])
  const [currentPipelineId, setCurrentPipelineId] = useState(() => {
    try { return localStorage.getItem('cc7-current-pipeline') || null } catch { return null }
  })
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [leadCounts, setLeadCounts] = useState({})

  // Fetch all pipelines
  const fetchPipelines = useCallback(async () => {
    try {
      const res = await crmClient.getPipelines()
      const list = res.pipelines || res.data || res || []
      setPipelines(list)
      // Build lead counts
      const counts = {}
      list.forEach(p => { counts[p.id] = p.lead_count || 0 })
      setLeadCounts(counts)
      // Set default pipeline if none selected
      if (!currentPipelineId && list.length > 0) {
        const defaultId = list[0].id
        setCurrentPipelineId(defaultId)
        localStorage.setItem('cc7-current-pipeline', defaultId)
      }
      return list
    } catch (err) {
      console.error('Failed to fetch pipelines:', err)
      return []
    }
  }, [currentPipelineId])

  // Fetch stages for current pipeline
  const fetchStages = useCallback(async (pipelineId) => {
    if (!pipelineId) return []
    try {
      const res = await crmClient.getStages(pipelineId)
      const stageList = res.stages || res.data || res || []
      setStages(stageList)
      return stageList
    } catch (err) {
      console.error('Failed to fetch stages:', err)
      return []
    }
  }, [])

  const selectPipeline = useCallback((id) => {
    setCurrentPipelineId(id)
    localStorage.setItem('cc7-current-pipeline', id)
  }, [])

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const list = await fetchPipelines()
      if (cancelled) return
      const pid = currentPipelineId || (list.length > 0 ? list[0].id : null)
      if (pid) {
        await fetchStages(pid)
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Fetch stages when pipeline changes
  useEffect(() => {
    if (currentPipelineId) {
      fetchStages(currentPipelineId)
    }
  }, [currentPipelineId, fetchStages])

  return {
    pipelines, stages, currentPipelineId, loading, leadCounts,
    selectPipeline, fetchPipelines, fetchStages, setLeadCounts,
  }
}
