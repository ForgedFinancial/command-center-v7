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

  return (
    <div style={{
      display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px',
      scrollbarWidth: 'thin',
    }}>
      {pipelines.map(p => {
        const isActive = p.id === currentPipelineId
        const count = leadCounts?.[p.id] ?? p.lead_count ?? 0
        const icon = p.icon || PIPELINE_ICONS[p.name] || '📁'
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            title={p.name}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px', borderRadius: '8px', whiteSpace: 'nowrap',
              fontSize: '12px', fontWeight: isActive ? 600 : 400,
              border: `1px solid ${isActive ? (p.color || 'var(--theme-accent)') : 'var(--theme-border)'}`,
              background: isActive ? `${p.color || 'var(--theme-accent)'}18` : 'var(--theme-surface)',
              color: isActive ? (p.color || 'var(--theme-accent)') : 'var(--theme-text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '13px' }}>{icon}</span>
            <span>{getShortName(p.name)}</span>
            {count > 0 && (
              <span style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                background: isActive ? `${p.color || 'var(--theme-accent)'}30` : 'rgba(255,255,255,0.06)',
                color: isActive ? (p.color || 'var(--theme-accent)') : 'var(--theme-text-secondary)',
                fontWeight: 600, minWidth: '18px', textAlign: 'center',
              }}>{count}</span>
            )}
          </button>
        )
      })}
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
